/**
 * advocacy.js — sections/advocacy.liquid
 *
 * Drives the one-column slideshow layout: moves the track,
 * updates active slide/dot state, wires arrows/dots/keyboard,
 * and handles optional autoplay (paused on hover/focus, and
 * skipped entirely for prefers-reduced-motion).
 *
 * The two-column grid layout needs no JS at all — this file is a
 * no-op if a given section instance has no [data-advocacy-slideshow].
 */

(function () {
  'use strict';

  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initSlideshow(root) {
    var container = root.querySelector('[data-advocacy-slideshow]');
    if (!container || container.dataset.advocacyInitialized === 'true') return;
    container.dataset.advocacyInitialized = 'true';

    var track = container.querySelector('[data-advocacy-track]');
    var slides = Array.prototype.slice.call(container.querySelectorAll('[data-advocacy-slide]'));
    var dots = Array.prototype.slice.call(container.querySelectorAll('[data-advocacy-dot]'));
    var prevBtn = container.querySelector('[data-advocacy-prev]');
    var nextBtn = container.querySelector('[data-advocacy-next]');

    if (!track || slides.length === 0) return;

    var current = 0;
    var autoplayTimer = null;
    var autoplayEnabled = root.dataset.autoplay === 'true' && !prefersReducedMotion;
    var autoplaySpeed = parseInt(root.dataset.autoplaySpeed, 10) || 5000;

    function goTo(index) {
      var count = slides.length;
      current = ((index % count) + count) % count;

      track.style.transform = 'translateX(-' + current * 100 + '%)';

      slides.forEach(function (slide, i) {
        var isActive = i === current;
        slide.classList.toggle('is-active', isActive);
        if (isActive) {
          slide.removeAttribute('aria-hidden');
        } else {
          slide.setAttribute('aria-hidden', 'true');
        }
      });

      dots.forEach(function (dot, i) {
        var isActive = i === current;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    function next() {
      goTo(current + 1);
    }

    function prev() {
      goTo(current - 1);
    }

    function startAutoplay() {
      if (!autoplayEnabled || slides.length < 2) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(next, autoplaySpeed);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    if (nextBtn) nextBtn.addEventListener('click', function () {
      next();
      stopAutoplay();
      startAutoplay();
    });

    if (prevBtn) prevBtn.addEventListener('click', function () {
      prev();
      stopAutoplay();
      startAutoplay();
    });

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var index = parseInt(dot.dataset.index, 10) || 0;
        goTo(index);
        stopAutoplay();
        startAutoplay();
      });
    });

    container.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') {
        next();
        stopAutoplay();
        startAutoplay();
      } else if (event.key === 'ArrowLeft') {
        prev();
        stopAutoplay();
        startAutoplay();
      }
    });

    container.addEventListener('mouseenter', stopAutoplay);
    container.addEventListener('mouseleave', startAutoplay);
    container.addEventListener('focusin', stopAutoplay);
    container.addEventListener('focusout', startAutoplay);

    goTo(0);
    startAutoplay();
  }

  function initAll(scope) {
    var sections = (scope || document).querySelectorAll('[data-section-type="advocacy"]');
    sections.forEach(function (section) {
      initSlideshow(section);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAll(document);
  });

  // Theme editor support: re-init when this section is added or
  // re-rendered after a settings change.
  document.addEventListener('shopify:section:load', function (event) {
    if (event.target && event.target.matches('[data-section-type="advocacy"]')) {
      initAll(event.target.parentNode || document);
    }
  });
})();
