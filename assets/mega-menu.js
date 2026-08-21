/**
 * Mega Menu
 * File: assets/mega-menu.js
 * Loaded by: snippets/header-menu.liquid (only when a mega-menu block
 * is present)
 *
 * CSS (:hover / :focus-within) drives the actual open/close visuals.
 * This file exists for what CSS can't do on its own:
 *   1. Position the fixed panel's `top` against the header's live
 *      bottom edge (recalculated on open and resize — covers both
 *      sticky and non-sticky).
 *   2. Escape close: closes the open panel and returns focus to its
 *      trigger.
 *   3. Click-outside close.
 *   4. Scroll close: closes the open panel as soon as the page
 *      scrolls, rather than following it around — a mega-menu panel
 *      chasing the header up/down the viewport reads as broken, and
 *      once the header itself moves (sticky engaging/disengaging,
 *      the "menu bar" toggle collapsing) the panel's `top` position
 *      is stale anyway.
 *   5. Touch support: touch devices have no hover, so the first tap
 *      on a trigger opens the panel instead of navigating; a second
 *      tap (now that it's open) navigates through normally.
 */
(function () {
  'use strict';

  var items = document.querySelectorAll('[data-mega-menu]');
  if (!items.length) return;

  var header = document.getElementById('main-header');
  var openItem = null;

  function getPanel(item) {
    return item.querySelector('[data-mega-menu-panel]');
  }
  function getTrigger(item) {
    return item.querySelector('[data-mega-menu-trigger]');
  }

  function positionPanel(panel) {
    if (!header || !panel) return;
    panel.style.top = header.getBoundingClientRect().bottom + 'px';
  }

  function positionAll() {
    items.forEach(function (item) {
      positionPanel(getPanel(item));
    });
  }

  function openMenu(item) {
    if (openItem === item) return;
    if (openItem) closeMenu(openItem);

    var panel = getPanel(item);
    var trigger = getTrigger(item);
    positionPanel(panel);
    panel.classList.add('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    openItem = item;
  }

  function closeMenu(item) {
    var panel = getPanel(item);
    var trigger = getTrigger(item);
    if (panel) panel.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (openItem === item) openItem = null;
  }

  items.forEach(function (item) {
    var trigger = getTrigger(item);
    var panel = getPanel(item);
    if (!trigger || !panel) return;

    /* Reposition right as hover begins — CSS shows the panel, this
       just makes sure `top` is current before it becomes visible. */
    item.addEventListener('mouseenter', function () {
      positionPanel(panel);
    });

    item.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' || event.key === 'Esc') {
        closeMenu(item);
        trigger.focus();
      }
    });

    /* Touch devices: first tap opens instead of navigating. */
    trigger.addEventListener('click', function (event) {
      var isOpen = panel.classList.contains('is-open');
      if (!isOpen && window.matchMedia('(hover: none)').matches) {
        event.preventDefault();
        openMenu(item);
      }
    });
  });

  document.addEventListener('click', function (event) {
    if (openItem && !openItem.contains(event.target)) {
      closeMenu(openItem);
    }
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(positionAll, 100);
  });

  /* Close, don't chase — see file header comment #4. */
  window.addEventListener('scroll', function () {
    if (openItem) closeMenu(openItem);
  }, { passive: true });

  /* Catches header height changes that aren't a window resize or a
     scroll — e.g. the sticky hamburger toggling .menu-bar open/closed
     while the panel is open. */
  if (header && 'ResizeObserver' in window) {
    var ro = new ResizeObserver(function () {
      if (openItem) positionPanel(getPanel(openItem));
    });
    ro.observe(header);
  }

  positionAll();
})();