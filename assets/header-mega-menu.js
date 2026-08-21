(function () {
  'use strict';

  const PADDING = 16;

  function clampPanel(panel) {
    requestAnimationFrame(() => {
      const rect = panel.getBoundingClientRect();
      const vw   = document.documentElement.clientWidth;

      if (rect.right > vw - PADDING) {
        panel.style.transform = 'none';
        panel.style.left      = 'auto';
        panel.style.right     = PADDING + 'px';
      } else if (rect.left < PADDING) {
        panel.style.transform = 'none';
        panel.style.left      = PADDING + 'px';
        panel.style.right     = 'auto';
      }
    });
  }

  function resetPanel(panel) {
    requestAnimationFrame(() => {
      if (!panel.matches(':hover') && !panel.closest('.menu-bar__item--has-mega:hover, .menu-bar__item--has-dropdown:hover')) {
        panel.style.left      = '';
        panel.style.right     = '';
        panel.style.transform = '';
      }
    });
  }

  document.querySelectorAll('.menu-bar__item--has-mega, .menu-bar__item--has-dropdown').forEach(item => {
    const panel = item.querySelector(':scope > .mega-menu, :scope > .dropdown');
    if (!panel) return;
    item.addEventListener('mouseenter', () => clampPanel(panel));
    item.addEventListener('mouseleave', () => resetPanel(panel));
  });

})();