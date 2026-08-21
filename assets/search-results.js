/* assets/search-results.js */

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