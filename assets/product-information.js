/* ==========================================================================
   PRODUCT INFORMATION
   assets/product-information.js

   Pairs with sections/product-information.liquid and product-information.css.

   UPDATE: Sections are plain always-visible <div>s now, not <details> —
   there's nothing to force open anymore. This script now only does one
   thing: highlight whichever jump link matches the section currently in
   view, via IntersectionObserver (a scrollspy).
   ========================================================================== */

(() => {
  'use strict';

  function initInstance(root) {
    const links = root.querySelectorAll('[data-jumplink]');
    const sectionsRoot = root.querySelector('[data-sections]');
    if (!sectionsRoot) return;

    const sections = sectionsRoot.querySelectorAll('[data-section]');
    const linkByTarget = new Map();
    links.forEach((link) => linkByTarget.set(link.getAttribute('data-jumplink'), link));

    function setActive(id) {
      links.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('data-jumplink') === id);
      });
    }

    const headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-group-height') || '68',
      10
    );

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's currently intersecting.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActive(visible[0].target.getAttribute('data-section'));
        }
      },
      {
        // Trigger when a section is roughly in the "reading band" below the sticky bar.
        rootMargin: `-${headerHeight + 60}px 0px -70% 0px`,
        threshold: 0
      }
    );

    sections.forEach((section) => observer.observe(section));

    // Sync active state on load if the URL already has a hash.
    const hash = window.location.hash.replace('#', '');
    if (hash && linkByTarget.has(hash)) {
      setActive(hash);
    } else if (sections.length > 0) {
      setActive(sections[0].getAttribute('data-section'));
    }
  }

  function init() {
    document
      .querySelectorAll('[data-product-information]')
      .forEach(initInstance);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();