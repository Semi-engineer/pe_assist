;(function(){
  // =============================
  // UI utilities: qs/qsa, Theme, BackToTop, Modal, Toast, Filter
  // =============================
  const qs  = (sel, el=document)=> el.querySelector(sel);
  const qsa = (sel, el=document)=> Array.from(el.querySelectorAll(sel));

  // Theme
  function applyTheme(t){ document.documentElement.classList.toggle('light', t === 'light'); }
  function initTheme(){
    const saved = localStorage.getItem('theme');
    const prefersLight = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches;
    const theme = saved || (prefersLight ? 'light' : 'dark');
    applyTheme(theme);
    document.addEventListener('click', e => {
      const btn = e.target.closest('#theme-toggle');
      if(!btn) return;
      const now = document.documentElement.classList.contains('light') ? 'dark' : 'light';
      localStorage.setItem('theme', now);
      applyTheme(now);
    });
  }

  // Back to top
  function initBackToTop(){
    document.addEventListener('click', e => {
      if(e.target && e.target.id === 'back-to-top'){
        scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    addEventListener('scroll', () => {
      const btt = qs('#back-to-top');
      if(!btt) return;
      if(scrollY > 420) btt.classList.remove('hidden');
      else btt.classList.add('hidden');
    });
  }

  // Modal
  function showModal(html){
    const backdrop = qs('.modal-backdrop');
    const modal = qs('.modal');
    if(backdrop && modal){
      const body = qs('.modal .body') || modal;
      body.innerHTML = html;
      backdrop.style.display = 'block';
      modal.style.display = 'block';
    }
  }
  function hideModal(){
    const backdrop = qs('.modal-backdrop');
    const modal = qs('.modal');
    if(backdrop && modal){
      backdrop.style.display = 'none';
      modal.style.display = 'none';
    }
  }
  function initModal(){
    document.addEventListener('click', e => {
      if(e.target.matches('[data-modal-close]') || e.target.classList.contains('modal-backdrop')){
        hideModal();
      }
    });
  }

  // Toast
  let toastTimer;
  function toast(msg, ms=2500){
    const t = qs('.toast');
    if(!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> t.style.display='none', ms);
  }

  // Filter
  function attachFilter(inputSel, itemSel){
    const input = qs(inputSel);
    if(!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      qsa(itemSel).forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  // Bootstrap UI on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initBackToTop();
    initModal();
    attachFilter('#tool-filter', '#tool-list .item');
  });

  // expose minimal globals if needed elsewhere
  window.toast = window.toast || toast;
  window.qs = window.qs || qs;
  window.qsa = window.qsa || qsa;
})();
