async function init() {
  let RULES = null;

  // 1. Prøv localStorage (lagra frå editoren)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) { try { RULES = JSON.parse(stored); } catch(e) {} }

  // 2. Prøv å hente reglar.json frå same mappe
  if (!RULES) {
    try {
      const resp = await fetch('./reglar.json');
      if (resp.ok) {
        RULES = await resp.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(RULES));
      }
    } catch(e) {}
  }

  // 3. Ingen data funne
  if (!RULES || !RULES.length) {
    document.getElementById('content-area').innerHTML =
      '<div style="padding:2rem;color:var(--text2);text-align:center">' +
      '<p style="font-size:1.1rem;margin-bottom:.5rem">Ingen regeldata funne.</p>' +
      '<p>Opne <strong>nhf-rediger.html</strong> for å laste inn <code>reglar.json</code>, og kom tilbake hit.</p></div>';
    return;
  }

  buildSidebar(RULES);
  buildContent(RULES);
  setupSearch(RULES);
  setupMobileAndScroll();
  document.querySelector('.chapter-btn')?.click();
}

function buildSidebar(RULES) {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';
  RULES.forEach(ch => {
    const group = document.createElement('div');
    group.className = 'chapter-group';
    const numStr = ch.chapter.replace('Kapittel ', '');
    const btn = document.createElement('button');
    btn.className = 'chapter-btn';
    btn.dataset.chapter = ch.id;
    btn.innerHTML = `<span class="chapter-num">${numStr}</span><span>${ch.title}</span><span class="chevron">▶</span>`;
    const list = document.createElement('div');
    list.className = 'rule-list';
    list.id = 'nav-' + ch.id;
    ch.rules.forEach(r => {
      const a = document.createElement('a');
      a.href = '#' + r.id;
      a.className = 'rule-link';
      a.dataset.ruleId = r.id;
      a.textContent = `Regel ${r.num}: ${r.title}`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(r.id)?.scrollIntoView({behavior:'smooth', block:'start'});
        document.querySelectorAll('.rule-link').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        closeSidebarIfMobile();
      });
      list.appendChild(a);
    });
    btn.addEventListener('click', () => {
      const isOpen = list.classList.contains('open');
      document.querySelectorAll('.rule-list').forEach(l => l.classList.remove('open'));
      document.querySelectorAll('.chapter-btn').forEach(b => b.classList.remove('open','active'));
      if (!isOpen) { list.classList.add('open'); btn.classList.add('open','active'); }
    });
    group.appendChild(btn);
    group.appendChild(list);
    sidebar.appendChild(group);
  });
}

function buildContent(RULES) {
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = '';
  RULES.forEach(ch => {
    const sec = document.createElement('section');
    sec.className = 'chapter-section';
    sec.id = ch.id;
    const hdr = document.createElement('div');
    hdr.className = 'chapter-header';
    hdr.innerHTML = `<span class="chapter-label">${ch.chapter}</span><span class="chapter-title">${ch.title}</span>`;
    sec.appendChild(hdr);
    ch.rules.forEach(r => {
      const card = document.createElement('div');
      card.className = 'rule-card';
      card.id = r.id;
      const ruleHeader = document.createElement('div');
      ruleHeader.className = 'rule-header';
      ruleHeader.innerHTML = `
        <span class="rule-num">${r.num}</span>
        <span class="rule-title">${r.title}</span>
        ${r.bor ? '<span class="rule-tag tag-bor">«bør»</span>' : ''}
        <span class="rule-chevron">▶</span>
      `;
      const body = document.createElement('div');
      body.className = 'rule-body';
      body.innerHTML = r.body;
      ruleHeader.addEventListener('click', () => {
        const isExp = ruleHeader.classList.contains('expanded');
        ruleHeader.classList.toggle('expanded', !isExp);
        body.classList.toggle('open', !isExp);
      });
      card.appendChild(ruleHeader);
      card.appendChild(body);
      sec.appendChild(card);
    });
    contentArea.appendChild(sec);
  });
}

function setupSearch(RULES) {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const contentArea = document.getElementById('content-area');
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function stripHtml(h) { const d = document.createElement('div'); d.innerHTML = h; return d.textContent || ''; }
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (!q) { searchResults.classList.remove('visible'); contentArea.style.display = ''; return; }
    const re = new RegExp(escapeRegex(q), 'gi');
    const hits = [];
    RULES.forEach(ch => {
      ch.rules.forEach(r => {
        const text = 'Regel ' + r.num + ' ' + r.title + ' ' + stripHtml(r.body);
        if (re.test(text)) {
          const excerpt = stripHtml(r.body).replace(/\s+/g,' ').trim().substring(0,160);
          hits.push({ chapter: ch.chapter, title: ch.title, rule: r, excerpt });
        }
      });
    });
    contentArea.style.display = 'none';
    searchResults.classList.add('visible');
    if (!hits.length) { searchResults.innerHTML = '<div class="no-results">Ingen treff for «' + q + '»</div>'; return; }
    const highlighted = (t) => t.replace(re, m => `<mark>${m}</mark>`);
    searchResults.innerHTML = `<p class="results-header">${hits.length} treff for «${q}»</p>` +
      hits.map(h => `
        <div class="result-item" onclick="goToRule('${h.rule.id}')">
          <div class="result-rule">${h.chapter}: ${h.title} — Regel ${h.rule.num}</div>
          <div class="result-title">${highlighted(h.rule.title)}</div>
          <div class="result-excerpt">${highlighted(h.excerpt)}…</div>
        </div>
      `).join('');
  });
}

function goToRule(id) {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const contentArea = document.getElementById('content-area');
  searchInput.value = '';
  searchResults.classList.remove('visible');
  contentArea.style.display = '';
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({behavior:'smooth', block:'start'});
      const header = el.querySelector('.rule-header');
      const body = el.querySelector('.rule-body');
      if (header && !header.classList.contains('expanded')) {
        header.classList.add('expanded');
        body.classList.add('open');
      }
    }
  }, 50);
}
window.goToRule = goToRule;

function setupMobileAndScroll() {
  const sidebar = document.getElementById('sidebar');
  const contentArea = document.getElementById('content-area');
  document.getElementById('menu-btn').addEventListener('click', () => sidebar.classList.toggle('open'));
  const backTop = document.getElementById('back-top');
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 400);
    const all = contentArea.querySelectorAll('.rule-card');
    let active = null;
    all.forEach(card => { if (card.getBoundingClientRect().top <= 120) active = card.id; });
    if (active) {
      document.querySelectorAll('.rule-link').forEach(l => l.classList.toggle('active', l.dataset.ruleId === active));
    }
  }, {passive:true});
  backTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
}

init();
