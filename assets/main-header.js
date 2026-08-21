(function () {
  'use strict';

  var menuBar = document.getElementById('main-header-menu-bar');
  if (!menuBar) return;

  var BUFFER = 1;

  var getScrollEl = function () {
    var container = menuBar.querySelector('.menu-bar__container');
    if (container && container.scrollWidth > container.clientWidth) return container;
    if (menuBar.scrollWidth > menuBar.clientWidth) return menuBar;
    return container || menuBar;
  };

  var update = function () {
    var el = getScrollEl();
    var maxScroll = el.scrollWidth - el.clientWidth;

    if (maxScroll <= BUFFER) {
      menuBar.classList.remove('has-scroll-left', 'has-scroll-right');
      return;
    }

    menuBar.classList.toggle('has-scroll-left', el.scrollLeft > BUFFER);
    menuBar.classList.toggle('has-scroll-right', el.scrollLeft < maxScroll - BUFFER);
  };

  var scrollTarget = menuBar.querySelector('.menu-bar__container') || menuBar;

  update();
  scrollTarget.addEventListener('scroll', update, { passive: true });
  menuBar.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  if ('ResizeObserver' in window) {
    new ResizeObserver(update).observe(menuBar);
  }
})();

(function () {
  'use strict';

  var trigger = document.getElementById('main-header-search-trigger');
  var overlay = document.getElementById('main-header-search-overlay');
  if (!trigger || !overlay) return;

  var headerGroup = document.getElementById('header-group-wrapper');
  var panel = overlay.querySelector('.main-header__search-overlay-panel');
  var input = overlay.querySelector('[data-search-input]');
  var closeEls = overlay.querySelectorAll('[data-search-overlay-close]');
  var lastFocused = null;
  var isOpen = false;
  var CLOSE_TRANSITION_MS = 200;

  function relocateOverlay() {
    if (overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
  }

  relocateOverlay();

  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocused = document.activeElement;

    relocateOverlay();

    overlay.hidden = false;
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
    });

    if (headerGroup) headerGroup.classList.add('is-search-active');

    trigger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    if (input) {
      setTimeout(function () { input.focus(); }, 50);
    }

    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;

    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown);

    if (headerGroup) headerGroup.classList.remove('is-search-active');

    setTimeout(function () {
      overlay.hidden = true;
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }, CLOSE_TRANSITION_MS);
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }

    if (e.key === 'Tab' && panel) {
      var focusable = panel.querySelectorAll(
        'input, button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  trigger.addEventListener('click', toggle);
  closeEls.forEach(function (el) {
    el.addEventListener('click', close);
  });

  document.addEventListener('shopify:section:load', relocateOverlay);
})();