/**
 * athlete-grid.js
 * Behavior for snippets/athlete-grid.liquid
 *
 * All cards are rendered server-side; extras beyond the initial
 * `per_page` are marked [hidden]. This reveals them in batches on
 * click — no network requests, no re-render. Written so multiple
 * independent grid instances can exist on the same page (e.g. this
 * snippet reused in more than one section on one template).
 */
(function () {
  'use strict';

  function initGrid(wrapper) {
    if (!wrapper || wrapper.dataset.athleteGridInitialized === 'true') return;

    var grid = wrapper.querySelector('[data-athlete-grid]');
    var button = wrapper.querySelector('[data-athlete-grid-load-more]');
    if (!grid || !button) return;

    var increment = parseInt(button.getAttribute('data-increment'), 10) || 6;

    button.addEventListener('click', function () {
      var hiddenCards = grid.querySelectorAll('[data-athlete-grid-card][hidden]');
      var toReveal = Array.prototype.slice.call(hiddenCards, 0, increment);

      toReveal.forEach(function (card) {
        card.removeAttribute('hidden');
      });

      var remaining = grid.querySelectorAll('[data-athlete-grid-card][hidden]').length;
      if (remaining === 0) {
        button.setAttribute('hidden', '');
      }
    });

    wrapper.dataset.athleteGridInitialized = 'true';
  }

  function initAll(root) {
    var scope = root || document;

    if (scope.matches && scope.matches('[data-athlete-grid-wrapper]')) {
      initGrid(scope);
    }
    scope.querySelectorAll('[data-athlete-grid-wrapper]').forEach(initGrid);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAll(document);
  });

  // Theme editor: re-init when a section containing this snippet is
  // added or reloaded.
  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
})();
