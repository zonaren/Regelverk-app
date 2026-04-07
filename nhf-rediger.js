// ── Body field converters ────────────────────────────────────────────────────
function parseBodyToFields(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const punkt = [];
  const ol = tmp.querySelector('ol');
  if (ol) {
    ol.querySelectorAll('li').forEach(li => {
      li.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      punkt.push(li.textContent.trim());
    });
    ol.remove();
  }
  let merknad = '';
  const borNote = tmp.querySelector('.bor-note');
  if (borNote) {
    const inner = borNote.querySelector('div') || borNote;
    merknad = inner.textContent.replace(/^Merknad:\s*/i, '').trim();
    borNote.remove();
  }
  const pTags = tmp.querySelectorAll('p');
  let tekst = '';
  if (pTags.length) {
    const parts = [];
    pTags.forEach(p => {
      p.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      const t = p.textContent.trim();
      if (t) parts.push(t);
    });
    tekst = parts.join('\n\n');
  } else {
    tmp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tekst = tmp.textContent.trim();
  }
  return { tekst, punkt, merknad };
}

function fieldsToBody({ tekst, punkt, merknad }) {
  let html = '';
  if (tekst) html += tekst.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  if (punkt && punkt.length) html += '<ol>' + punkt.map(p => `<li>${p.replace(/\n/g, '<br>')}</li>`).join('') + '</ol>';
  if (merknad) html += `<div class="bor-note"><span>ℹ</span><div><strong>Merknad:</strong> ${merknad}</div></div>`;
  return html || '';
}

// ── Storage helpers ─────────────────────────────────────────────────────────
function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) { try { return JSON.parse(stored); } catch(e) {} }
  return null;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── State ───────────────────────────────────────────────────────────────────
let rules = loadData() || [];
let unsaved = false;

function markUnsaved() {
  unsaved = true;
  document.title = '● NHF Regelverkredigering';
}

function markSaved() {
  unsaved = false;
  document.title = 'NHF Regelverkredigering';
}

// ── Toast ───────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── ID generator ────────────────────────────────────────────────────────────
function genId() {
  return 'id' + Math.random().toString(36).slice(2, 9);
}

// ── Render sidebar ──────────────────────────────────────────────────────────
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';
  rules.forEach(ch => {
    const group = document.createElement('div');
    group.className = 'chapter-group';
    const numStr = ch.chapter.replace(/[^0-9]/g, '') || '?';
    const btn = document.createElement('button');
    btn.className = 'chapter-btn';
    btn.innerHTML = `<span class="chapter-num">${numStr}</span><span>${ch.title}</span>`;
    btn.addEventListener('click', () => {
      document.getElementById('ch-' + ch.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeSidebarIfMobile();
    });
    group.appendChild(btn);
    sidebar.appendChild(group);
  });
}

// ── Render all chapters ──────────────────────────────────────────────────────
function renderAll() {
  renderSidebar();
  renderChapters();
}

function renderChapters() {
  const container = document.getElementById('chapters-container');
  container.innerHTML = '';
  rules.forEach((ch, ci) => {
    container.appendChild(buildChapterCard(ch, ci));
  });
}

// ── Build chapter card ───────────────────────────────────────────────────────
function buildChapterCard(ch, ci) {
  const card = document.createElement('div');
  card.className = 'ch-card';
  card.id = 'ch-' + ch.id;

  // Chapter header
  const hdr = document.createElement('div');
  hdr.className = 'ch-header';

  const label = document.createElement('span');
  label.className = 'ch-label';
  label.textContent = 'Kapittel';

  const numInput = document.createElement('input');
  numInput.className = 'ch-num-input';
  numInput.value = ch.chapter.replace(/[^0-9]/g, '');
  numInput.title = 'Kapittelnummer';
  numInput.addEventListener('input', () => {
    ch.chapter = 'Kapittel ' + numInput.value;
    autoSave();
    renderSidebar();
  });

  const titleInput = document.createElement('input');
  titleInput.className = 'ch-title-input';
  titleInput.value = ch.title;
  titleInput.title = 'Kapitteltittel';
  titleInput.addEventListener('input', () => {
    ch.title = titleInput.value;
    autoSave();
    renderSidebar();
  });

  const actions = document.createElement('div');
  actions.className = 'ch-actions';

  const upBtn = iconBtn('↑', 'Flytt kapittel opp', false);
  upBtn.addEventListener('click', () => {
    if (ci === 0) return;
    [rules[ci - 1], rules[ci]] = [rules[ci], rules[ci - 1]];
    autoSave();
    renderAll();
  });

  const downBtn = iconBtn('↓', 'Flytt kapittel ned', false);
  downBtn.addEventListener('click', () => {
    if (ci === rules.length - 1) return;
    [rules[ci], rules[ci + 1]] = [rules[ci + 1], rules[ci]];
    autoSave();
    renderAll();
  });

  const delBtn = iconBtn('✕', 'Slett kapittel', true);
  delBtn.addEventListener('click', () => {
    if (ch.rules.length > 0 && !confirm(`Slett «${ch.title}» og alle ${ch.rules.length} reglane i det?`)) return;
    rules.splice(ci, 1);
    autoSave();
    renderAll();
  });

  actions.append(upBtn, downBtn, delBtn);
  hdr.append(label, numInput, titleInput, actions);
  card.appendChild(hdr);

  // Rules list
  const rulesList = document.createElement('div');
  rulesList.className = 'rules-list';
  ch.rules.forEach((r, ri) => {
    rulesList.appendChild(buildRuleCard(r, ri, ch, ci));
  });
  card.appendChild(rulesList);

  // Footer with add rule button
  const footer = document.createElement('div');
  footer.className = 'ch-footer';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-rule';
  addBtn.textContent = '+ Legg til regel';
  addBtn.addEventListener('click', () => {
    const newRule = { id: genId(), num: '', title: 'Ny regel', bor: false, body: '<p></p>' };
    ch.rules.push(newRule);
    autoSave();
    // Re-render just the rules list
    rulesList.appendChild(buildRuleCard(newRule, ch.rules.length - 1, ch, ci));
    // Scroll and open body editor
    const newCard = rulesList.lastElementChild;
    newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    newCard.querySelector('.btn-edit-toggle')?.click();
  });
  footer.appendChild(addBtn);
  card.appendChild(footer);

  return card;
}

