/* ============================================================
   product-reviews.js  (Yotpo version)
   Self-contained — pairs with sections/product-reviews.liquid
   and product-reviews.css only.

   This does not fetch or render review data itself — Yotpo's
   own loader script (installed once in theme.liquid) does
   that, by finding the .yotpo-widget-instance div this section
   renders and populating it.

   Unlike some review apps, Yotpo doesn't document a stable
   "done loading" class we can watch for. So instead this file
   watches for ANY child content appearing inside the widget
   div (MutationObserver on childList) and treats that as
   "loaded" — same fail-safe lesson as the Frequently Bought
   Together / Related Products sections: if nothing appears
   within a timeout (Yotpo app disabled, script blocked, or a
   genuinely empty widget), hide the ENTIRE section rather than
   leaving a stuck shimmer skeleton visible indefinitely.

   If Yotpo later documents/adds a stable ready class or fires
   a reliable custom event, swap the detection in markLoaded()
   below for that instead — it'll be more precise than "did any
   children show up."
   ============================================================ */

(function () {
  'use strict';

  var TIMEOUT_MS = 8000;

  function initSection(wrapperEl) {
    var widgetEl = wrapperEl.querySelector('.yotpo-widget-instance');
    var innerWrap = wrapperEl.querySelector('[data-revs-widget-wrapper]');

    if (!widgetEl || !innerWrap) {
      wrapperEl.hidden = true;
      return;
    }

    var settled = false;

    function markLoaded() {
      if (settled) return;
      settled = true;
      innerWrap.setAttribute('data-revs-loaded', 'true');
      wrapperEl.hidden = false;
      observer.disconnect();
      clearTimeout(timeoutId);
    }

    function markFailed() {
      if (settled) return;
      settled = true;
      wrapperEl.hidden = true;
      observer.disconnect();
    }

    if (widgetEl.childElementCount > 0) {
      markLoaded();
      return;
    }

    var observer = new MutationObserver(function () {
      if (widgetEl.childElementCount > 0) {
        markLoaded();
      }
    });

    observer.observe(widgetEl, { childList: true, subtree: true });

    var timeoutId = setTimeout(function () {
      markFailed();
    }, TIMEOUT_MS);
  }

  function init() {
    document.querySelectorAll('[data-revs-section]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target.querySelector('[data-revs-section]');
    if (section) initSection(section);
  });
})();