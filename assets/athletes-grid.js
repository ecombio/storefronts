(function () {
  'use strict';

  function initGrid(wrapper) {
    if (!wrapper || wrapper.dataset.athletesGridInitialized === 'true') return;

    var grid = wrapper.querySelector('[data-athletes-grid]');
    var button = wrapper.querySelector('[data-athletes-grid-load-more]');
    if (!grid || !button) return;

    var increment = parseInt(button.getAttribute('data-increment'), 10) || 6;

    button.addEventListener('click', function () {
      var hiddenCards = grid.querySelectorAll('[data-athletes-grid-card][hidden]');
      var toReveal = Array.prototype.slice.call(hiddenCards, 0, increment);

      toReveal.forEach(function (card) {
        card.removeAttribute('hidden');
      });

      var remaining = grid.querySelectorAll('[data-athletes-grid-card][hidden]').length;
      if (remaining === 0) {
        button.setAttribute('hidden', '');
      }
    });

    wrapper.dataset.athletesGridInitialized = 'true';
  }

  function initAll(root) {
    var scope = root || document;

    if (scope.matches && scope.matches('[data-athletes-grid-wrapper]')) {
      initGrid(scope);
    }
    scope.querySelectorAll('[data-athletes-grid-wrapper]').forEach(initGrid);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAll(document);
  });

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
})();
