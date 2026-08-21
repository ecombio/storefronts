(function () {
  'use strict';

  var WISHLIST_KEY = 'shopify_wishlist';
  // Scoped to the header's own badge class instead of the generic
  // [data-wishlist-count] attribute — that attribute is also present on
  // the wishlist page's own counter (main-wishlist.liquid), and querying
  // it here was overwriting that element's "N items saved" text with a
  // bare number every time this script ran.
  var COUNT_SEL     = '.header-wishlist__badge';
  var HIDDEN_CLS    = 'header-wishlist__badge--hidden';
  var POP_CLS       = 'header-wishlist__badge--pop';

  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; } catch (e) { return []; }
  }

  function getCount() {
    return getWishlist().filter(function (entry) {
      return typeof entry === 'object' && entry !== null && (entry.id || entry.handle);
    }).length;
  }

  function updateBadges(count, animate) {
    document.querySelectorAll(COUNT_SEL).forEach(function (el) {
      el.textContent = String(count);
      el.classList.toggle(HIDDEN_CLS, count === 0);

      if (animate && count > 0) {
        el.classList.remove(POP_CLS);
        void el.offsetWidth;
        el.classList.add(POP_CLS);
        el.addEventListener(
          'animationend',
          function () { el.classList.remove(POP_CLS); },
          { once: true }
        );
      }
    });
  }

  function sync(animate) {
    updateBadges(getCount(), animate);
  }

  function init() {
    sync(false);

    document.addEventListener('wishlist:toggle', function () { sync(true); });
    document.addEventListener('wishlist:cleared', function () { sync(false); });

    window.addEventListener('storage', function (e) {
      if (e.key === WISHLIST_KEY) sync(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());