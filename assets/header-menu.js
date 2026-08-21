/**
 * Header Menu Bar — scroll fade indicators
 * File: assets/header-menu.js
 * Loaded by: snippets/header-menu.liquid
 *
 * Toggles .has-scroll-left / .has-scroll-right on #main-header-menu-bar
 * based on the scroll position of .menu-bar__container, so
 * header-menu.css can fade the edge overlays in/out accordingly —
 * the left/right "shadow" effect on a horizontally-scrollable menu bar
 * (same idea as Back Market's header nav).
 *
 * The fade overlays themselves are hidden via CSS below 1024px, so this
 * script just no-ops harmlessly on mobile/tablet widths.
 */
(function () {
  'use strict';

  var nav = document.getElementById('main-header-menu-bar');
  if (!nav) return;

  var container = nav.querySelector('.menu-bar__container');
  if (!container) return;

  var THRESHOLD = 4; // px of slack so it doesn't flicker right at the edge

  var updateFades = function () {
    var scrollLeft = container.scrollLeft;
    var maxScroll = container.scrollWidth - container.clientWidth;

    nav.classList.toggle('has-scroll-left', scrollLeft > THRESHOLD);
    nav.classList.toggle('has-scroll-right', scrollLeft < maxScroll - THRESHOLD);
  };

  updateFades();
  container.addEventListener('scroll', updateFades, { passive: true });
  window.addEventListener('resize', updateFades);

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(updateFades);
    ro.observe(container);
  }
})();