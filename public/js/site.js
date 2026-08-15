// Small progressive-enhancement extras for the marketing site.
// Routing/pages/templating are all handled by MinTML itself (see index.html) —
// this file only handles things outside MinTML's job: mobile nav + copy buttons.
import MinTML from '/mintml.js';
const app = new MinTML({roles:['guest', 'hero0', 'hero1', 'hero2', 'hero3']});
window.app = app;

document.getElementById('year').textContent = new Date().getFullYear();

// --- random hero ---
document.querySelectorAll('[data-random]').forEach(el=>{
 (a=>a[Math.floor(Math.random() * a.length)])(Array.from(el.querySelectorAll(':scope > *'))).classList.add('active')
})


// --- mobile nav toggle ---
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  mainNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// --- active nav link highlight ---
function syncActiveNav() {
  const hash = location.hash || '#home';
  document.querySelectorAll('.main-nav a[href^="#"]').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });
}
window.addEventListener('hashchange', syncActiveNav);
syncActiveNav();

// --- copy-to-clipboard on code blocks ---
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const targetId = btn.getAttribute('data-copy-target');
    const target = document.getElementById(targetId);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  });
});

app.filter(()=>{
  analyticsHandler();
});


function analyticsHandler(){
  gtag('event', 'page_view', {
      page_title: document.title,
      page_location: location.href,
      page_path: location.hash || '/'
    });
}
