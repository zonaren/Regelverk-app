function buildRuleBody(r) {
  if (r.body) return r.body; // gammalt format, bruk som det er
  let html = '';
  if (r.tekst) {
    html += r.tekst.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }
  if (r.punkt && r.punkt.length) {
    html += '<ol>' + r.punkt.map(p => `<li>${p.replace(/\n/g, '<br>')}</li>`).join('') + '</ol>';
  }
  if (r.merknad) {
    html += `<div class="bor-note"><span>ℹ</span><div><strong>Merknad:</strong> ${r.merknad}</div></div>`;
  }
  return html || '<p>–</p>';
}

function normalizeRules(raw) {
  const chapters = Array.isArray(raw) ? raw : (raw.kapittel || []);
  return chapters.map(ch => {
    const tittelFull = ch.tittel || ch.title || '';
    const chapterLabel = ch.chapter || tittelFull.match(/^Kapittel \d+/)?.[0] || '';
    const title = ch.title || tittelFull.replace(/^Kapittel \d+[:\s.]*/i, '').replace(/\.$/, '').trim();
    const rules = (ch.rules || ch.reglar || []).map(r => ({
      id: r.id,
      num: r.num || r.nummer,
      title: r.title || r.tittel,
      bor: r.bor || !!r.merknad,
      body: buildRuleBody(r)
    }));
    return { id: ch.id, chapter: chapterLabel, title, rules };
  });
}

async function init() {
  let RULES = null;

  // 1. Hent alltid gjeldande data frå json-fila
  try {
    const resp = await fetch('./reglar.json');
    if (resp.ok) {
      const raw = await resp.json();
      RULES = normalizeRules(raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(RULES));
    }
  } catch(e) {}

  // 2. Fallback til localStorage viss henting feila (t.d. offline)
  if (!RULES) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { try { RULES = JSON.parse(stored); } catch(e) {} }
  }

  // 3. Ingen data funne
  if (!RULES || !RULES.length) {
    document.getElementById('content-area').innerHTML =
      '<div style="padding:2rem;color:var(--text2);text-align:center">' +
      '<p style="font-size:1.1rem;margin-bottom:.5rem">Ingen regeldata funne.</p>' +
      '<p>Opne <strong>nhf-rediger.html</strong> for å laste inn <code>gjeldane kilde (json)</code>, og kom tilbake hit.</p></div>';
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
        clearSearch();
        document.getElementById(r.id)?.scrollIntoView({behavior:'smooth', block:'start'});
        document.querySelectorAll('.rule-link').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        closeSidebarIfMobile();
      });
      list.appendChild(a);
    });
    btn.addEventListener('click', () => {
      clearSearch();
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
      `;
      ruleHeader.classList.add('expanded');
      const body = document.createElement('div');
      body.className = 'rule-body open';
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

function highlightNode(node, re) {
  if (node.nodeType === Node.TEXT_NODE) {
    re.lastIndex = 0;
    if (!re.test(node.textContent)) return;
    re.lastIndex = 0;
    const text = node.textContent;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const mark = document.createElement('mark');
      mark.textContent = m[0];
      frag.appendChild(mark);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
    return;
  }
  if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') return;
  Array.from(node.childNodes).forEach(child => highlightNode(child, re));
}

function clearSearch() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const contentArea = document.getElementById('content-area');
  const clearBtn = document.getElementById('search-clear');
  searchInput.value = '';
  searchResults.classList.remove('visible');
  contentArea.style.display = '';
  if (clearBtn) clearBtn.hidden = true;
}

function setupSearch(RULES) {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const contentArea = document.getElementById('content-area');
  const clearBtn = document.getElementById('search-clear');
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function stripHtml(h) { const d = document.createElement('div'); d.innerHTML = h; return d.textContent || ''; }

  clearBtn.addEventListener('click', () => { clearSearch(); searchInput.focus(); });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    clearBtn.hidden = !q;
    if (!q) { searchResults.classList.remove('visible'); contentArea.style.display = ''; return; }
    const re = new RegExp(escapeRegex(q), 'gi');
    const hits = [];
    RULES.forEach(ch => {
      ch.rules.forEach(r => {
        re.lastIndex = 0;
        if (re.test('Regel ' + r.num + ' ' + r.title + ' ' + stripHtml(r.body))) {
          hits.push({ chapter: ch.chapter, title: ch.title, rule: r });
        }
      });
    });
    contentArea.style.display = 'none';
    searchResults.classList.add('visible');

    const frag = document.createDocumentFragment();
    const header = document.createElement('p');
    header.className = 'results-header';
    header.textContent = hits.length
      ? `${hits.length} treff for «${q}»`
      : '';
    frag.appendChild(header);

    if (!hits.length) {
      const none = document.createElement('div');
      none.className = 'no-results';
      none.textContent = `Ingen treff for «${q}»`;
      frag.appendChild(none);
    } else {
      hits.forEach(h => {
        const card = document.createElement('div');
        card.className = 'rule-card';

        const label = document.createElement('div');
        label.className = 'result-rule';
        label.style.cssText = 'padding:.6rem 1.1rem 0';
        label.textContent = `${h.chapter}: ${h.title}`;
        card.appendChild(label);

        const ruleHeader = document.createElement('div');
        ruleHeader.className = 'rule-header expanded';
        ruleHeader.style.cursor = 'default';
        const numEl = document.createElement('span');
        numEl.className = 'rule-num';
        numEl.textContent = h.rule.num;
        const titleEl = document.createElement('span');
        titleEl.className = 'rule-title';
        titleEl.textContent = h.rule.title;
        highlightNode(titleEl, re);
        ruleHeader.appendChild(numEl);
        ruleHeader.appendChild(titleEl);
        card.appendChild(ruleHeader);

        const body = document.createElement('div');
        body.className = 'rule-body open';
        body.innerHTML = h.rule.body;
        highlightNode(body, re);
        card.appendChild(body);

        frag.appendChild(card);
      });
    }

    searchResults.innerHTML = '';
    searchResults.appendChild(frag);
  });
}

function setupMobileAndScroll() {
  const sidebar = document.getElementById('sidebar');
  const contentArea = document.getElementById('content-area');
  document.getElementById('menu-btn').addEventListener('click', () => sidebar.classList.toggle('open'));
  const backTop = document.getElementById('back-top');
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 400);
    const all = contentArea.querySelectorAll('.rule-card');
    let active = null;
    all.forEach(card => { if (card.getBoundingClientRect().top <= 70) active = card.id; });
    if (active) {
      document.querySelectorAll('.rule-link').forEach(l => l.classList.toggle('active', l.dataset.ruleId === active));
    }
  }, {passive:true});
  backTop.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
}

init();
