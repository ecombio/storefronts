/**
 * Header Search Drawer Controller
 * File: assets/header-search-drawer.js
 * Loaded by: snippets/header-search-drawer.liquid (defer)
 *
 * Self-contained: only reads/writes elements rendered by
 * header-search-drawer.liquid. Does not touch header-hamburger.js's
 * mobile nav drawer, main-header.js's sticky state, or header-search.js
 * internals directly — it only opens/closes the wrapping drawer.
 * header-search.js independently manages the [data-search-root] form
 * inside it (predictive results, empty/focus state, voice, etc.)
 * exactly as it does everywhere else header-search.liquid is rendered
 * — it auto-attaches to any [data-search-root] on the page, so this
 * file doesn't need to initialize or know anything about it.
 *
 * Behavior:
 *   - Click trigger      -> open drawer, focus the search input inside it
 *   - Click close / Esc  -> close drawer, return focus to trigger
 *   - Body scroll lock while open
 *   - Focus trap while open
 */

(function () {
  'use strict';

  var trigger  = document.getElementById('header-search-drawer-trigger');
  var drawer   = document.getElementById('header-search-drawer');
  var closeBtn = document.getElementById('header-search-drawer-close');

  if (!trigger || !drawer) return;

  var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  var isOpen = false;

  function focusableEls() {
    return Array.prototype.slice.call(drawer.querySelectorAll(FOCUSABLE));
  }

  function openDrawer() {
    isOpen = true;
    drawer.hidden = false;
    drawer.removeAttribute('aria-hidden');

    /* rAF so the browser registers the `hidden` removal before the
       transition-triggering class gets added — otherwise the drawer
       can jump straight to open with no slide. */
    window.requestAnimationFrame(function () {
      drawer.classList.add('is-open');
    });

    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('search-drawer-is-open');

    var input = drawer.querySelector('[data-search-input]');
    if (input) input.focus();
  }

  function closeDrawer() {
    isOpen = false;
    drawer.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('search-drawer-is-open');
    trigger.focus();

    drawer.addEventListener('transitionend', function onEnd() {
      drawer.removeEventListener('transitionend', onEnd);
      if (!isOpen) {
        drawer.hidden = true;
        drawer.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function trapFocus(e) {
    if (!isOpen) return;
    var els = focusableEls();
    if (!els.length) return;
    var first = els[0];
    var last  = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  trigger.addEventListener('click', function () {
    isOpen ? closeDrawer() : openDrawer();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeDrawer);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) { closeDrawer(); return; }
    if (e.key === 'Tab' && isOpen) { trapFocus(e); }
  });

})();