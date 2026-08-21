/**
 * Link List Dropdown
 * File: assets/link-list.js
 * Loaded by: snippets/header-menu.liquid (only when a link-list block
 * is present)
 *
 * Same shape as mega-menu.js, but positions against the TRIGGER's own
 * rect (left + bottom), not the header's bottom edge — this panel is a
 * narrow dropdown that hangs directly under its own link, not a
 * full-width strip under the whole header.
 *
 * CSS (:hover / :focus-within) drives the open/close visuals. This
 * file only handles what CSS can't:
 *   1. Position the fixed panel's `top`/`left` against the trigger's
 *      live position (recalculated on open, resize, and scroll).
 *   2. Escape close: closes the open panel and returns focus to its
 *      trigger.
 *   3. Click-outside close.
 *   4. Touch support: first tap opens instead of navigating.
 */
(function () {
  'use strict';

  var items = document.querySelectorAll('[data-link-list]');
  if (!items.length) return;

  var openItem = null;

  function getPanel(item) {
    return item.querySelector('[data-link-list-panel]');
  }
  function getTrigger(item) {
    return item.querySelector('[data-link-list-trigger]');
  }

  var VIEWPORT_MARGIN = 16; // px of breathing room kept below the panel

  function positionPanel(item) {
    var panel = getPanel(item);
    var trigger = getTrigger(item);
    if (!panel || !trigger) return;

    var rect = trigger.getBoundingClientRect();
    panel.style.top = rect.bottom + 'px';
    panel.style.left = rect.left + 'px';

    /* Exact available space below the trigger, not the rough
       calc(100vh - 16px) CSS fallback — that estimate assumes the
       panel starts at the top of the viewport, but it actually starts
       at the trigger's own position (below the header). This keeps a
       long link_list scrollable inside the panel instead of ever
       spilling past the bottom of the screen. */
    var available = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    panel.style.maxHeight = Math.max(available, 120) + 'px';
  }

  function positionAll() {
    items.forEach(function (item) {
      positionPanel(item);
    });
  }

  function openMenu(item) {
    if (openItem === item) return;
    if (openItem) closeMenu(openItem);

    var panel = getPanel(item);
    var trigger = getTrigger(item);
    positionPanel(item);
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

    item.addEventListener('mouseenter', function () {
      positionPanel(item);
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

  window.addEventListener('scroll', function () {
    if (openItem) positionPanel(openItem);
  }, { passive: true });

  positionAll();
})();