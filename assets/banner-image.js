(() => {
  const SELECTOR = '[data-banner-image]';

  function markLoaded(img) {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('is-loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      // Fallback in case the image fails to load — don't leave it invisible
      img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
    }
  }

  function init(root) {
    root.querySelectorAll('[data-banner-image-img]').forEach(markLoaded);
  }

  function initAll() {
    document.querySelectorAll(SELECTOR).forEach((root) => {
      if (root.__bannerImageInit) return;
      root.__bannerImageInit = true;
      init(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Re-init when Shopify theme editor injects/re-renders a section
  document.addEventListener('shopify:section:load', (event) => {
    const root = event.target.querySelector(SELECTOR);
    if (root) {
      root.__bannerImageInit = true;
      init(root);
    }
  });
})();