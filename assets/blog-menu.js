(function () {
  'use strict';

  function initToggle(nav) {
    var toggle = nav.querySelector('[data-blog-menu-toggle]');
    var list = nav.querySelector('[data-blog-menu-list]');

    if (toggle && list) {
      toggle.addEventListener('click', function () {
        var isOpen = list.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
    }
  }

  // Toggles has-scroll-left / has-scroll-right on [data-blog-menu-scroll],
  // same mechanic as main-header.js's edge-fade detection for .menu-bar:
  // the CSS shadows in blog-menu.css are keyed off those classes and
  // only show on the side(s) that actually have more content to reveal.
  function initEdgeFade(nav) {
    var wrap = nav.querySelector('[data-blog-menu-scroll]');
    var list = nav.querySelector('[data-blog-menu-list]');
    if (!wrap || !list) return;

    // FIX — browser scroll-anchoring can nudge this list's scrollLeft away
    // from 0 when something earlier in the DOM (e.g. blog-menu__heading)
    // resizes after first paint, silently landing the nav a few pixels
    // into its scroll range and clipping the first/last items. Force it
    // back to a known-good start before doing anything else. Paired with
    // overflow-anchor: none on .blog-menu__list in blog-menu.css.
    list.scrollLeft = 0;

    var BUFFER = 1; // guards against sub-pixel scrollLeft/maxScroll mismatches at the true end

    var update = function () {
      var maxScroll = list.scrollWidth - list.clientWidth;

      if (maxScroll <= BUFFER) {
        wrap.classList.remove('has-scroll-left', 'has-scroll-right');
        return;
      }

      wrap.classList.toggle('has-scroll-left', list.scrollLeft > BUFFER);
      wrap.classList.toggle('has-scroll-right', list.scrollLeft < maxScroll - BUFFER);
    };

    update();
    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    if ('ResizeObserver' in window) {
      new ResizeObserver(update).observe(list);
    }
  }

  function initSticky(nav) {
    if (!nav.classList.contains('blog-menu--sticky')) return;

    var spacer = document.createElement('div');
    spacer.className = 'blog-menu__spacer';
    spacer.setAttribute('aria-hidden', 'true');
    nav.parentNode.insertBefore(spacer, nav.nextSibling);

    var originalTop = 0;
    var ticking = false;

    function getHeaderOffset() {
      var height =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--header-group-height')
        ) || 0;
      var hidden = document.documentElement.classList.contains('header-group-hidden');
      return hidden ? 0 : height;
    }

    function measure() {
      if (!nav.classList.contains('is-stuck')) {
        originalTop = nav.getBoundingClientRect().top + window.scrollY;
      }
      spacer.style.height = nav.offsetHeight + 'px';
    }

    function update() {
      var shouldStick = window.scrollY + getHeaderOffset() >= originalTop;

      if (shouldStick && !nav.classList.contains('is-stuck')) {
        nav.classList.add('is-stuck');
        spacer.classList.add('is-active');
      } else if (!shouldStick && nav.classList.contains('is-stuck')) {
        nav.classList.remove('is-stuck');
        spacer.classList.remove('is-active');
        measure();
      }
      ticking = false;
    }

    measure();
    update();

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'resize',
      function () {
        measure();
        update();
      },
      { passive: true }
    );

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        measure();
      }).observe(nav);
    }

    var rootObserver = new MutationObserver(update);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  function initMenu(nav) {
    initToggle(nav);
    if (window.BlogMenuItem) {
      window.BlogMenuItem.init(nav);
    }
    initEdgeFade(nav);
    initSticky(nav);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-blog-menu]').forEach(initMenu);
  });

  document.addEventListener('shopify:section:load', function (event) {
    var nav = event.target.querySelector('[data-blog-menu]');
    if (nav) initMenu(nav);
  });
})();