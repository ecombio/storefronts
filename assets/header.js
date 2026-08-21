/* assets/header.js
   Behavior for sections/header.liquid: sticky header height sync +
   scroll-based autohide, the desktop menu-bar scroll-fade, and the mobile
   nav drawer (open/close + submenu toggles).
   Self-contained: loaded by sections/header.liquid itself.

   Stacking with an announcement bar: both this header and
   sections/announcement-bar.liquid (when sticky) share one contract —
   [data-sticky-fixed="true"] marks an element as part of the fixed stack,
   and [data-autohide-class] names the class that element uses to hide
   itself. Anything with that attribute rendered BEFORE this header in the
   DOM (i.e. the announcement bar, per config/header-group.json) is treated
   as sitting above it: its live height offsets this header's `top` (via
   --main-header-stack-offset, consumed in header.liquid's inline style and
   header.css's autohide transform) and is folded into the shared spacer
   and autohide timing below. This header is assumed to always be the
   BOTTOM of the stack — it doesn't compute an offset for anything below
   itself, because nothing else in this theme renders after it.
*/

/* ---------------------------------------------------------------------
   Sticky header height sync
--------------------------------------------------------------------- */
(function () {
  'use strict';

  var header = document.querySelector('[data-sticky-fixed="true"]#site-header');
  if (!header) return;

  var spacer = document.getElementById('site-header-sticky-spacer');

  var allSticky = Array.prototype.slice.call(document.querySelectorAll('[data-sticky-fixed="true"]'));
  var headerIndex = allSticky.indexOf(header);
  var aboveHeader = headerIndex > 0 ? allSticky.slice(0, headerIndex) : [];

  var sync = function () {
    var aboveHeight = aboveHeader.reduce(function (sum, el) { return sum + el.offsetHeight; }, 0);
    var full = aboveHeight + header.offsetHeight;

    var hidden = header.classList.contains('site-header--autohide-hidden');
    var offset = hidden ? 0 : full;

    document.documentElement.style.setProperty('--main-header-stack-offset', aboveHeight + 'px');
    document.documentElement.style.setProperty('--main-header-bottom', offset + 'px');
    if (spacer) spacer.style.height = full + 'px';
  };

  sync();
  window.addEventListener('resize', sync);

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(sync);
    ro.observe(header);
    aboveHeader.forEach(function (el) { ro.observe(el); });
  }

  window.__mainHeaderSync = sync;
})();

/* ---------------------------------------------------------------------
   Scroll-based autohide
--------------------------------------------------------------------- */
(function () {
  'use strict';

  var header = document.querySelector('[data-sticky-fixed="true"]#site-header');
  if (!header || header.dataset.autohide !== 'true') return;

  var THRESHOLD = 8;
  var REVEAL_ZONE = 80;

  // Everything in the fixed stack hides/reveals together as one unit —
  // driven by this header's own enable_autohide setting. There's no
  // separate autohide toggle on the announcement bar: a stack that hides
  // only partway would look broken.
  var stackEls = Array.prototype.slice.call(document.querySelectorAll('[data-sticky-fixed="true"]'));

  var lastY = window.scrollY;
  var ticking = false;
  var isPaused = false;

  var syncBottomVar = function () {
    if (window.__mainHeaderSync) window.__mainHeaderSync();
  };

  var setHidden = function (hidden) {
    stackEls.forEach(function (el) {
      var cls = el.dataset.autohideClass;
      if (cls) el.classList.toggle(cls, hidden);
    });
    syncBottomVar();
  };

  header.addEventListener('mouseenter', function () { isPaused = true; });
  header.addEventListener('mouseleave', function () { isPaused = false; });

  header.addEventListener('focusin', function () { isPaused = true; });
  header.addEventListener('focusout', function () { isPaused = false; });

  /*
   * The predictive search dropdown (header-search.js) can open or close
   * without a matching focusin/focusout on the header — e.g. it renders
   * new panel content on every keystroke, or gets dismissed via Escape
   * or an outside click that never focused anything inside <header> in
   * the first place. Those don't naturally set/clear isPaused above, so
   * header-search.js dispatches these two events on the document to
   * cover that gap explicitly. While the panel is open we force the
   * whole stack visible and pause autohide, so the dropdown never ends up
   * anchored to a header that has since scrolled away underneath it.
   */
  document.addEventListener('header-search:open', function () {
    isPaused = true;
    if (header.classList.contains('site-header--autohide-hidden')) {
      setHidden(false);
    }
  });
  document.addEventListener('header-search:close', function () {
    isPaused = false;
  });

  header.addEventListener('transitionend', function (e) {
    if (e.propertyName === 'transform') syncBottomVar();
  });

  var onScroll = function () {
    var currentY = window.scrollY;
    var delta = currentY - lastY;

    if (currentY <= REVEAL_ZONE) {
      if (header.classList.contains('site-header--autohide-hidden')) {
        setHidden(false);
      }
      lastY = currentY;
    } else if (Math.abs(delta) > THRESHOLD) {
      if (delta > 0 && !isPaused) {
        if (!header.classList.contains('site-header--autohide-hidden')) {
          setHidden(true);
        }
      } else if (delta < 0) {
        if (header.classList.contains('site-header--autohide-hidden')) {
          setHidden(false);
        }
      }
      lastY = currentY;
    }

    ticking = false;
  };

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
})();

(function () {
  'use strict';

  var nav = document.getElementById('main-header-menu-bar');
  if (!nav) return;

  var container = nav.querySelector('.menu-bar__container');
  if (!container) return;

  var THRESHOLD = 4;

  var updateFades = function () {
    var scrollLeft = container.scrollLeft;
    var maxScroll = container.scrollWidth - container.clientWidth;

    nav.classList.toggle('has-scroll-left', scrollLeft > THRESHOLD);
    nav.classList.toggle('has-scroll-right', scrollLeft < maxScroll - THRESHOLD);
  };

  updateFades();
  container.addEventListener('scroll', updateFades, { passive: true });
  window.addEventListener('resize', updateFades);

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(updateFades);
    ro.observe(container);
  }
})();

(function () {
  'use strict';

  var trigger = document.getElementById('main-header-menu-trigger');
  var nav = document.getElementById('main-header-mobile-nav');
  if (!trigger || !nav) return;

  var closeEls = nav.querySelectorAll('[data-mobile-nav-close]');
  var toggles = nav.querySelectorAll('.ecombio-mobile-nav__toggle');

  var openDrawer = function () {
    nav.classList.add('is-open');
    nav.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
  };

  var closeDrawer = function () {
    nav.classList.remove('is-open');
    nav.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
  };

  trigger.addEventListener('click', function () {
    if (nav.classList.contains('is-open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  closeEls.forEach(function (el) {
    el.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      closeDrawer();
      trigger.focus();
    }
  });

  toggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var subId = btn.getAttribute('aria-controls');
      var sub = subId ? document.getElementById(subId) : null;
      if (!sub) return;

      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');

      if (expanded) {
        sub.setAttribute('hidden', '');
      } else {
        sub.removeAttribute('hidden');
      }
    });
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024 && nav.classList.contains('is-open')) {
      closeDrawer();
    }
  });
})();
