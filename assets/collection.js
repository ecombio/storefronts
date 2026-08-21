/**
 * collection.js
 * Page-level utilities shared across collection components.
 *
 * Responsibilities:
 *   • Shared backdrop — used by filter drawer and sort sheet
 *   • Mobile sort sheet — built lazily, opened by [data-mobile-sort-toggle]
 *   • Sub-collections carousel — prev/next scroll buttons
 *
 * Exposes:
 *   window.CollectionBackdrop  { open(onClose), close(onClose) }
 *     — consumed by collection-filter.js
 *
 * Data attribute contracts:
 *   .collection-mobile-backdrop       — backdrop element in collection.liquid
 *   [data-mobile-sort-toggle]         — sort button in collection-toolbar
 *   [data-sub-collections]            — sub-collection carousel wrapper
 *   [data-sub-collections-track]      — scrollable track
 *   [data-sub-collections-prev/next]  — nav buttons
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     SHARED BACKDROP
     Only one overlay in the DOM; open() stores a callback
     so closeFilter and closeSortSheet don't collide.
  ══════════════════════════════════════════════════════════ */
  var backdrop = document.querySelector('.collection-mobile-backdrop');

  function openBackdrop(onClose) {
    if (!backdrop) return;
    backdrop.classList.add('is-visible');
    backdrop._onClose = onClose;
  }

  function closeBackdrop(caller) {
    if (!backdrop) return;
    backdrop.classList.remove('is-visible');
    if (typeof backdrop._onClose === 'function' && backdrop._onClose !== caller) {
      backdrop._onClose();
    }
    backdrop._onClose = null;
  }

  if (backdrop) {
    backdrop.addEventListener('click', function () {
      closeBackdrop(null);
    });
  }

  // Expose so collection-filter.js can participate
  window.CollectionBackdrop = {
    open:  openBackdrop,
    close: closeBackdrop,
  };

  /* ══════════════════════════════════════════════════════════
     MOBILE SORT SHEET
     Built lazily on first open. Mirrors options from the
     desktop #SortBy select so there's a single source of truth.
  ══════════════════════════════════════════════════════════ */
  var mobileSortBtn = document.querySelector('[data-mobile-sort-toggle]');

  if (mobileSortBtn) {
    var sortSheet = null;

    function buildSortSheet() {
      var sheet = document.createElement('div');
      sheet.className = 'mobile-sort-sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-label', 'Sort options');

      var inner = '<div class="mobile-sort-sheet__inner">';
      inner += '<div class="mobile-sort-sheet__handle"></div>';
      inner += '<p class="mobile-sort-sheet__heading">Sort by</p>';
      inner += '<ul class="mobile-sort-sheet__list">';

      var desktopSort = document.getElementById('SortBy');
      if (desktopSort) {
        Array.from(desktopSort.options).forEach(function (opt) {
          var active = opt.selected ? ' mobile-sort-sheet__option--active' : '';
          inner +=
            '<li><button class="mobile-sort-sheet__option' + active + '" type="button" ' +
            'data-sort-value="' + opt.value + '">' + opt.text + '</button></li>';
        });
      }

      inner += '</ul></div>';
      sheet.innerHTML = inner;

      sheet.querySelectorAll('[data-sort-value]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var url = new URL(window.location.href);
          url.searchParams.set('sort_by', btn.dataset.sortValue);
          window.location.href = url.toString();
        });
      });

      document.body.appendChild(sheet);
      return sheet;
    }

    function openSortSheet() {
      if (!sortSheet) sortSheet = buildSortSheet();
      sortSheet.getBoundingClientRect(); // force reflow before transition
      sortSheet.classList.add('is-open');
      mobileSortBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      openBackdrop(closeSortSheet);
    }

    function closeSortSheet() {
      if (!sortSheet) return;
      sortSheet.classList.remove('is-open');
      mobileSortBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      closeBackdrop(closeSortSheet);
    }

    mobileSortBtn.addEventListener('click', function () {
      sortSheet && sortSheet.classList.contains('is-open')
        ? closeSortSheet()
        : openSortSheet();
    });
  }

  /* ══════════════════════════════════════════════════════════
     SUB-COLLECTIONS CAROUSEL
     Prev/next buttons scroll the track by ~3 card widths.
  ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('[data-sub-collections]').forEach(function (carousel) {
    var track = carousel.querySelector('[data-sub-collections-track]');
    var prev  = carousel.querySelector('[data-sub-collections-prev]');
    var next  = carousel.querySelector('[data-sub-collections-next]');
    if (!track) return;

    function updateNavState() {
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled =
        track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    }

    function scrollByAmount(dir) {
      var cardWidth = track.firstElementChild
        ? track.firstElementChild.getBoundingClientRect().width
        : 120;
      track.scrollBy({ left: dir * (cardWidth * 3 + 32), behavior: 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { scrollByAmount(-1); });
    if (next) next.addEventListener('click', function () { scrollByAmount(1); });
    track.addEventListener('scroll', updateNavState);
    updateNavState();
  });

})();