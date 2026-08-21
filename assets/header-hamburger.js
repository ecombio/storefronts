/**
 * Header Hamburger + Mobile Nav Drawer Controller
 * File: assets/header-hamburger.js
 * Loaded by: snippets/header-hamburger.liquid (defer)
 *
 * Responsibilities:
 *   1. Tablet/mobile hamburger → mobile nav drawer (open / close via
 *      X button / Escape / backdrop-click / focus trap / body scroll
 *      lock)
 *   2. Nested submenu accordion inside the drawer — tapping a parent
 *      item (rendered as a <button class="main-header__mobile-nav-toggle">
 *      by header-hamburger-menu-list.liquid) expands/collapses its
 *      child <ul>. Only one submenu per level stays open at a time;
 *      opening a sibling collapses the previously open one.
 *   3. Desktop-only sticky hamburger → toggles .menu-bar open/closed
 *      while the header is sticky (main-header.css/js own .menu-bar
 *      and the sticky scroll state itself; this file only reads/writes
 *      its `.is-visible` class)
 *
 * Decoupling from main-header.js: main-header.js owns the scroll
 * listener that adds/removes #main-header's `.is-sticky` class. When it
 * detects we've scrolled back out of sticky mode, it dispatches a
 * `main-header:unstick` CustomEvent on the header element rather than
 * reaching into this file's DOM (the sticky hamburger, .menu-bar's
 * `.is-visible` state) directly. This file listens for that event and
 * resets its own state. Neither file needs to import or know the
 * other's internals beyond that one event name.
 *
 * BACKDROP-CLICK NOTE (compact variant only): the dimmed overlay behind
 * the drawer is a ::before pseudo-element of .main-header__mobile-nav
 * (see header-hamburger.css), not a separate DOM node. Pseudo-elements
 * can't be targeted independently, so a click on the backdrop reports
 * e.target as .main-header__mobile-nav itself — the exact same node a
 * click on the drawer's real content also reports. A `.contains()`
 * check can't tell these apart (mobileNav.contains(mobileNav) is
 * always true), so "clicking outside" would silently never close the
 * drawer. Instead, isBackdropClick() compares the click's coordinates
 * against the drawer's own rendered width — anything past the panel is
 * backdrop, regardless of which node reported it. The full-width
 * variant has no backdrop and covers the whole screen, so this check
 * (and the outside-click listener that uses it) only runs when
 * .main-header__mobile-nav--compact is the active modifier class.
 */

