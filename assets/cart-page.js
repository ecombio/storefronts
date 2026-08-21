/**
 * cart-page.js
 * Handles qty updates, item removal, and subtotal refresh on the full cart page.
 * Shares the cart:updated event contract with cart-drawer.js:
 *   dispatches 'cart:updated'  { detail: { itemCount } }
 *
 * Recommendations on this page are handled by the dedicated
 * cart-page-recommendations.js (NOT cart-recommendations.js, which is
 * drawer-only). This file dispatches 'cart:page:recs:init' once on load so
 * that script knows to fetch recs — no DOM monkey-patching needed, since
 * cart-page-recommendations.js reads its own config element natively.
 *
 * Load order in theme.liquid:
 *   <script src="{{ 'cart-drawer.js'                | asset_url }}" defer></script>
 *   <script src="{{ 'cart-page-recommendations.js'  | asset_url }}" defer></script>
 *   <script src="{{ 'cart-page.js'                  | asset_url }}" defer></script>
 */

(() => {
  'use strict';

  // ── Only run on the cart page ──────────────────────────────────────────────

  if (!document.querySelector('[data-ecombio-cart-page]')) return;

  // ── Selectors ──────────────────────────────────────────────────────────────

  const PAGE_SEL        = '[data-ecombio-cart-page]';
  const TABLE_SEL       = '[data-ecombio-cart-table]';
  const QTY_SEL         = '[data-ecombio-page-qty-change]';
  const REMOVE_SEL      = '[data-ecombio-page-remove-item]';
  const LOADING_SEL     = '[data-ecombio-page-loading]';
  const SUBTOTAL_SEL    = '[data-ecombio-cart-subtotal]';
  const COUNT_SEL       = '[data-ecombio-cart-count]';

  // ── State ──────────────────────────────────────────────────────────────────

  let changeAbort = null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getPage    = () => document.querySelector(PAGE_SEL);
  const getLoading = () => document.querySelector(LOADING_SEL);

  /**
   * Recommendations are handled entirely by cart-page-recommendations.js,
   * which reads #ecombio-cart-page-config directly. No proxy/monkey-patch
   * needed — see file header for why the old approach didn't work.
   */

  // ── Loading state ──────────────────────────────────────────────────────────

  function setLoading(on) {
    const overlay = getLoading();
    if (!overlay) return;

    if (on) {
      overlay.removeAttribute('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      getPage()?.querySelectorAll(`${QTY_SEL}, ${REMOVE_SEL}`)
               .forEach((btn) => btn.setAttribute('disabled', ''));
    } else {
      overlay.setAttribute('hidden', '');
      overlay.setAttribute('aria-hidden', 'true');
      getPage()?.querySelectorAll(`${QTY_SEL}[disabled], ${REMOVE_SEL}[disabled]`)
               .forEach((btn) => btn.removeAttribute('disabled'));
    }
  }

  // ── AJAX cart mutation ─────────────────────────────────────────────────────

  async function cartChange(key, quantity) {
    if (changeAbort) changeAbort.abort();
    changeAbort = new AbortController();
    setLoading(true);

    try {
      const res = await fetch('/cart/change.js', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: key, quantity }),
        signal:  changeAbort.signal,
      });
      if (!res.ok) throw new Error('Cart update failed');

      const cart = await res.json();
      await refreshTableHTML(cart);
      updateSummary(cart);
      updateCountBadges(cart.item_count);

      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: { itemCount: cart.item_count },
      }));

    } catch (err) {
      if (err.name !== 'AbortError') console.error('[EcombioCartPage] cartChange failed', err);
    } finally {
      setLoading(false);
    }
  }

  // ── Partial DOM refresh ────────────────────────────────────────────────────

  /**
   * Re-fetch the section HTML and swap only the table tbody and heading count.
   * The summary sidebar is updated from the cart JSON response directly to
   * avoid a second round-trip.
   */
  async function refreshTableHTML(cart) {
    try {
      const res = await fetch('/?section_id=cart', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        cache:   'no-store',
      });
      if (!res.ok) return;

      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');

      // Swap tbody rows
      const newTbody = doc.querySelector(`${TABLE_SEL} tbody`);
      const curTbody = document.querySelector(`${TABLE_SEL} tbody`);
      if (newTbody && curTbody) curTbody.innerHTML = newTbody.innerHTML;

      // If cart is now empty, swap the whole items column
      if (cart.item_count === 0) {
        const newInner = doc.querySelector('[data-ecombio-cart-page-items]');
        const curInner = document.querySelector('[data-ecombio-cart-page-items]');
        if (newInner && curInner) curInner.innerHTML = newInner.innerHTML;

        // Hide summary
        const summary = document.querySelector('[data-ecombio-cart-page-summary]');
        if (summary) summary.setAttribute('hidden', '');
      }
    } catch (err) {
      console.error('[EcombioCartPage] table refresh failed', err);
    }
  }

  // ── Summary update (no extra fetch) ───────────────────────────────────────

  function updateSummary(cart) {
    // Subtotal
    const subtotalEl = document.querySelector(SUBTOTAL_SEL);
    if (subtotalEl) {
      try {
        const currency = window.Shopify?.currency?.active ?? 'USD';
        subtotalEl.textContent = new Intl.NumberFormat(navigator.language, {
          style: 'currency', currency,
          minimumFractionDigits: 0, maximumFractionDigits: 2,
        }).format(cart.total_price / 100);
      } catch (_) {
        subtotalEl.textContent = `$${(cart.total_price / 100).toFixed(2)}`;
      }
    }
  }

  function updateCountBadges(itemCount) {
    document.querySelectorAll(COUNT_SEL).forEach((el) => {
      el.textContent = el.textContent.trim().startsWith('(')
        ? `(${itemCount})`
        : itemCount;
      el.setAttribute('aria-label', `${itemCount} item${itemCount !== 1 ? 's' : ''} in cart`);
    });
  }

  // ── Event delegation ───────────────────────────────────────────────────────

  document.body.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest(QTY_SEL);
    if (qtyBtn) {
      const key     = qtyBtn.dataset.key;
      const valueEl = document.querySelector(`[data-qty-value="${key}"]`);
      const current = valueEl ? parseInt(valueEl.textContent, 10) : 1;
      cartChange(key, Math.max(0, current + parseInt(qtyBtn.dataset.delta, 10)));
      return;
    }

    const removeBtn = e.target.closest(REMOVE_SEL);
    if (removeBtn) {
      const row = removeBtn.closest('[data-cart-item-key]');
      if (row) row.classList.add('is-removing');
      cartChange(removeBtn.dataset.key, 0);
    }
  });

  // cart-page-recommendations.js dispatches cart:rec:added after a rec ATC
  // succeeds. On the page we need to refresh the table and count badges.
  document.addEventListener('cart:rec:added', async () => {
    try {
      const cart = await (await fetch('/cart.js')).json();
      await refreshTableHTML(cart);
      updateSummary(cart);
      updateCountBadges(cart.item_count);
    } catch (err) {
      console.error('[EcombioCartPage] rec:added refresh failed', err);
    }
  });

  // ── Init ───────────────────────────────────────────────────────────────────

  // Trigger recs load — cart-page-recommendations.js listens for this.
  document.dispatchEvent(new CustomEvent('cart:page:recs:init'));

})();