// ── Build rule card ──────────────────────────────────────────────────────────
function buildRuleCard(r, ri, ch, ci) {
  const card = document.createElement('div');
  card.className = 'rule-edit-card';
  card.id = 'rule-' + r.id;

  // Header row
  const hdr = document.createElement('div');
  hdr.className = 'rule-edit-header';

  const numInput = document.createElement('input');
  numInput.className = 'rule-num-input';
  numInput.value = r.num;
  numInput.title = 'Regelnummer';
  numInput.addEventListener('input', () => { r.num = numInput.value; autoSave(); });

  const titleInput = document.createElement('input');
  titleInput.className = 'rule-title-input';
  titleInput.value = r.title;
  titleInput.title = 'Regeltittel';
  titleInput.addEventListener('input', () => { r.title = titleInput.value; autoSave(); });

  const borLabel = document.createElement('label');
  borLabel.className = 'bor-toggle';
  const borCheck = document.createElement('input');
  borCheck.type = 'checkbox';
  borCheck.checked = r.bor;
  borCheck.addEventListener('change', () => { r.bor = borCheck.checked; autoSave(); });
  borLabel.append(borCheck, document.createTextNode(' ⚠ Bør'));
  borLabel.title = 'Merk som «bør»-regel';

  const actions = document.createElement('div');
  actions.className = 'rule-actions';

  // Up/down within chapter
  const upBtn = iconBtn('↑', 'Flytt opp', false);
  upBtn.addEventListener('click', () => {
    if (ri === 0) return;
    [ch.rules[ri - 1], ch.rules[ri]] = [ch.rules[ri], ch.rules[ri - 1]];
    autoSave();
    renderChapters();
  });
  const downBtn = iconBtn('↓', 'Flytt ned', false);
  downBtn.addEventListener('click', () => {
    if (ri === ch.rules.length - 1) return;
    [ch.rules[ri], ch.rules[ri + 1]] = [ch.rules[ri + 1], ch.rules[ri]];
    autoSave();
    renderChapters();
  });

  // Move to chapter dropdown
  const moveSelect = document.createElement('select');
  moveSelect.className = 'rule-move-select';
  moveSelect.title = 'Flytt til anna kapittel';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Flytt til…';
  moveSelect.appendChild(defaultOpt);
  rules.forEach((c, idx) => {
    if (c.id === ch.id) return;
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.chapter + ': ' + c.title.substring(0, 25) + (c.title.length > 25 ? '…' : '');
    moveSelect.appendChild(opt);
  });
  moveSelect.addEventListener('change', () => {
    const targetId = moveSelect.value;
    if (!targetId) return;
    const targetCh = rules.find(c => c.id === targetId);
    if (!targetCh) return;
    ch.rules.splice(ri, 1);
    targetCh.rules.push(r);
    autoSave();
    renderAll();
    showToast('Regel flytta til ' + targetCh.chapter);
  });

  // Toggle body editor
  const editBtn = iconBtn('✏', 'Rediger innhald', false);
  editBtn.classList.add('btn-edit-toggle');

  const delBtn = iconBtn('✕', 'Slett regel', true);
  delBtn.addEventListener('click', () => {
    if (!confirm(`Slett regel ${r.num}: «${r.title}»?`)) return;
    ch.rules.splice(ri, 1);
    autoSave();
    card.remove();
  });

  actions.append(upBtn, downBtn, moveSelect, editBtn, delBtn);
  hdr.append(numInput, titleInput, borLabel, actions);
  card.appendChild(hdr);

  // Body editor (hidden by default)
  const bodySection = document.createElement('div');
  bodySection.className = 'rule-edit-body';
  bodySection.style.display = 'none';

  // ── Tabs ──
  const tabs = document.createElement('div');
  tabs.className = 'body-tabs';
  const tabEdit = document.createElement('button');
  tabEdit.className = 'tab-btn active';
  tabEdit.textContent = 'Rediger';
  const tabPreview = document.createElement('button');
  tabPreview.className = 'tab-btn';
  tabPreview.textContent = 'Førehandsvisning';
  tabs.append(tabEdit, tabPreview);

  // Parse existing body HTML into structured fields, or use new-format fields directly
  const fields = r.body
    ? parseBodyToFields(r.body)
    : { tekst: r.tekst || '', punkt: Array.isArray(r.punkt) ? [...r.punkt] : [], merknad: r.merknad || '' };
  function syncBody() { r.body = fieldsToBody(fields); autoSave(); }

  // ── Edit panel ──
  const editPanel = document.createElement('div');
  editPanel.className = 'structured-edit-panel';

  // Hovudtekst
  const tekstLabel = document.createElement('label');
  tekstLabel.className = 'field-label';
  tekstLabel.textContent = 'Hovudtekst';
  const tekstTa = document.createElement('textarea');
  tekstTa.className = 'body-textarea';
  tekstTa.placeholder = 'Skriv inn hovudtekst (dobbel linjeskift = nytt avsnitt)…';
  tekstTa.value = fields.tekst;
  tekstTa.addEventListener('input', () => { fields.tekst = tekstTa.value; syncBody(); });

  // Punkt
  const punktLabel = document.createElement('label');
  punktLabel.className = 'field-label';
  punktLabel.textContent = 'Punkt (nummerert liste)';
  const punktList = document.createElement('div');
  punktList.className = 'punkt-list';

  function buildPunktRow(idx) {
    const row = document.createElement('div');
    row.className = 'punkt-row';
    const num = document.createElement('span');
    num.className = 'punkt-num';
    num.textContent = (idx + 1) + '.';
    const ta = document.createElement('textarea');
    ta.className = 'punkt-ta';
    ta.value = fields.punkt[idx];
    ta.placeholder = 'Punkt ' + (idx + 1) + '…';
    ta.rows = 1;
    function resize() { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
    ta.addEventListener('input', () => { fields.punkt[idx] = ta.value; syncBody(); resize(); });
    setTimeout(resize, 0);
    const rowActions = document.createElement('div');
    rowActions.className = 'punkt-row-actions';
    const upBtn = iconBtn('↑', 'Flytt opp', false);
    upBtn.addEventListener('click', () => {
      if (idx === 0) return;
      [fields.punkt[idx - 1], fields.punkt[idx]] = [fields.punkt[idx], fields.punkt[idx - 1]];
      syncBody(); renderPunktList();
    });
    const downBtn = iconBtn('↓', 'Flytt ned', false);
    downBtn.addEventListener('click', () => {
      if (idx === fields.punkt.length - 1) return;
      [fields.punkt[idx], fields.punkt[idx + 1]] = [fields.punkt[idx + 1], fields.punkt[idx]];
      syncBody(); renderPunktList();
    });
    const delBtn = iconBtn('✕', 'Fjern punkt', true);
    delBtn.addEventListener('click', () => { fields.punkt.splice(idx, 1); syncBody(); renderPunktList(); });
    rowActions.append(upBtn, downBtn, delBtn);
    row.append(num, ta, rowActions);
    return row;
  }

  function renderPunktList() {
    punktList.innerHTML = '';
    fields.punkt.forEach((_, idx) => punktList.appendChild(buildPunktRow(idx)));
  }
  renderPunktList();

  const addPunktBtn = document.createElement('button');
  addPunktBtn.className = 'btn-add-punkt';
  addPunktBtn.textContent = '+ Legg til punkt';
  addPunktBtn.addEventListener('click', () => {
    fields.punkt.push('');
    syncBody(); renderPunktList();
    punktList.lastElementChild?.querySelector('textarea')?.focus();
  });

  // Merknad
  const merknadLabel = document.createElement('label');
  merknadLabel.className = 'field-label';
  merknadLabel.textContent = 'Merknad (valfri)';
  const merknadInput = document.createElement('input');
  merknadInput.type = 'text';
  merknadInput.className = 'merknad-input';
  merknadInput.placeholder = 'Valfri merknad til regelen…';
  merknadInput.value = fields.merknad;
  merknadInput.addEventListener('input', () => { fields.merknad = merknadInput.value; syncBody(); });

  editPanel.append(tekstLabel, tekstTa, punktLabel, punktList, addPunktBtn, merknadLabel, merknadInput);

  // ── Preview panel ──
  const preview = document.createElement('div');
  preview.className = 'body-preview';
  preview.style.display = 'none';

  tabEdit.addEventListener('click', () => {
    tabEdit.classList.add('active'); tabPreview.classList.remove('active');
    editPanel.style.display = ''; preview.style.display = 'none';
  });
  tabPreview.addEventListener('click', () => {
    tabPreview.classList.add('active'); tabEdit.classList.remove('active');
    editPanel.style.display = 'none';
    preview.innerHTML = fieldsToBody(fields);
    preview.style.display = '';
  });

  bodySection.append(tabs, editPanel, preview);
  card.appendChild(bodySection);

  // Toggle body section
  editBtn.addEventListener('click', () => {
    const isOpen = bodySection.style.display !== 'none';
    bodySection.style.display = isOpen ? 'none' : '';
    editBtn.style.background = isOpen ? '' : 'var(--accent-light)';
    editBtn.style.borderColor = isOpen ? '' : 'var(--accent2)';
    editBtn.style.color = isOpen ? '' : 'var(--accent)';
    if (!isOpen) {
      // Re-render punkt list now that section is visible (auto-resize works correctly)
      renderPunktList();
      tekstTa.focus();
    }
  });

  return card;
}

// ── Icon button helper ───────────────────────────────────────────────────────
function iconBtn(text, title, danger) {
  const btn = document.createElement('button');
  btn.className = 'btn-icon' + (danger ? ' danger' : '');
  btn.textContent = text;
  btn.title = title;
  return btn;
}

// ── Auto-save ────────────────────────────────────────────────────────────────
let autoSaveTimer;
function autoSave() {
  markUnsaved();
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveData(rules);
    markSaved();
  }, 600);
}

