window.BlogMenuItem = (function () {
  'use strict';

  function positionDropdown(btn, dropdown) {
    var rect = btn.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 6) + 'px';
    dropdown.style.left = rect.left + 'px';
  }

  function closeAllDropdowns(nav, exceptItem) {
    nav.querySelectorAll('[data-blog-menu-dropdown-toggle]').forEach(function (btn) {
      var item = btn.closest('.blog-menu__item--list');
      if (item === exceptItem) return;
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function init(nav) {
    var openItem = null;

    nav.querySelectorAll('[data-blog-menu-dropdown-toggle]').forEach(function (btn) {
      var item = btn.closest('.blog-menu__item--list');
      var dropdown = item.querySelector('.blog-menu__dropdown');

      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        var willOpen = !item.classList.contains('is-open');
        closeAllDropdowns(nav, willOpen ? item : null);
        item.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
        openItem = willOpen ? item : null;

        if (willOpen && window.innerWidth > 749) {
          positionDropdown(btn, dropdown);
        }
      });

      btn.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          item.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          openItem = null;
          btn.focus();
        }
      });
    });

    document.addEventListener('click', function (event) {
      if (!openItem) return;
      var dropdown = openItem.querySelector('.blog-menu__dropdown');
      var toggle = openItem.querySelector('[data-blog-menu-dropdown-toggle]');
      var clickedInside = (dropdown && dropdown.contains(event.target)) ||
                           (toggle && toggle.contains(event.target));
      if (!clickedInside) {
        closeAllDropdowns(nav, null);
        openItem = null;
      }
    });

    window.addEventListener('scroll', function () {
      if (openItem) {
        closeAllDropdowns(nav, null);
        openItem = null;
      }
    }, { passive: true, capture: true });

    window.addEventListener('resize', function () {
      if (openItem) {
        closeAllDropdowns(nav, null);
        openItem = null;
      }
    });
  }

  return { init: init };
})();