;(function(){
  // =============================
  // Partials loader + active nav
  // =============================
  const qs  = (sel, el=document)=> el.querySelector(sel);
  const qsa = (sel, el=document)=> Array.from(el.querySelectorAll(sel));

  function getBasePath(){
    const path = location.pathname;
    const isInTools = path.includes('/tools/');
    return isInTools ? '../' : './';
  }

  async function loadPartial(selector, file){
    try{
      const basePath = getBasePath();
      const fullPath = file.startsWith('./') ? basePath + file.substring(2) : file;
      const res = await fetch(fullPath, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if(!res.ok){
        console.warn(`Failed to load ${fullPath}: ${res.status}`);
        return;
      }
      const html = await res.text();
      const el = qs(selector);
      if(el){
        el.innerHTML = html;
        highlightActiveNav();
      }
    } catch(err){
      console.warn('Error loading partial', file, err);
    }
  }

  function highlightActiveNav(){
    const current = location.pathname.split('/').pop() || 'index.html';
    qsa('a[data-nav]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const hrefFile = href.split('/').pop();
      if((current === 'index.html' && hrefFile === 'index.html') || current === hrefFile){
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });
  }

  // Auto-load header/footer on DOM ready
  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
      loadPartial('#site-header', './partials/header.html'),
      loadPartial('#site-footer', './partials/footer.html')
    ]);
    setTimeout(highlightActiveNav, 100);
  });

  // expose
  window.loadPartial = window.loadPartial || loadPartial;
  window.highlightActiveNav = window.highlightActiveNav || highlightActiveNav;
})();
