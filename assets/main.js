// =============================
// Enhanced Path resolver for GitHub Pages
// =============================
function getBasePath() {
  const path = location.pathname;
  // ตรวจสอบว่าอยู่ใน GitHub Pages หรือไม่
  const repoMatch = path.match(/\/([^\/]+)\//);
  if (repoMatch && !path.includes('localhost') && !path.includes('127.0.0.1')) {
    // GitHub Pages format: /repo-name/
    return `/${repoMatch[1]}/`;
  }
  // Local development
  return '/';
}

// =============================
// Enhanced Partials loader with better error handling
// =============================
async function loadPartial(selector, file) {
  try {
    const basePath = getBasePath();
    const fullPath = basePath + file.replace('./', '');
    
    console.log(`Loading partial: ${fullPath}`); // Debug log
    
    const response = await fetch(fullPath, { 
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to load ${fullPath}: ${response.status}`);
      return;
    }
    
    const html = await response.text();
    const element = document.querySelector(selector);
    if (element) {
      element.innerHTML = html;
      
      // ปรับ href ใน partials ให้ใช้ base path ที่ถูกต้อง
      fixPartialLinks(element);
      
      // Highlight active nav after DOM update
      setTimeout(highlightActiveNav, 50);
    }
  } catch (error) {
    console.error(`Error loading partial ${file}:`, error);
  }
}

// =============================
// Fix links in loaded partials
// =============================
function fixPartialLinks(container) {
  const basePath = getBasePath();
  const links = container.querySelectorAll('a[href^="../"], a[href^="./"]');
  
  links.forEach(link => {
    let href = link.getAttribute('href');
    if (href.startsWith('../')) {
      href = href.substring(3); // ลบ ../
    } else if (href.startsWith('./')) {
      href = href.substring(2); // ลบ ./
    }
    
    // เพิ่ม base path
    const newHref = basePath + href;
    link.setAttribute('href', newHref);
    console.log(`Fixed link: ${href} → ${newHref}`); // Debug log
  });
}

function highlightActiveNav() {
  const currentPath = location.pathname;
  const basePath = getBasePath();
  
  // ดึง filename จาก current path
  const currentFile = currentPath.split('/').pop() || 'index.html';
  
  document.querySelectorAll('a[data-nav]').forEach(link => {
    const href = link.getAttribute('href');
    const hrefFile = href.split('/').pop();
    
    // เปรียบเทียบ filename
    if ((currentFile === 'index.html' && hrefFile === 'index.html') || 
        currentFile === hrefFile) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// =============================
// Enhanced initialization
// =============================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Current path:', location.pathname);
  console.log('Base path:', getBasePath());
  
  // Initialize theme and other features first
  initTheme();
  initBackToTop();
  initModal();
  
  // Load partials with proper base path
  const basePath = getBasePath();
  await Promise.all([
    loadPartial('#site-header', 'partials/header.html'),
    loadPartial('#site-footer', 'partials/footer.html')
  ]);
  
  // Wait longer for DOM to fully update
  setTimeout(() => {
    highlightActiveNav();
    
    // Re-initialize any event listeners that might be needed
    initPartialEventListeners();
  }, 200);
  
  // Initialize other features...
  // ... rest of your initialization code ...
});

// =============================
// Re-initialize event listeners for dynamically loaded content
// =============================
function initPartialEventListeners() {
  // Theme toggle - use event delegation
  document.addEventListener('click', e => {
    const btn = e.target.closest('#theme-toggle');
    if (!btn) return;
    
    const now = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    localStorage.setItem('theme', now);
    applyTheme(now);
  });
  
  // Back to top - use event delegation  
  document.addEventListener('click', e => {
    if (e.target.id === 'back-to-top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}