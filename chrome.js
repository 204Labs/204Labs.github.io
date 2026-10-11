// Theme switch for pages outside the homepage. The homepage script has its own copy.
(() => {
  'use strict';
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  const apply = (theme, persist) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    toggle.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    if (!persist) return;
    try { window.localStorage.setItem('204labs_theme', next); } catch (_) { /* applies for this view only */ }
  };
  toggle.hidden = false;
  apply(document.documentElement.dataset.theme, false);
  toggle.addEventListener('click', () => apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));
})();
