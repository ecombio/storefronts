/**
 * article-carousel.js
 * Progressive-enhancement controls for sections/article-carousel.liquid.
 * The track is a native scroll container by default (works with no JS);
 * this just adds prev/next buttons and edge-fade state once it overflows.
 */
(function () {
  'use strict';

  function initCarousel(section) {
    var viewport = section.querySelector('[data-carousel-viewport]');
    var track = section.querySelector('[data-carousel-track]');
    var controls = section.querySelector('[data-carousel-controls]');
    var prevBtn = section.querySelector('[data-carousel-prev]');
    var nextBtn = section.querySelector('[data-carousel-next]');

    if (!viewport || !track || !controls || !prevBtn || !nextBtn) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function canScroll() {
      // small tolerance for sub-pixel rounding
      return track.scrollWidth - track.clientWidth > 2;
    }

    function updateEdgeState() {
      var max = track.scrollWidth - track.clientWidth;
      var pos = track.scrollLeft;

      if (!canScroll()) {
        viewport.setAttribute('data-edge', 'none');
        controls.hidden = true;
        return;
      }

      controls.hidden = false;

      if (pos <= 2) {
        viewport.setAttribute('data-edge', 'start');
      } else if (pos >= max - 2) {
        viewport.setAttribute('data-edge', 'end');
      } else {
        viewport.setAttribute('data-edge', 'middle');
      }

      prevBtn.disabled = pos <= 2;
      nextBtn.disabled = pos >= max - 2;
    }

    function scrollByPage(direction) {
      var amount = track.clientWidth * 0.9 * direction;
      track.scrollBy({
        left: amount,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }

    prevBtn.addEventListener('click', function () {
      scrollByPage(-1);
    });

    nextBtn.addEventListener('click', function () {
      scrollByPage(1);
    });

    track.addEventListener('scroll', updateEdgeState, { passive: true });

    var resizeObserver = new ResizeObserver(function () {
      updateEdgeState();
    });
    resizeObserver.observe(track);

    updateEdgeState();
  }

  function initAll() {
    document.querySelectorAll('.article-carousel').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Re-init when a carousel section is added/edited in the theme editor.
  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector('.article-carousel');
    if (section) initCarousel(section);
  });
})();
