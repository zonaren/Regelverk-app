const STORAGE_KEY = 'nhf-reglar';

function closeSidebarIfMobile() {
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}
