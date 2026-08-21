/**
 * Author Section
 * - Fades the card in when it enters the viewport (optional).
 * - Shows a "Read more" toggle only when the bio actually overflows
 *   its clamped height, and expands/collapses it in place.
 * Re-runs safely inside the Shopify theme editor (section reload).
 */
(function () {
  'use strict';

  function initAnimation(section) {
    if (section.dataset.animate !== 'true') return;
    if (section.dataset.asObserved === 'true') return;
    section.dataset.asObserved = 'true';

    if (!('IntersectionObserver' in window)) {
      section.classList.add('author-section--in-view');
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            section.classList.add('author-section--in-view');
            observer.unobserve(section);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    );

    observer.observe(section);
  }

  function initBioToggle(section) {
    var bio = section.querySelector('[data-author-bio]');
    var toggle = section.querySelector('[data-author-bio-toggle]');
    if (!bio || !toggle) return;

    function evaluateOverflow() {
      var wasExpanded = bio.classList.contains('author-section__bio--expanded');
      if (wasExpanded) return;

      var overflowing = bio.scrollHeight - bio.clientHeight > 2;
      toggle.hidden = !overflowing;
    }

    var moreLabel = toggle.querySelector('[data-label-more]');
    var lessLabel = toggle.querySelector('[data-label-less]');

    toggle.addEventListener('click', function () {
      var expanded = bio.classList.toggle('author-section__bio--expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      if (moreLabel) moreLabel.hidden = expanded;
      if (lessLabel) lessLabel.hidden = !expanded;
    });

    evaluateOverflow();

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(evaluateOverflow);
      ro.observe(bio);
    } else {
      window.addEventListener('resize', evaluateOverflow);
    }
  }

  function initSection(section) {
    initAnimation(section);
    initBioToggle(section);
  }

  function initAll(root) {
    var scope = root || document;
    var sections = scope.querySelectorAll('[data-author-section]');
    sections.forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
})();