(function () {
  'use strict';

  /* ── Element refs ─────────────────────────────────────────────────────── */
  var header         = document.getElementById('main-header');
  var navToggle       = document.getElementById('main-header-nav-toggle');
  var mobileNav       = document.getElementById('main-header-mobile-nav');
  var navClose        = document.getElementById('main-header-mobile-nav-close');
  var stickyHamburger = document.querySelector('.main-header-sticky__hamburger');
  var menuBar         = document.querySelector('.menu-bar');

  /* ── Focusable selector for focus trap ───────────────────────────────── */
  var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  /* ─────────────────────────────────────────────────────────────────────
     DESKTOP-ONLY STICKY HAMBURGER
     Button itself is only ever visible ≥1024px (see header-hamburger.css),
     so no extra width check is needed here — it simply won't be clicked
     on mobile/tablet because it isn't rendered/visible there.
     ───────────────────────────────────────────────────────────────────── */
  if (stickyHamburger && menuBar) {
    stickyHamburger.addEventListener('click', function () {
      var isOpen = menuBar.classList.toggle('is-visible');
      stickyHamburger.classList.toggle('is-active', isOpen);
      stickyHamburger.setAttribute('aria-expanded', String(isOpen));
    });

    /* Reset when main-header.js tells us we've left sticky mode
       (scrolled back above the threshold) */
    if (header) {
      header.addEventListener('main-header:unstick', function () {
        menuBar.classList.remove('is-visible');
        stickyHamburger.classList.remove('is-active');
        stickyHamburger.setAttribute('aria-expanded', 'false');
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     MOBILE NAV DRAWER
     ───────────────────────────────────────────────────────────────────── */
  if (!navToggle || !mobileNav) {
    /* Mobile nav elements are optional — skip gracefully */
    return;
  }

  var navOpen = false;

  function focusableEls() {
    return Array.prototype.slice.call(mobileNav.querySelectorAll(FOCUSABLE));
  }

  /* ── Nested submenu accordion (one open per level) ──────────────────── */
  function resetSubmenus() {
    Array.prototype.forEach.call(
      mobileNav.querySelectorAll('.main-header__mobile-nav-toggle'),
      function (t) {
        t.setAttribute('aria-expanded', 'false');
        var sub = document.getElementById(t.getAttribute('aria-controls'));
        if (sub) sub.hidden = true;
      }
    );
  }

  mobileNav.addEventListener('click', function (e) {
    var toggle = e.target.closest('.main-header__mobile-nav-toggle');
    if (!toggle) return;

    var sub = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!sub) return;
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';

    /* Accordion: collapse sibling submenus at this same level first */
    var li = toggle.closest('li');
    var parentUl = li.parentElement;
    Array.prototype.forEach.call(parentUl.children, function (siblingLi) {
      if (siblingLi === li) return;
      var siblingToggle = siblingLi.querySelector(':scope > .main-header__mobile-nav-row > .main-header__mobile-nav-toggle');
      if (!siblingToggle) return;
      var siblingSub = document.getElementById(siblingToggle.getAttribute('aria-controls'));
      siblingToggle.setAttribute('aria-expanded', 'false');
      if (siblingSub) siblingSub.hidden = true;
    });

    toggle.setAttribute('aria-expanded', String(!isOpen));
    sub.hidden = isOpen;
  });

  function openNav() {
    navOpen = true;
    mobileNav.hidden = false;
    mobileNav.removeAttribute('aria-hidden');
    mobileNav.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.classList.add('is-open');
    document.body.classList.add('nav-is-open');
    var first = focusableEls()[0];
    if (first) first.focus();
  }

  function closeNav() {
    navOpen = false;
    mobileNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.classList.remove('is-open');
    document.body.classList.remove('nav-is-open');
    navToggle.focus();

    mobileNav.addEventListener('transitionend', function onEnd() {
      mobileNav.removeEventListener('transitionend', onEnd);
      if (!navOpen) {
        mobileNav.hidden = true;
        mobileNav.setAttribute('aria-hidden', 'true');
        resetSubmenus();
      }
    });
  }

  function trapFocus(e) {
    if (!navOpen) return;
    var els   = focusableEls();
    if (!els.length) return;
    var first = els[0];
    var last  = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  var isCompact = mobileNav.classList.contains('main-header__mobile-nav--compact');

  /* A click "on the backdrop" always lands on .main-header__mobile-nav
     itself (see file header comment) — so instead of asking which node
     was clicked, ask WHERE it was clicked. Anything past the drawer's
     own rendered width is backdrop, not content. Only meaningful for
     the compact variant, which is the only one with a backdrop. */
  function isBackdropClick(e) {
    var rect = mobileNav.getBoundingClientRect();
    return e.clientX > rect.right || e.clientX < rect.left || e.clientY > rect.bottom || e.clientY < rect.top;
  }

  navToggle.addEventListener('click', function () {
    navOpen ? closeNav() : openNav();
  });

  if (navClose) {
    navClose.addEventListener('click', closeNav);
  }

  /* Outside-click-to-close only applies to the compact variant — the
     full-width variant covers the entire screen, so there's nothing
     "outside" it to click. */
  if (isCompact) {
    document.addEventListener('click', function (e) {
      if (!navOpen) return;

      /* Clicks inside the drawer's real content, or on the toggle button
         that opened it, are never "outside" clicks. */
      if (navToggle.contains(e.target)) return;
      if (mobileNav.contains(e.target) && !isBackdropClick(e)) return;

      closeNav();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navOpen) { closeNav(); return; }
    if (e.key === 'Tab'    && navOpen) { trapFocus(e); }
  });

})();