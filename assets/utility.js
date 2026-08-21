(function () {
  'use strict';

  if (!window.__stickyStackInitialized) {
    window.__stickyStackInitialized = true;

    var getStickyEls = function () {
      return Array.prototype.slice.call(
        document.querySelectorAll('[data-sticky-fixed="true"]')
      );
    };

    var stackLayout = function () {
      var offset = 0;
      getStickyEls().forEach(function (el) {
        el.style.setProperty('--sticky-offset', offset + 'px');
        offset += el.offsetHeight;
      });
      document.documentElement.style.setProperty('--sticky-stack-height', offset + 'px');
    };

    stackLayout();
    window.addEventListener('resize', stackLayout);
    window.addEventListener('load', stackLayout);

    getStickyEls().forEach(function (el) {
      if ('ResizeObserver' in window) {
        new ResizeObserver(stackLayout).observe(el);
      }
    });

    document.addEventListener('shopify:section:load', stackLayout);
    document.addEventListener('shopify:section:unload', stackLayout);
    document.addEventListener('shopify:section:reorder', stackLayout);

    window.__stickyStackLayout = stackLayout;
  }
})();

(function () {
  'use strict';

  var IDS = {
    trigger:      'utility-bar-region-trigger',
    dropdown:     'utility-bar-region-dropdown',
    close:        'utility-bar-region-close',
    search:       'utility-bar-region-search',
    list:         'utility-bar-region-list',
    empty:        'utility-bar-region-empty',
    currencyForm: 'utility-bar-currency-form',
    localeForm:   'utility-bar-locale-form',
  };

  var FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  var trigger  = document.getElementById(IDS.trigger);
  var dropdown = document.getElementById(IDS.dropdown);
  var closeBtn = document.getElementById(IDS.close);
  var search   = document.getElementById(IDS.search);
  var list     = document.getElementById(IDS.list);
  var empty    = document.getElementById(IDS.empty);

  if (!trigger || !dropdown) return;

  document.body.appendChild(dropdown);

  function positionDropdown() {
    var rect  = trigger.getBoundingClientRect();
    var dropW = 320;
    var vw    = window.innerWidth;
    var left  = rect.right - dropW;

    if (left < 8)               left = 8;
    if (left + dropW > vw - 8)  left = vw - dropW - 8;

    dropdown.style.top  = (rect.bottom + 6) + 'px';
    dropdown.style.left = left + 'px';
  }

  function openPicker() {
    positionDropdown();
    dropdown.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.add('is-open');
    if (search) {
      search.focus();
    } else {
      var first = getFocusableEls()[0];
      if (first) first.focus();
    }
  }

  function closePicker() {
    dropdown.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.classList.remove('is-open');
    if (search) {
      search.value = '';
      filterList('');
    }
  }

  function getFocusableEls() {
    return Array.prototype.slice.call(
      dropdown.querySelectorAll(FOCUSABLE_SELECTORS)
    );
  }

  function trapFocus(e) {
    if (dropdown.hidden) return;
    var focusable = getFocusableEls();
    if (!focusable.length) return;

    var first = focusable[0];
    var last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function filterList(query) {
    if (!list) return;
    var items   = list.querySelectorAll('.region-dropdown__item');
    var q       = query.toLowerCase().trim();
    var visible = 0;

    items.forEach(function (item) {
      var name  = item.getAttribute('data-country') || '';
      var match = q.length === 0 || name.indexOf(q) !== -1;
      item.hidden = !match;
      if (match) visible++;
    });

    if (empty) {
      if (visible === 0 && q.length > 0) {
        empty.classList.add('region-dropdown__empty--visible');
      } else {
        empty.classList.remove('region-dropdown__empty--visible');
      }
    }
  }

  function attachFlagFallbacks(root) {
    var flags = root.querySelectorAll('.region-dropdown__flag, .utility-bar__flag');
    flags.forEach(function (img) {
      img.addEventListener('error', function () {
        this.style.display = 'none';
      });
    });
  }
  attachFlagFallbacks(document);

  function attachSelectAutoSubmit(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    var select = form.querySelector('select');
    if (select) {
      select.addEventListener('change', function () {
        form.submit();
      });
    }
  }
  attachSelectAutoSubmit(IDS.currencyForm);
  attachSelectAutoSubmit(IDS.localeForm);

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.hidden ? openPicker() : closePicker();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      closePicker();
      trigger.focus();
    });
  }

  document.addEventListener('click', function (e) {
    if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== trigger) {
      closePicker();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !dropdown.hidden) {
      closePicker();
      trigger.focus();
      return;
    }
    if (e.key === 'Tab' && !dropdown.hidden) {
      trapFocus(e);
    }
  });

  window.addEventListener('scroll', function () {
    if (!dropdown.hidden) positionDropdown();
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (!dropdown.hidden) positionDropdown();
  }, { passive: true });

  if (search) {
    search.addEventListener('input', function () {
      filterList(this.value);
    });
  }

  if (list) {
    list.addEventListener('click', function (e) {
      if (e.target.closest('.region-dropdown__country-btn')) closePicker();
    });
  }

})();