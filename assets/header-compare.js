(function () {
  'use strict';

  var COMPARE_KEY = 'shopify_compare';

  function getCompareList() {
    try { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; }
    catch (e) { return []; }
  }

  var link = document.querySelector('[data-header-compare]');
  if (!link) return;

  var badge = link.querySelector('[data-header-compare-badge]');
  var sr    = link.querySelector('[data-header-compare-sr]');

  function render() {
    var count = getCompareList().filter(function (entry) {
      return entry && typeof entry === 'object' && entry.handle;
    }).length;

    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }

    if (sr) {
      sr.textContent = count === 0
        ? 'Compare, no products selected'
        : 'Compare, ' + count + (count === 1 ? ' product selected' : ' products selected');
    }
  }

  document.addEventListener('compare:toggle',  render);
  document.addEventListener('compare:cleared', render);
  document.addEventListener('compare:updated', render);

  window.addEventListener('storage', function (e) {
    if (e.key === COMPARE_KEY) render();
  });

  render();
})();