/**
 * cart.js — Full cart page AJAX functionality
 *
 * Works alongside cart-drawer.js. Both files share the same Shopify
 * cart endpoints and the same header-badge selector.
 *
 * Configuration
 * ─────────────────────────────────────────────────────────────────
 * FREE_SHIPPING_THRESHOLD  Change to your store's floor (in cents).
 * RECOMMENDATIONS_LIMIT    Number of "You might also like" cards.
 * NOTE_DEBOUNCE_MS         How long to wait after typing before saving note.
 */

(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────────────────
  const FREE_SHIPPING_THRESHOLD = 50000; // $500.00 in cents — edit me
  const RECOMMENDATIONS_LIMIT   = 4;
  const NOTE_DEBOUNCE_MS        = 800;

  // ─── DOM ─────────────────────────────────────────────────────────────────
  const page            = document.querySelector('[data-cart-page]');
  const itemsContainer  = document.querySelector('[data-cart-items]');
  const subtotalEl      = document.querySelector('[data-cart-subtotal]');
  const totalEl         = document.querySelector('[data-cart-total]');
  const itemCountEls    = document.querySelectorAll('[data-cart-item-count], [data-cart-item-count-summary]');
  const shippingLabel   = document.querySelector('[data-cart-shipping-label]');
  const shippingFill    = document.querySelector('[data-cart-shipping-fill]');
  const recsSection     = document.querySelector('[data-cart-recommendations]');
  const recsList        = document.querySelector('[data-cart-recommendations-list]');
  const recTemplate     = document.getElementById('cart-rec-item-tpl');
  const noteToggle      = document.querySelector('[data-note-toggle]');
  const noteBody        = document.getElementById('cart-page-note');
  const noteInput       = document.querySelector('[data-note-input]');
  const noteStatus      = document.querySelector('[data-note-status]');

  // ─── State ───────────────────────────────────────────────────────────────
  let isUpdating        = false;
  let noteDebounceTimer = null;
  let lastFirstProductId = null;

  // ─────────────────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────────────────

  function init() {
    if (!page) return; // not on cart page

    bindItemControls();
    bindNoteToggle();
    bindNoteAutosave();

    // Fire off recommendations if there are items already on page load
    const firstItem = itemsContainer?.querySelector('[data-cart-item]');
    if (firstItem) {
      const variantId = firstItem.dataset.variantId;
      if (variantId) fetchProductIdThenRecommend(variantId);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delegated event binding for cart items
  // ─────────────────────────────────────────────────────────────────────────

  function bindItemControls() {
    if (!itemsContainer) return;

    itemsContainer.addEventListener('click', (e) => {
      if (e.target.closest('[data-qty-minus]')) {
        const item = e.target.closest('[data-cart-item]');
        adjustQty(item, -1);
      }
      if (e.target.closest('[data-qty-plus]')) {
        const item = e.target.closest('[data-cart-item]');
        adjustQty(item, +1);
      }
      if (e.target.closest('[data-remove-item]')) {
        const item = e.target.closest('[data-cart-item]');
        removeItem(item);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Quantity adjustment
  // ─────────────────────────────────────────────────────────────────────────

  async function adjustQty(itemEl, delta) {
    if (isUpdating || !itemEl) return;

    const line      = parseInt(itemEl.dataset.line, 10);
    const qtyEl     = itemEl.querySelector('[data-qty-value]');
    const currentQty = parseInt(qtyEl?.textContent || '1', 10);
    const newQty    = Math.max(0, currentQty + delta);

    // Optimistic UI: update qty text immediately
    if (qtyEl && newQty > 0) qtyEl.textContent = newQty;

    try {
      isUpdating = true;
      itemEl.classList.add('cart-page__item--loading');

      const cart = await fetchJSON('/cart/change.js', 'POST', { line, quantity: newQty });
      applyCartUpdate(cart);

    } catch (err) {
      console.error('[CartPage] qty update failed', err);
      // Revert optimistic UI on failure
      if (qtyEl) qtyEl.textContent = currentQty;
    } finally {
      isUpdating = false;
      itemEl.classList.remove('cart-page__item--loading');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Remove item
  // ─────────────────────────────────────────────────────────────────────────

  async function removeItem(itemEl) {
    if (isUpdating || !itemEl) return;

    const line = parseInt(itemEl.dataset.line, 10);

    try {
      isUpdating = true;
      itemEl.classList.add('cart-page__item--removing');

      await sleep(180); // let CSS transition play

      const cart = await fetchJSON('/cart/change.js', 'POST', { line, quantity: 0 });
      applyCartUpdate(cart);

    } catch (err) {
      console.error('[CartPage] remove failed', err);
      itemEl.classList.remove('cart-page__item--removing');
    } finally {
      isUpdating = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Apply a full cart update to the page
  // Reconciles the live DOM rather than doing a full re-render,
  // which preserves focus and avoids layout shift.
  // ─────────────────────────────────────────────────────────────────────────

  function applyCartUpdate(cart) {
    const items = cart.items;

    if (items.length === 0) {
      // Reload to show the Liquid-rendered empty state
      window.location.reload();
      return;
    }

    // Build a map of variantId → cart item for O(1) lookup
    const cartMap = {};
    items.forEach((item, i) => {
      cartMap[item.variant_id] = { ...item, line: i + 1 };
    });

    // Update each DOM row that still exists in the cart
    const domItems = Array.from(itemsContainer.querySelectorAll('[data-cart-item]'));
    const removedLines = new Set();

    domItems.forEach(el => {
      const variantId = parseInt(el.dataset.variantId, 10);
      const cartItem  = cartMap[variantId];

      if (!cartItem) {
        // This line was removed
        removedLines.add(el);
        el.classList.add('cart-page__item--removing');
      } else {
        // Update live values
        el.dataset.line = cartItem.line;

        const qtyEl       = el.querySelector('[data-qty-value]');
        const linePriceEl = el.querySelector('[data-line-price]');
        if (qtyEl)       qtyEl.textContent       = cartItem.quantity;
        if (linePriceEl) linePriceEl.textContent  = formatMoney(cartItem.line_price);
      }
    });

    // Remove dead rows after transition
    if (removedLines.size > 0) {
      sleep(200).then(() => removedLines.forEach(el => el.remove()));
    }

    // Update subtotal, total, shipping bar
    updateSummary(cart);
    updateShippingBar(cart.total_price);
    updateItemCounts(cart.item_count);
    syncHeaderBadge(cart.item_count);

    // Re-number data-line attributes so they stay sequential
    sleep(250).then(() => renumberLines());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Update summary sidebar values
  // ─────────────────────────────────────────────────────────────────────────

  function updateSummary(cart) {
    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    if (totalEl) {
      const currency = window.Shopify?.currency?.active || 'USD';
      totalEl.innerHTML = `${formatMoney(cart.total_price)} <small>${currency}</small>`;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shipping progress bar
  // ─────────────────────────────────────────────────────────────────────────

  function updateShippingBar(totalPrice) {
    if (!shippingFill || !shippingLabel) return;

    const pct = Math.min(100, Math.round((totalPrice / FREE_SHIPPING_THRESHOLD) * 100));
    shippingFill.style.width = pct + '%';

    if (totalPrice >= FREE_SHIPPING_THRESHOLD) {
      shippingLabel.textContent = "🎉 You're eligible for free express shipping!";
      shippingFill.classList.add('cart-page__shipping-fill--complete');
    } else {
      const remaining = formatMoney(FREE_SHIPPING_THRESHOLD - totalPrice);
      shippingLabel.textContent = `Spend ${remaining} more for free express shipping`;
      shippingFill.classList.remove('cart-page__shipping-fill--complete');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Item count labels (title + summary sidebar)
  // ─────────────────────────────────────────────────────────────────────────

  function updateItemCounts(count) {
    const label = count === 1 ? 'item' : 'items';
    itemCountEls.forEach(el => {
      el.textContent = `(${count} ${label})`;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Re-number data-line after removals so they match Shopify line indices
  // ─────────────────────────────────────────────────────────────────────────

  function renumberLines() {
    const rows = itemsContainer?.querySelectorAll('[data-cart-item]');
    rows?.forEach((el, i) => { el.dataset.line = i + 1; });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Header badge (shared with cart-drawer.js pattern)
  // ─────────────────────────────────────────────────────────────────────────

  function syncHeaderBadge(count) {
    document.querySelectorAll('[data-ecombio-cart-count]').forEach(el => {
      el.textContent = count;
      el.classList.toggle('ecombio-header__cart-badge--hidden', count === 0);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Order note — toggle + debounced autosave
  // ─────────────────────────────────────────────────────────────────────────

  function bindNoteToggle() {
    if (!noteToggle || !noteBody) return;

    noteToggle.addEventListener('click', () => {
      const isExpanded = noteToggle.getAttribute('aria-expanded') === 'true';
      noteToggle.setAttribute('aria-expanded', String(!isExpanded));
      noteBody.hidden = isExpanded;
      if (!isExpanded) noteInput?.focus();
    });
  }

  function bindNoteAutosave() {
    if (!noteInput) return;

    noteInput.addEventListener('input', () => {
      clearTimeout(noteDebounceTimer);
      if (noteStatus) noteStatus.textContent = '';

      noteDebounceTimer = setTimeout(async () => {
        try {
          await fetchJSON('/cart/update.js', 'POST', { note: noteInput.value });
          if (noteStatus) {
            noteStatus.textContent = 'Note saved.';
            setTimeout(() => { if (noteStatus) noteStatus.textContent = ''; }, 2000);
          }
        } catch {
          if (noteStatus) noteStatus.textContent = 'Could not save note — try again.';
        }
      }, NOTE_DEBOUNCE_MS);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Recommendations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * The recommendations API requires a product_id, not variant_id.
   * We do a lightweight fetch of the variant's product to get its id.
   */
  async function fetchProductIdThenRecommend(variantId) {
    try {
      const data = await fetchJSON(`/variants/${variantId}.js`);
      if (data?.product_id) loadRecommendations(data.product_id);
    } catch (err) {
      console.warn('[CartPage] could not resolve variant to product', err);
    }
  }

  async function loadRecommendations(productId) {
    if (productId === lastFirstProductId && recsList?.children.length > 0) return;
    lastFirstProductId = productId;

    try {
      const data = await fetchJSON(
        `/recommendations/products.json?product_id=${productId}&limit=${RECOMMENDATIONS_LIMIT}`
      );

      const products = data.products || [];
      if (!products.length || !recsSection || !recsList || !recTemplate) return;

      recsList.innerHTML = '';

      products.forEach(product => {
        const tpl  = recTemplate.content.cloneNode(true);
        const li   = tpl.querySelector('.cart-page__rec-item');

        li.querySelector('.cart-page__rec-link').href = product.url;

        const img = li.querySelector('.cart-page__rec-img');
        if (product.featured_image) {
          img.src = resizeImage(product.featured_image, 320);
          img.alt = product.title;
        }

        li.querySelector('.cart-page__rec-title').textContent = product.title;
        li.querySelector('.cart-page__rec-price').textContent = formatMoney(product.price_min);

        recsList.appendChild(tpl);
      });

      recsSection.hidden = false;

    } catch (err) {
      console.warn('[CartPage] recommendations failed', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Thin JSON fetch wrapper.
   * @param {string} url
   * @param {string} method
   * @param {Object|null} data
   */
  async function fetchJSON(url, method = 'GET', data = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
    };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`[CartPage] HTTP ${res.status} ${url}`);
    return res.json();
  }

  /**
   * Format cents as a locale-aware money string.
   * Falls back to simple division if Shopify's money_format is unavailable.
   * @param {number} cents
   */
  function formatMoney(cents) {
    return (cents / 100).toLocaleString('en-US', {
      style:                 'currency',
      currency:              window.Shopify?.currency?.active || 'USD',
      minimumFractionDigits: 2,
    });
  }

  /**
   * Append a Shopify CDN size suffix to an image URL.
   * @param {string} src
   * @param {number} width
   */
  function resizeImage(src, width) {
    if (!src) return '';
    return src.replace(/(\.[^.?]+)(\?.*)?$/, `_${width}x$1`);
  }

  /** Tiny sleep helper. */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Boot
  // ─────────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();