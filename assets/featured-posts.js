(function () {
  'use strict';

  function initFeaturedCarousel(carousel) {
    if (!carousel) return;

    var track = carousel.querySelector('[data-featured-track]');
    var prevBtn = carousel.querySelector('[data-featured-prev]');
    var nextBtn = carousel.querySelector('[data-featured-next]');
    if (!track) return;

    track.scrollLeft = 0;

    var BUFFER = 1;

    function itemScrollAmount() {
      var item = track.querySelector('[data-featured-item]');
      if (!item) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return item.getBoundingClientRect().width + gap;
    }

    function update() {
      var maxScroll = track.scrollWidth - track.clientWidth;

      if (maxScroll <= BUFFER) {
        carousel.classList.add('no-scroll');
        return;
      }
      carousel.classList.remove('no-scroll');

      if (prevBtn) prevBtn.disabled = track.scrollLeft <= BUFFER;
      if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll - BUFFER;
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        track.scrollBy({ left: -itemScrollAmount(), behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        track.scrollBy({ left: itemScrollAmount(), behavior: 'smooth' });
      });
    }

    update();
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    if ('ResizeObserver' in window) {
      new ResizeObserver(update).observe(track);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-featured-carousel]').forEach(initFeaturedCarousel);
  });

  document.addEventListener('shopify:section:load', function (event) {
    var featured = event.target.querySelector('[data-featured-carousel]');
    if (featured) initFeaturedCarousel(featured);
  });
})();