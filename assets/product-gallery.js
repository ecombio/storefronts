/* ─────────────────────────────────────────
   product-gallery.js
   Scoped entirely to elements inside .product-gallery — never
   touches .product-row markup, so it can run alongside
   main-article.js / accordion.js without any risk of collision.
───────────────────────────────────────── */

(function () {
  /* Flags JS as available so product-gallery.css can skip the
     reveal animation's initial hidden state when JS never runs
     (see html:not(.js) fallback in that file). */
  document.documentElement.classList.add('js');

  /* ── Reveal items on scroll ── */
  function initRevealObserver() {
    var galleries = document.querySelectorAll('.product-gallery');
    if (!galleries.length) return;

    if (!('IntersectionObserver' in window)) {
      // No IntersectionObserver support: just show everything.
      document.querySelectorAll('.product-gallery__item').forEach(function (item) {
        item.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );

    galleries.forEach(function (gallery) {
      var items = gallery.querySelectorAll('.product-gallery__item');
      items.forEach(function (item, i) {
        // Small stagger so a 3-up grid doesn't pop in all at once.
        item.style.transitionDelay = (i * 80) + 'ms';
        observer.observe(item);
      });
    });
  }

  /* ── Wishlist toggle ──
     Scoped to buttons inside .product-gallery so it never touches
     the same data-wishlist-btn elements rendered inside a
     .product-row (that carousel's own handler, if any, owns those). */
  function initWishlistButtons() {
    var galleries = document.querySelectorAll('.product-gallery');
    if (!galleries.length) return;

    galleries.forEach(function (gallery) {
      gallery.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-wishlist-btn]');
        if (!btn || !gallery.contains(btn)) return;

        var pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!pressed));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initRevealObserver();
    initWishlistButtons();
  });
})();
