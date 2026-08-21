/* assets/product-results.js
   Owned by snippets/product-results.liquid.

   Remembers scroll position within the product grid so that using
   the browser back button (after opening a product or quick view)
   restores the shopper to where they were, instead of dropping them
   back at the top of the results.
*/
(function () {
  if (window.__productResultsLoaded) return;
  window.__productResultsLoaded = true;

  var storageKey = 'productResultsScroll:' + window.location.pathname + window.location.search;
  var grid = document.getElementById('search-results-grid');
  if (!grid) return;

  grid.addEventListener('click', function (event) {
    if (event.target.closest('a, [data-atc-btn], [data-quickview-btn]')) {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    }
  });

  window.addEventListener('pageshow', function () {
    var savedY = sessionStorage.getItem(storageKey);
    if (savedY !== null) {
      window.scrollTo(0, parseInt(savedY, 10));
      sessionStorage.removeItem(storageKey);
    }
  });
})();
