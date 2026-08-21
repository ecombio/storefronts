(function () {
  'use strict';

  var toolbar = document.getElementById('collection-toolbar');
  if (!toolbar) return;

  var collectionPage = document.querySelector('[data-collection-page]');

  var syncToolbarHeight = function () {
    document.documentElement.style.setProperty('--sticky-toolbar-height', toolbar.offsetHeight + 'px');
  };

  syncToolbarHeight();
  window.addEventListener('resize', syncToolbarHeight);

  if ('ResizeObserver' in window) {
    new ResizeObserver(syncToolbarHeight).observe(toolbar);
  }

  var tabs = toolbar.querySelectorAll('[data-tab]');

  function setActiveTab(key) {
    tabs.forEach(function (t) {
      var on = t.dataset.tab === key;
      t.classList.toggle('tab-switcher__tab--active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('tabindex', on ? '0' : '-1');
    });
    toolbar.dataset.activeTab = key;

    if (collectionPage) {
      collectionPage.dataset.activeTab = key;
    }
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      var key = tab.dataset.tab;
      if (key === toolbar.dataset.activeTab) return;

      setActiveTab(key);

      var url = new URL(window.location.href);
      url.searchParams.set('tab', key);
      url.hash = '';
      history.pushState({ tab: key }, '', url.toString());

      document.dispatchEvent(new CustomEvent('collection:tabchange', { detail: { tab: key } }));
    });

    tab.addEventListener('keydown', function (e) {
      var next;
      if (e.key === 'ArrowRight') next = tabs[i + 1] || tabs[0];
      if (e.key === 'ArrowLeft')  next = tabs[i - 1] || tabs[tabs.length - 1];
      if (next) {
        next.focus();
        next.click();
      }
    });
  });

  window.addEventListener('popstate', function () {
    var key = new URL(window.location.href).searchParams.get('tab') || 'products';
    setActiveTab(key);
  });

  var sortSelect = toolbar.querySelector('[data-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      window.location.href = url.toString();
    });
  }

  // .collection-mobile-bar (which holds this button) is a sibling of
  // #collection-toolbar in the markup, not a descendant, so it must be
  // queried at the document level rather than scoped to `toolbar`.
  var mobileSortBtn = document.querySelector('[data-mobile-sort-toggle]');

  if (mobileSortBtn) {
    var sortSheet = null;
    var scrollY = 0;

    function buildSortSheet() {
      var sheet = document.createElement('div');
      sheet.className = 'mobile-sort-sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-label', 'Sort options');

      var inner = '<div class="mobile-sort-sheet__header">';
      inner += '<span class="mobile-sort-sheet__title">Sort by</span>';
      inner += '<button type="button" class="mobile-sort-sheet__close-btn" aria-label="Close sort options" data-sort-close>&times;</button>';
      inner += '</div>';
      inner += '<div class="mobile-sort-sheet__inner">';
      inner += '<ul class="mobile-sort-sheet__list">';

      if (sortSelect) {
        Array.from(sortSelect.options).forEach(function (opt) {
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

      var closeBtn = sheet.querySelector('[data-sort-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          closeSortSheet();
          mobileSortBtn.focus();
        });
      }

      document.body.appendChild(sheet);
      return sheet;
    }

    // iOS Safari ignores `overflow: hidden` on the body while a touch
    // scroll is in progress underneath a fixed-position sheet, so the
    // page behind the sheet can still scroll. Pinning the body with
    // position: fixed (and restoring the scroll offset on close) is
    // the reliable cross-browser fix for that background-scroll leak.
    function lockBodyScroll() {
      scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = -scrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
    }

    function unlockBodyScroll() {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      window.scrollTo(0, scrollY);
    }

    function openSortSheet() {
      if (!sortSheet) sortSheet = buildSortSheet();
      sortSheet.getBoundingClientRect();
      sortSheet.classList.add('is-open');
      mobileSortBtn.setAttribute('aria-expanded', 'true');
      lockBodyScroll();
      if (window.CollectionBackdrop) window.CollectionBackdrop.open(closeSortSheet);
      document.addEventListener('keydown', onSortSheetKeydown);
    }

    function closeSortSheet() {
      if (!sortSheet) return;
      sortSheet.classList.remove('is-open');
      mobileSortBtn.setAttribute('aria-expanded', 'false');
      unlockBodyScroll();
      if (window.CollectionBackdrop) window.CollectionBackdrop.close(closeSortSheet);
      document.removeEventListener('keydown', onSortSheetKeydown);
    }

    function onSortSheetKeydown(e) {
      if (e.key === 'Escape') {
        closeSortSheet();
        mobileSortBtn.focus();
      }
    }

    mobileSortBtn.addEventListener('click', function () {
      sortSheet && sortSheet.classList.contains('is-open')
        ? closeSortSheet()
        : openSortSheet();
    });
  }

})();