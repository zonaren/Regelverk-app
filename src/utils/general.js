const STORAGE_KEY = 'nhf-reglar';

function closeSidebarIfMobile() {
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function fieldsToBody({ tekst, punkt, merknad }) {
  let html = '';
  if (tekst) html += tekst.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  if (punkt && punkt.length) html += '<ol>' + punkt.map(p => `<li>${p.replace(/\n/g, '<br>')}</li>`).join('') + '</ol>';
  if (merknad) html += `<div class="bor-note"><span>ℹ</span><div><strong>Merknad:</strong> ${merknad}</div></div>`;
  return html;
}
