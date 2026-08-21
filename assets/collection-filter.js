(function () {
  'use strict';

  var filterPanel   = document.getElementById('collection-filter');
  var filterToggles = document.querySelectorAll('[data-filter-toggle]');

  if (!filterPanel) return;

  var headerCloseBtn = filterPanel.querySelector('[data-filter-close]');
  if (headerCloseBtn) {
    headerCloseBtn.addEventListener('click', closeFilter);
  }

  function openFilter() {
    filterPanel.removeAttribute('hidden');
    requestAnimationFrame(function () {
      filterPanel.classList.add('is-open');
    });
    filterToggles.forEach(function (t) {
      t.setAttribute('aria-expanded', 'true');
    });
    document.body.style.overflow = 'hidden';

    if (window.CollectionBackdrop) {
      window.CollectionBackdrop.open(closeFilter);
    }
  }

  function closeFilter() {
    filterPanel.classList.remove('is-open');
    filterToggles.forEach(function (t) {
      t.setAttribute('aria-expanded', 'false');
    });
    document.body.style.overflow = '';

    filterPanel.addEventListener('transitionend', function handler() {
      if (!filterPanel.classList.contains('is-open')) {
        filterPanel.setAttribute('hidden', '');
      }
      filterPanel.removeEventListener('transitionend', handler);
    });

    if (window.CollectionBackdrop) {
      window.CollectionBackdrop.close(closeFilter);
    }
  }

  filterToggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var isMobile = window.innerWidth <= 768;

      if (isMobile) {
        filterPanel.classList.contains('is-open') ? closeFilter() : openFilter();
      } else {
        var isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');

        if (isOpen) {
          filterPanel.setAttribute('hidden', '');
          document.querySelector('.collection-body')
            && document.querySelector('.collection-body')
               .classList.add('collection-body--filters-hidden');
        } else {
          filterPanel.removeAttribute('hidden');
          document.querySelector('.collection-body')
            && document.querySelector('.collection-body')
               .classList.remove('collection-body--filters-hidden');
        }
      }
    });
  });

  var MOBILE_BREAKPOINT = 768;
  var wasMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  var resizeTimer = null;

  function handleBreakpointCross() {
    var isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    if (isMobile === wasMobile) return;
    wasMobile = isMobile;

    filterPanel.classList.remove('is-open');
    filterToggles.forEach(function (t) {
      t.setAttribute('aria-expanded', 'false');
    });

    if (isMobile) {
      filterPanel.setAttribute('hidden', '');
    } else {
      filterPanel.removeAttribute('hidden');
      var body = document.querySelector('.collection-body');
      if (body) body.classList.remove('collection-body--filters-hidden');
      document.body.style.overflow = '';
    }
  }

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleBreakpointCross, 100);
  });

  function initGroupAccordions(scope) {
    var toggles = (scope || document).querySelectorAll('[data-group-toggle]');

    toggles.forEach(function (toggle) {
      if (toggle.dataset.groupBound === 'true') return;
      toggle.dataset.groupBound = 'true';

      toggle.addEventListener('click', function () {
        var isOpen = toggle.getAttribute('aria-expanded') === 'true';
        var bodyId = toggle.getAttribute('aria-controls');
        var body = bodyId ? document.getElementById(bodyId) : null;

        toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');

        if (body) {
          if (isOpen) {
            body.setAttribute('hidden', '');
          } else {
            body.removeAttribute('hidden');
          }
        }
      });
    });
  }

  function initActiveFiltersNav() {
    var bar = document.getElementById('collection-active-filters');
    if (!bar) return;

    var track = bar.querySelector('[data-active-filters-track]');
    var prev  = bar.querySelector('[data-active-filters-prev]');
    var next  = bar.querySelector('[data-active-filters-next]');
    if (!track) return;

    function updateNavState() {
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled =
        track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    }

    function scrollByAmount(dir) {
      track.scrollBy({ left: dir * (track.clientWidth * 0.8), behavior: 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { scrollByAmount(-1); });
    if (next) next.addEventListener('click', function () { scrollByAmount(1); });
    track.addEventListener('scroll', updateNavState);
    updateNavState();
  }

  var filterForm    = document.getElementById('FilterForm');
  var sectionRoot    = document.getElementById('main-collection');
  var sectionId      = sectionRoot ? sectionRoot.dataset.sectionId : null;
  var filterRequestToken = 0;

  function buildFilterUrl() {
    var currentUrl = new URL(window.location.href);
    var existingSortBy = currentUrl.searchParams.get('sort_by');

    var url = new URL(window.location.href);
    url.search = '';

    new FormData(filterForm).forEach(function (val, key) {
      if (val === '') return;
      url.searchParams.append(key, val);
    });

    if (existingSortBy && !url.searchParams.has('sort_by')) {
      url.searchParams.set('sort_by', existingSortBy);
    }

    var page = document.querySelector('[data-collection-page]');
    var activeTab = page ? page.dataset.activeTab : 'products';
    url.searchParams.set('tab', activeTab);

    return url;
  }

  function bindFilterFieldListeners() {
    if (!filterForm) return;
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

  function applyFiltersLive(pushHistory) {
    if (!filterForm) return;

    var displayUrl = buildFilterUrl();

    if (!sectionId) {
      window.location.href = displayUrl.toString();
      return;
    }

    var fetchUrl = new URL(displayUrl.toString());
    fetchUrl.searchParams.set('section_id', sectionId);

    var thisRequest = ++filterRequestToken;
    var grid = document.querySelector('.product-feed__grid');
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

        var newProductFeed = doc.getElementById('product-feed');
        var currentProductFeed = document.getElementById('product-feed');
        if (newProductFeed && currentProductFeed) {
          currentProductFeed.replaceWith(newProductFeed);
        }

        var newActiveFilters = doc.getElementById('collection-active-filters');
        var currentActiveFilters = document.getElementById('collection-active-filters');
        if (newActiveFilters && currentActiveFilters) {
          currentActiveFilters.replaceWith(newActiveFilters);
          initActiveFiltersNav();
        }

        var newFilterForm = doc.getElementById('FilterForm');
        if (newFilterForm) {
          filterForm.innerHTML = newFilterForm.innerHTML;
          bindFilterFieldListeners();
          initPriceFilters(filterForm);
          initGroupAccordions(filterForm);
        }

        var newPagination = doc.querySelector('.pagination');
        var currentPagination = document.querySelector('.pagination');
        if (currentPagination) currentPagination.remove();
        if (newPagination) {
          document.querySelector('.collection-feed__panel[data-panel="products"]')
            .appendChild(newPagination);
        }

        if (pushHistory) {
          history.pushState({ tab: displayUrl.searchParams.get('tab') }, '', displayUrl.toString());
        }

        filterForm.removeAttribute('aria-busy');
      })
      .catch(function () {
        window.location.href = displayUrl.toString();
      });
  }

  bindFilterFieldListeners();
  initPriceFilters(filterForm);
  initGroupAccordions(filterForm);
  initActiveFiltersNav();

  if (filterForm) {
    filterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      applyFiltersLive(true);
    });
  }

  window.addEventListener('popstate', function () {
    applyFiltersLive(false);
  });

  window.CollectionFilter = { close: closeFilter };

})();