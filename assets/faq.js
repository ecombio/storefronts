/**
 * FAQ section behavior.
 * - Optionally closes other items when one opens (accordion mode),
 *   controlled per-instance via data-one-at-a-time on the section.
 * - Keeps aria-expanded in sync on the <summary> for screen readers.
 * - Multiple FAQ sections on the same page are handled independently.
 */
(function () {
  function initFaq(section) {
    var oneAtATime = section.dataset.oneAtATime === 'true';
    var items = Array.prototype.slice.call(section.querySelectorAll('.faq__item'));

    items.forEach(function (item) {
      var summary = item.querySelector('.faq__summary');

      updateExpandedState(item, summary);

      item.addEventListener('toggle', function () {
        updateExpandedState(item, summary);

        if (item.open && oneAtATime) {
          items.forEach(function (other) {
            if (other !== item && other.open) {
              other.open = false;
            }
          });
        }
      });
    });
  }

  function updateExpandedState(item, summary) {
    if (!summary) return;
    summary.setAttribute('aria-expanded', item.open ? 'true' : 'false');
  }

  function init() {
    var sections = document.querySelectorAll('[data-faq]');
    sections.forEach(initFaq);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize when a FAQ section is added or re-rendered via the
  // Shopify theme editor (section re-render doesn't fire DOMContentLoaded).
  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector('[data-faq]');
    if (section) initFaq(section);
  });
})();
