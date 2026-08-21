/**
 * main-author.js
 * Behavior for sections/main-author.liquid
 *
 * All matched articles are rendered server-side; extras beyond
 * `per_page` are marked [hidden]. This just reveals them in batches
 * on click — no network requests, no re-render.
 */
(function () {
  'use strict';

  function initAuthorSection(section) {
    if (!section || section.dataset.authorInitialized === 'true') return;

    var grid = section.querySelector('[data-author-grid]');
    var button = section.querySelector('[data-author-load-more]');
    if (!grid || !button) return;

    var increment = parseInt(button.getAttribute('data-increment'), 10) || 6;

    button.addEventListener('click', function () {
      var hiddenCards = grid.querySelectorAll('[data-author-card][hidden]');
      var toReveal = Array.prototype.slice.call(hiddenCards, 0, increment);

      toReveal.forEach(function (card) {
        card.removeAttribute('hidden');
      });

      var remaining = grid.querySelectorAll('[data-author-card][hidden]').length;
      if (remaining === 0) {
        button.setAttribute('hidden', '');
      }
    });

    section.dataset.authorInitialized = 'true';
  }

  function initAll(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-section-type="main-author"]').forEach(initAuthorSection);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAll(document);
  });

  // Theme editor: re-init when this section is added/reloaded.
  document.addEventListener('shopify:section:load', function (event) {
    var target = event.target;
    if (target.matches && target.matches('[data-section-type="main-author"]')) {
      initAuthorSection(target);
    } else {
      initAll(target);
    }
  });
})();
