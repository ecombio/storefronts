/* ─────────────────────────────────────────
   product-grid.js
   Scope: .product-grid

   SELF-CONTAINED: this section's tiles are plain link-throughs (see
   sections/product-grid.liquid) — no add-to-cart, no wishlist, no
   variant logic — so this file's only job is the reveal-on-scroll
   effect for .product-grid__item, plus the shared 'js' class /
   no-JS fallback pattern also used by product-gallery.js. It does
   not import from or assume the presence of product-gallery.js,
   product-card.js, or single-product.js.

   NOTE: unchanged by the 2x2 fixed-grid update — column count has
   no bearing on the reveal-on-scroll behavior below.
───────────────────────────────────────── */

(function () {
  'use strict';

  // Signals to product-grid.css (html:not(.js) .product-grid__item)
  // that JS is running, so items can safely start hidden and fade in.
  document.documentElement.classList.add('js');

  function initReveal(grid) {
    var items = grid.querySelectorAll('.product-grid__item');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      // No IntersectionObserver support: reveal everything immediately
      // rather than leaving tiles stuck at opacity 0.
      items.forEach(function (item) { item.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    items.forEach(function (item) { observer.observe(item); });
  }

  function init() {
    document.querySelectorAll('.product-grid').forEach(initReveal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();