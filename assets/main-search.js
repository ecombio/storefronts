/* assets/main-search.js */

(function () {
  if (window.__searchFilterLoaded) return;
  window.__searchFilterLoaded = true;

  var filterAside = document.getElementById('search-filter');
  if (!filterAside) return;

  var backdrop = document.querySelector('.search-mobile-backdrop');
  var filterToggles = document.querySelectorAll('[data-filter-toggle]');
  var filterClose = document.querySelector('[data-filter-close]');

  function isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function setToggleState(expanded) {
    filterToggles.forEach(function (btn) {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  function openFilters() {
    if (isMobileViewport()) {
      filterAside.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-visible');
    } else {
      filterAside.hidden = false;
    }
    setToggleState(true);
  }

  function closeFilters() {
    if (isMobileViewport()) {
      filterAside.classList.remove('is-open');
    } else {
      filterAside.hidden = true;
    }
    if (backdrop) backdrop.classList.remove('is-visible');
    setToggleState(false);
  }

  function isFiltersOpen() {
    return isMobileViewport()
      ? filterAside.classList.contains('is-open')
      : !filterAside.hidden;
  }

  filterToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (isFiltersOpen()) {
        closeFilters();
      } else {
        openFilters();
      }
    });
  });

  if (filterClose) filterClose.addEventListener('click', closeFilters);
  if (backdrop) backdrop.addEventListener('click', closeFilters);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeFilters();
  });

  window.addEventListener('resize', function () {
    if (backdrop && !isMobileViewport()) {
      backdrop.classList.remove('is-visible');
    }
  });

  function initPriceFilters(scope) {
    var wraps = (scope || document).querySelectorAll('[data-price-filter]');

    wraps.forEach(function (wrap) {
      var minInput    = wrap.querySelector('[data-price-input="min"]');
      var maxInput    = wrap.querySelector('[data-price-input="max"]');
      var minThumb    = wrap.querySelector('[data-range-thumb="min"]');
      var maxThumb    = wrap.querySelector('[data-range-thumb="max"]');
      var activeTrack = wrap.querySelector('[data-range-active]');
      var brackets    = wrap.querySelectorAll('[data-price-bracket]');

      if (!minInput || !maxInput || !minThumb || !maxThumb) return;

      var rangeMax = parseFloat(maxThumb.max) || 0;

      function paintTrack() {
        if (!activeTrack || !rangeMax) return;
        var lo = parseFloat(minThumb.value) || 0;
        var hi = parseFloat(maxThumb.value) || rangeMax;
        activeTrack.style.left  = (lo / rangeMax * 100) + '%';
        activeTrack.style.right = (100 - (hi / rangeMax * 100)) + '%';
      }

      function fieldsToSlider() {
        var lo = minInput.value === '' ? 0 : parseFloat(minInput.value);
        var hi = maxInput.value === '' ? rangeMax : parseFloat(maxInput.value);
        minThumb.value = lo;
        maxThumb.value = hi;
        paintTrack();
      }

      function sliderToFields(commit) {
        var lo = parseFloat(minThumb.value);
        var hi = parseFloat(maxThumb.value);

        if (lo > hi) {
          if (document.activeElement === maxThumb) { lo = hi; minThumb.value = lo; }
          else { hi = lo; maxThumb.value = hi; }
        }

        minInput.value = lo;
        maxInput.value = hi;
        paintTrack();

        if (commit) {
          minInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      minThumb.addEventListener('input', function () { sliderToFields(false); });
      maxThumb.addEventListener('input', function () { sliderToFields(false); });
      minThumb.addEventListener('change', function () { sliderToFields(true); });
      maxThumb.addEventListener('change', function () { sliderToFields(true); });

      [minThumb, maxThumb].forEach(function (thumb) {
        thumb.addEventListener('pointerdown', function () {
          minThumb.classList.remove('is-active-top');
          maxThumb.classList.remove('is-active-top');
          thumb.classList.add('is-active-top');
        });
      });

      minInput.addEventListener('input', fieldsToSlider);
      maxInput.addEventListener('input', fieldsToSlider);

      brackets.forEach(function (radio) {
        radio.addEventListener('change', function () {
          minInput.value = radio.dataset.min || 0;
          maxInput.value = radio.dataset.max || '';
          fieldsToSlider();
          minInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });

      paintTrack();
    });
  }

  var filterForm = document.getElementById('SearchFilterForm');
  if (!filterForm) return;

  var sectionRoot = document.getElementById('main-search');
  var sectionId = sectionRoot ? sectionRoot.dataset.sectionId : null;
  var filterRequestToken = 0;

  function buildFilterUrl() {
    var currentUrl = new URL(window.location.href);
    var existingSortBy = currentUrl.searchParams.get('sort_by');

    var url = new URL(window.location.href);
    url.search = '';

    new FormData(filterForm).forEach(function (val, key) {
      if (val === '' || key === 'price_bracket') return;
      url.searchParams.append(key, val);
    });

    if (existingSortBy && !url.searchParams.has('sort_by')) {
      url.searchParams.set('sort_by', existingSortBy);
    }

    return url;
  }

  function bindFilterFieldListeners() {
    filterForm.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
      input.addEventListener('change', function () {
        applyFiltersLive(true);
      });
    });
    filterForm.querySelectorAll('input[type="number"]').forEach(function (input) {
      input.addEventListener('change', function () {
        applyFiltersLive(true);
      });
    });
  }

  function syncActivePills(doc) {
    var toolbar = document.getElementById('search-toolbar');
    if (!toolbar) return;

    var newActive = doc.querySelector('.search-toolbar__active');
    var currentActive = toolbar.querySelector('.search-toolbar__active');

    if (newActive && currentActive) {
      currentActive.replaceWith(newActive);
    } else if (newActive && !currentActive) {
      var tabSwitcher = toolbar.querySelector('.tab-switcher');
      if (tabSwitcher) {
        tabSwitcher.insertAdjacentElement('afterend', newActive);
      } else {
        toolbar.appendChild(newActive);
      }
    } else if (!newActive && currentActive) {
      currentActive.remove();
    }
  }

  function applyFiltersLive(pushHistory) {
    var displayUrl = buildFilterUrl();

    if (!sectionId) {
      window.location.href = displayUrl.toString();
      return;
    }

    var fetchUrl = new URL(displayUrl.toString());
    fetchUrl.searchParams.set('section_id', sectionId);

    var thisRequest = ++filterRequestToken;
    var grid = document.getElementById('search-results-grid');
    filterForm.setAttribute('aria-busy', 'true');
    if (grid) grid.style.opacity = '0.5';

    fetch(fetchUrl.toString())
      .then(function (res) {
        if (!res.ok) throw new Error('Filter request failed');
        return res.text();
      })
      .then(function (html) {
        if (thisRequest !== filterRequestToken) return;

        var doc = new DOMParser().parseFromString(html, 'text/html');

        var newGrid = doc.getElementById('search-results-grid');
        var currentGrid = document.getElementById('search-results-grid');
        if (newGrid && currentGrid) {
          currentGrid.innerHTML = newGrid.innerHTML;
          var newStyle = newGrid.getAttribute('style');
          if (newStyle) currentGrid.setAttribute('style', newStyle);
        }

        var newFilterForm = doc.getElementById('SearchFilterForm');
        if (newFilterForm) {
          filterForm.innerHTML = newFilterForm.innerHTML;
          bindFilterFieldListeners();
          initPriceFilters(filterForm);
        }

        var productsPanel = document.getElementById('panel-products');
        var newPagination = doc.querySelector('#panel-products .pagination');
        var currentPagination = productsPanel ? productsPanel.querySelector('.pagination') : null;
        if (currentPagination) currentPagination.remove();
        if (newPagination && productsPanel) productsPanel.appendChild(newPagination);

        var newCount = doc.getElementById('search-result-count');
        var currentCount = document.getElementById('search-result-count');
        if (newCount && currentCount) currentCount.replaceWith(newCount);

        syncActivePills(doc);

        if (pushHistory) {
          history.pushState({}, '', displayUrl.toString());
        }

        filterForm.removeAttribute('aria-busy');
      })
      .catch(function () {
        window.location.href = displayUrl.toString();
      });
  }

  bindFilterFieldListeners();
  initPriceFilters(filterForm);

  filterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    applyFiltersLive(true);
  });

  window.addEventListener('popstate', function () {
    applyFiltersLive(false);
  });
})();

(function () {
  if (window.__searchToolbarLoaded) return;
  window.__searchToolbarLoaded = true;

  var sortSelect = document.querySelector('[data-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      window.location.href = url.toString();
    });
  }

  var searchFeed = document.getElementById('search-feed');
  document.querySelectorAll('.tab-switcher__tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (tab.classList.contains('tab-switcher__tab--active')) return;
      if (searchFeed) searchFeed.classList.add('is-loading');
    });
  });

  document.addEventListener('keydown', function (event) {
    var tab = event.target.closest('[role="tab"]');
    if (!tab) return;

    var tablist = tab.closest('[role="tablist"]');
    if (!tablist) return;

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var index = tabs.indexOf(tab);
    if (index === -1) return;

    var nextIndex = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    tabs.forEach(function (t, i) {
      t.tabIndex = i === nextIndex ? 0 : -1;
    });
    tabs[nextIndex].focus();
  });
})();