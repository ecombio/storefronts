/* assets/search-filter.js */

(function () {
  'use strict';

  if (window.__searchFilterLoaded) return;
  window.__searchFilterLoaded = true;

  var filterPanel = document.getElementById('search-filter');
  if (!filterPanel) return;

  var filterToggles = document.querySelectorAll('[data-filter-toggle]');
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
      filterPanel.classList.contains('is-open') ? closeFilter() : openFilter();
    });
  });

  var MOBILE_BREAKPOINT = 768;
  var wasMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  var resizeTimer = null;

  // The mobile off-canvas panel is only ever visually hidden via a
  // transform (translateX). A transformed fixed-position element still
  // occupies layout space and gets counted toward the page's scrollable
  // overflow, which causes a phantom horizontal scroll on mobile.
  // Actually remove it from layout (display:none via [hidden]) on load
  // so it can't add scroll width until it's opened.
  if (wasMobile && !filterPanel.classList.contains('is-open')) {
    filterPanel.setAttribute('hidden', '');
  }

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
  var filterRequestToken = 0;

  function getSectionId() {
    var host = document.querySelector('[data-section-id]');
    return host ? host.dataset.sectionId : null;
  }

  function buildFilterUrl() {
    var url = new URL(window.location.href);
    url.search = '';

    new FormData(filterForm).forEach(function (val, key) {
      if (val === '') return;
      url.searchParams.append(key, val);
    });

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

  function applyFiltersLive(pushHistory) {
    if (!filterForm) return;

    var displayUrl = buildFilterUrl();
    var sectionId = getSectionId();
    var resultsContainer = document.getElementById('search-results');

    // No known AJAX-updatable results container: fall back to a normal
    // page load rather than guessing at markup we haven't seen.
    if (!sectionId || !resultsContainer) {
      window.location.href = displayUrl.toString();
      return;
    }

    var fetchUrl = new URL(displayUrl.toString());
    fetchUrl.searchParams.set('section_id', sectionId);

    var thisRequest = ++filterRequestToken;
    filterForm.setAttribute('aria-busy', 'true');

    fetch(fetchUrl.toString())
      .then(function (res) {
        if (!res.ok) throw new Error('Filter request failed');
        return res.text();
      })
      .then(function (html) {
        if (thisRequest !== filterRequestToken) return;

        var doc = new DOMParser().parseFromString(html, 'text/html');

        var newResults = doc.getElementById('search-results');
        if (newResults && resultsContainer) {
          resultsContainer.replaceWith(newResults);
        }

        var newFilterForm = doc.getElementById('SearchFilterForm');
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
          document.getElementById('search-results').appendChild(newPagination);
        }

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
  initGroupAccordions(filterForm);

  if (filterForm) {
    filterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      applyFiltersLive(true);
    });
  }

  window.addEventListener('popstate', function () {
    applyFiltersLive(false);
  });

  window.SearchFilter = { close: closeFilter };

})();