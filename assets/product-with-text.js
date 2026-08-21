/* ─────────────────────────────────────────
   product-with-text.js
   Scope: .product-with-text

   SELF-CONTAINED: this section has no interactive product logic of
   its own (the tile is a plain link-through, same as product-grid's
   tiles) — its only job is fading the block in on scroll. It does
   not import from or assume the presence of product-grid.js,
   product-card.js, single-product.js, or main-article.js.

   NOTE: unchanged by the demo-preset update — that change only
   touched schema defaults/presets in the .liquid file.
───────────────────────────────────────── */

(function () {
  'use strict';

  // Signals to product-with-text.css (html:not(.js) .product-with-text__inner)
  // that JS is running, so the block can safely start hidden and fade in.
  document.documentElement.classList.add('js');

  function initReveal(section) {
    var inner = section.querySelector('.product-with-text__inner');
    if (!inner) return;

    if (!('IntersectionObserver' in window)) {
      inner.classList.add('is-visible');
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

    observer.observe(inner);
  }

  function init() {
    document.querySelectorAll('.product-with-text').forEach(initReveal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();