// ── File open ────────────────────────────────────────────────────────────────
document.getElementById('btn-open').addEventListener('click', async () => {
  if (unsaved && !confirm('Du har ulagra endringar. Vil du opne ein ny fil og miste dei?')) return;

  if (window.showOpenFilePicker) {
    try {
      const [fh] = await window.showOpenFilePicker({ types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
      const file = await fh.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      rules = parsed;
      saveData(rules);
      markSaved();
      renderAll();
      showToast('Fil opna: ' + file.name);
    } catch (e) { if (e.name !== 'AbortError') alert('Kunne ikkje opne fil: ' + e.message); }
  } else {
    // Fallback: file input
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        rules = JSON.parse(text);
        saveData(rules);
        markSaved();
        renderAll();
        showToast('Fil opna: ' + file.name);
      } catch (e) { alert('Ugyldig JSON-fil.'); }
    });
    input.click();
  }
});

// ── File save ────────────────────────────────────────────────────────────────
document.getElementById('btn-save').addEventListener('click', async () => {
  const json = JSON.stringify(rules, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  if (window.showSaveFilePicker) {
    try {
      const fh = await window.showSaveFilePicker({ suggestedName: 'reglar.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
      const writable = await fh.createWritable();
      await writable.write(blob);
      await writable.close();
      saveData(rules);
      markSaved();
      showToast('Lagra!');
    } catch (e) { if (e.name !== 'AbortError') alert('Kunne ikkje lagre: ' + e.message); }
  } else {
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'reglar.json';
    a.click();
    URL.revokeObjectURL(url);
    saveData(rules);
    markSaved();
    showToast('Fil lasta ned');
  }
});

// ── Add chapter ──────────────────────────────────────────────────────────────
document.getElementById('btn-add-chapter').addEventListener('click', () => {
  const newCh = { id: genId(), chapter: 'Kapittel ?', title: 'Nytt kapittel', rules: [] };
  rules.push(newCh);
  autoSave();
  renderAll();
  const newCard = document.getElementById('ch-' + newCh.id);
  newCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  newCard?.querySelector('.ch-num-input')?.focus();
});

// ── Hamburger / mobile sidebar ───────────────────────────────────────────────
document.getElementById('menu-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Load from JSON file if no localStorage data ──────────────────────────────
async function initData() {
  if (rules.length > 0) {
    renderAll();
    return;
  }
  // Try to load reglar.json from same folder
  try {
    const resp = await fetch('./reglar.json');
    if (resp.ok) {
      rules = await resp.json();
      saveData(rules);
      renderAll();
      showToast('Lasta reglar frå reglar.json');
      return;
    }
  } catch (e) {}
  // No data at all
  renderAll();
  showToast('Ingen data – opne ein JSON-fil for å starte');
}

initData();
