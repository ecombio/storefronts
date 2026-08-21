/**
 * header-cart.js
 * Cart icon behaviour for sections/main-header.liquid.
 *
 * Responsibilities:
 *   1. Click → dispatch 'cart:open' (cart-drawer.js opens the drawer)
 *   2. 'cart:updated' → update badge count + aria-label
 *   3. 'cart:drawer:open' / 'cart:drawer:close' → sync aria-expanded
 *
 * Dependencies:
 *   snippets/header-cart.liquid  — provides the cart trigger button
 *                                  ([data-ecombio-cart-trigger]) and
 *                                  the count badge ([data-ecombio-cart-count])
 *   assets/cart-drawer.js        — listens for 'cart:open',
 *                                  dispatches 'cart:drawer:open'
 *
 * FIXED (previously broken):
 *   - This module used to look up the trigger via
 *     document.getElementById('main-header-cart-toggle'). That ID does not
 *     exist anywhere in header-cart.liquid — the real button only carries
 *     data-ecombio-cart-trigger. init() was bailing out on line 2 every
 *     single time, so NONE of this module's listeners were ever attached.
 *   - COUNT_SEL was '[data-cart-count]'; the real badge markup uses
 *     '[data-ecombio-cart-count]'. Even if init() hadn't bailed, the
 *     badge would never have been found.
 *   - Badge format was hardcoded to "(N)"; header-cart.liquid renders
 *     {{ cart.item_count }} as a bare number, and header-cart.css's
 *     --hidden modifier only controls opacity, not text. Changed to a
 *     plain number so the JS doesn't fight the server-rendered format.
 *   - HIDDEN_CLS was 'main-header__cart-badge--hidden'; the real class in
 *     header-cart.liquid/.css is 'ecombio-header__cart-badge--hidden'.
 *
 * No global variables. Wraps everything in an IIFE to stay side-effect-free.
 */

(function () {
  'use strict';

  /* ── Selectors ──────────────────────────────────────────────────────────── */

  const TRIGGER_SEL = '[data-ecombio-cart-trigger]'; // SOURCE OF TRUTH — must match header-cart.liquid
  const COUNT_SEL   = '[data-ecombio-cart-count]';   // SOURCE OF TRUTH — must match header-cart.liquid
  const HIDDEN_CLS  = 'ecombio-header__cart-badge--hidden'; // SOURCE OF TRUTH — must match header-cart.css
  const POP_CLS     = 'main-header__cart-badge--pop';

  /* ── Element refs (resolved after DOMContentLoaded) ─────────────────────── */

  let cartBtn = null;

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  /**
   * Update every [data-ecombio-cart-count] badge in the document.
   * Renders as a plain number, matching header-cart.liquid's
   * {{ cart.item_count }} output — no parens.
   *
   * @param {number} count
   */
  function updateBadges(count) {
    document.querySelectorAll(COUNT_SEL).forEach(function (el) {
      el.textContent = String(count);
      el.classList.toggle(HIDDEN_CLS, count === 0);

      /* Pop micro-animation on increase */
      if (count > 0) {
        el.classList.remove(POP_CLS);
        /* Force reflow so the animation restarts even if already applied */
        void el.offsetWidth;
        el.classList.add(POP_CLS);
        el.addEventListener(
          'animationend',
          function () { el.classList.remove(POP_CLS); },
          { once: true }
        );
      }
    });
  }

  /**
   * Sync the button's aria-label to reflect the current count.
   *
   * @param {number} count
   */
  function updateAriaLabel(count) {
    if (!cartBtn) return;
    var noun = count === 1 ? 'item' : 'items';
    cartBtn.setAttribute('aria-label', 'Open cart, ' + count + ' ' + noun);
  }

  /* ── Init ───────────────────────────────────────────────────────────────── */

  function init() {
    cartBtn = document.querySelector(TRIGGER_SEL);
    if (!cartBtn) return; /* not on a page that includes the cart icon */

    /* 1. Click → open drawer via event (cart-drawer.js owns the open logic) */
    cartBtn.addEventListener('click', function () {
      document.dispatchEvent(new CustomEvent('cart:open', { bubbles: true }));
    });

    /* 2. Badge + label sync when cart contents change */
    document.addEventListener('cart:updated', function (e) {
      var count = (e.detail && e.detail.itemCount != null)
        ? e.detail.itemCount
        : (e.detail && e.detail.count != null)
          ? e.detail.count
          : null;

      if (count === null) return;
      updateBadges(count);
      updateAriaLabel(count);
    });

    /* 3. aria-expanded mirrors drawer open/close state */
    document.addEventListener('cart:drawer:open', function () {
      if (cartBtn) cartBtn.setAttribute('aria-expanded', 'true');
    });

    /* cart-drawer.js dispatches 'cart:drawer:close' on close — graceful
       no-op if the current cart-drawer version doesn't emit it yet. */
    document.addEventListener('cart:drawer:close', function () {
      if (cartBtn) cartBtn.setAttribute('aria-expanded', 'false');
    });

    /* Also reset aria-expanded if the user presses Escape or clicks outside
       (cart-drawer.js closes silently in those cases without an event). */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && cartBtn) {
        cartBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Run after DOM is ready. The script tag in main-header.liquid uses `defer`,
     so DOMContentLoaded has already fired in most browsers — guard either way. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());