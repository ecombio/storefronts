/* assets/article-results.js
   Owned by snippets/article-results.liquid.

   Same scroll-restore behavior as product-results.js, scoped to the
   article grid, so returning from an article via the back button
   lands the shopper back where they were.
*/
(function () {
  if (window.__articleResultsLoaded) return;
  window.__articleResultsLoaded = true;

  var storageKey = 'articleResultsScroll:' + window.location.pathname + window.location.search;
  var grid = document.getElementById('search-articles-grid');
  if (!grid) return;

  grid.addEventListener('click', function (event) {
    if (event.target.closest('a')) {
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
