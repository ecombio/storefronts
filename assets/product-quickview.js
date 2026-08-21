/**
 * product-quickview.js
 * Owns the Quick View modal — shell, fetch, variant UI, focus management.
 *
 * Entry point: listens for 'quickview:open' fired by product-card.js.
 * Exit point:  fires 'quickview:closed' so other scripts can react.
 *
 * Depends on:
 *   window.EcombioCard.formatMoney  — shared currency formatter (product-card.js)
 *   sections/product-quickview.liquid — rendered via Shopify Sections API
 *
 * Data-attribute contract (all set in product-quickview.liquid):
 *   [data-qv-main-img]        primary image swapped by thumb clicks
 *   [data-qv-thumb]           thumbnail buttons
 *   [data-qv-swatch]          color option buttons
 *   [data-qv-option-btn]      non-color option buttons
 *   [data-qv-option-selected] live label showing chosen option value
 *   [data-qv-variant-select]  hidden <select> kept in sync with active variant
 *   [data-qv-price]           price container replaced on variant change
 *   [data-atc-btn]            ATC button (handled by product-card.js initAddToCart)
 *   [data-atc-label]          ATC button label span
 *
 * Fixes applied:
 *   [A] AbortController — cancels in-flight fetch on rapid open calls
 *   [B] formatMoney from window.EcombioCard — no duplicate implementation
 *   [C] focus returns to trigger element on close (WCAG 2.1 SC 2.4.3)
 *   [D] html.quickview-open class — does NOT clobber cart drawer scroll lock
 *   [E] readyState guard for deferred / async script loading
 *   [F] modal appended to document.body (not documentElement) — ensures correct
 *       stacking context inside the flex column body layout and z-index layering
 *       relative to sticky header (z-index: 200) and cart drawer
 */

(() => {
  'use strict';

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const emit = (name, detail = {}) =>
    document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

  // [B] Defer to product-card.js formatter; fall back gracefully if loaded alone
  function formatMoney(cents) {
    if (window.EcombioCard?.formatMoney) return window.EcombioCard.formatMoney(cents);
    const symbol = window.Shopify?.currency?.symbol ?? '$';
    return symbol + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  // ── Constants ────────────────────────────────────────────────────────────────
  const MODAL_ID    = 'product-quickview-modal';
  const SECTION_KEY = 'product-quickview';

  // ── State ────────────────────────────────────────────────────────────────────
  let lastTrigger = null;   // [C] element to return focus to on close
  let fetchAbort  = null;   // [A] AbortController for in-flight fetch

  // ══════════════════════════════════════════════════════════════════════════════
  // MODAL SHELL
  // Built once, reused for every quickview open.
  // ══════════════════════════════════════════════════════════════════════════════
  function buildModal() {
    if (qs(`#${MODAL_ID}`)) return;

    const modal = document.createElement('div');
    modal.id        = MODAL_ID;
    modal.className = 'quickview-modal';
    modal.setAttribute('role',       'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Quick view');
    modal.setAttribute('hidden',     '');

    modal.innerHTML = `
      <div class="qv-modal__backdrop" data-qv-close></div>
      <div class="qv-modal__panel">
        <button
          class="qv-modal__close"
          type="button"
          aria-label="Close quick view"
          data-qv-close
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.75"
               stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true" focusable="false">
            <line x1="18" y1="6"  x2="6"  y2="18"/>
            <line x1="6"  y1="6"  x2="18" y2="18"/>
          </svg>
        </button>
        <div class="qv-modal__body"></div>
      </div>`;

    // [F] Append to body, not documentElement — keeps the modal inside the
    //     flex-column stacking context and ensures z-index works correctly
    //     relative to the sticky header and cart drawer.
    document.body.appendChild(modal);
  }

  // ── Open ─────────────────────────────────────────────────────────────────────
  function openModal(html) {
    const modal = qs(`#${MODAL_ID}`);
    if (!modal) return;

    qs('.qv-modal__body', modal).innerHTML = html;
    modal.removeAttribute('hidden');

    // Trigger CSS transition on next paint
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
    });

    // [D] Class on <html> — does not touch body.style.overflow,
    //     so cart drawer's html.cart-drawer-open is unaffected
    document.documentElement.classList.add('quickview-open');

    // Focus the close button after transition settles
    // Note: can't use [data-qv-close] here — that also matches the backdrop div.
    // Target the button specifically so focus lands somewhere meaningful.
    setTimeout(() => {
      qs('.qv-modal__close', modal)?.focus();
    }, 80);
  }

  // ── Close ────────────────────────────────────────────────────────────────────
  function closeModal() {
    const modal = qs(`#${MODAL_ID}`);
    if (!modal || !modal.classList.contains('is-open')) return;

    modal.classList.remove('is-open');
    document.documentElement.classList.remove('quickview-open');

    // Wait for CSS transition before hiding
    modal.addEventListener('transitionend', () => {
      modal.setAttribute('hidden', '');
      qs('.qv-modal__body', modal).innerHTML = '';
    }, { once: true });

    // [C] Return focus to the card button that opened this modal
    if (lastTrigger) {
      lastTrigger.focus();
      lastTrigger = null;
    }

    emit('quickview:closed');
  }

  // ── Escape + focus trap ──────────────────────────────────────────────────────
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      const modal = qs(`#${MODAL_ID}`);
      if (!modal?.classList.contains('is-open')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = qsa(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          modal
        ).filter((el) => !el.closest('[aria-hidden="true"]'));

        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // FETCH
  // Listens for 'quickview:open' from product-card.js.
  // [A] Cancels any previous in-flight request before starting a new one.
  // ══════════════════════════════════════════════════════════════════════════════
  function initFetch() {
    document.addEventListener('quickview:open', (e) => {
      const { handle, trigger } = e.detail ?? {};
      if (!handle) return;

      // [C] Store trigger so focus can return on close
      lastTrigger = trigger ?? null;

      // [A] Cancel previous fetch if user clicked another card quickly
      if (fetchAbort) fetchAbort.abort();
      fetchAbort = new AbortController();

      // Show loading state immediately
      openModal(`
        <div class="qv-modal__loading" role="status" aria-live="polite">
          <span class="qv-modal__spinner" aria-hidden="true"></span>
          Loading…
        </div>`);

      fetch(`/products/${handle}?sections=${SECTION_KEY}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        signal:  fetchAbort.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.[SECTION_KEY]) {
            openModal(`
              <div class="qv-modal__error">
                <p>Preview unavailable.</p>
                <a href="/products/${handle}" class="qv-modal__fallback-link">
                  View product
                </a>
              </div>`);
            return;
          }
          openModal(data[SECTION_KEY]);

          // Re-trigger Judge.me hydration if present
          if (window.jdgm?.rerenderWidgets) {
            window.jdgm.rerenderWidgets();
          }
        })
        .catch((err) => {
          if (err.name === 'AbortError') return; // [A] Intentional abort — stay silent
          openModal('<p class="qv-modal__error">Unable to load preview.</p>');
        });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CLOSE TRIGGERS
  // Backdrop click, close button click (both use [data-qv-close]).
  // ══════════════════════════════════════════════════════════════════════════════
  function initClose() {
    document.body.addEventListener('click', (e) => {
      if (e.target.closest('[data-qv-close]')) closeModal();
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VARIANT UI
  // All interaction inside the rendered .qv component.
  // Single delegated listener — safe when modal body is replaced on each open.
  // ══════════════════════════════════════════════════════════════════════════════
  function initVariantUI() {
    document.body.addEventListener('click', (e) => {

      // ── Thumbnail swap ──────────────────────────────────────────────────────
      const thumb = e.target.closest('[data-qv-thumb]');
      if (thumb) {
        const wrap    = thumb.closest('.qv');
        if (!wrap) return;

        const mainImg = qs('[data-qv-main-img]', wrap);
        if (mainImg) {
          mainImg.style.opacity = '0';
          mainImg.src = thumb.getAttribute('data-src');
          mainImg.alt = thumb.getAttribute('data-alt') || '';
          mainImg.onload = () => { mainImg.style.opacity = '1'; };
        }

        qsa('[data-qv-thumb]', wrap).forEach((t) => {
          t.classList.remove('is-active');
          t.setAttribute('aria-pressed', 'false');
        });
        thumb.classList.add('is-active');
        thumb.setAttribute('aria-pressed', 'true');
        return;
      }

      // ── Option button / swatch ──────────────────────────────────────────────
      const optBtn = e.target.closest('[data-qv-swatch], [data-qv-option-btn]');
      if (!optBtn) return;

      const wrap = optBtn.closest('.qv');
      if (!wrap) return;

      // Update active state within this option's radiogroup
      const group = optBtn.closest('[role="radiogroup"]');
      if (group) {
        qsa('[data-qv-swatch], [data-qv-option-btn]', group).forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-checked', 'false');
        });
        optBtn.classList.add('is-active');
        optBtn.setAttribute('aria-checked', 'true');
      }

      // Update the live label ("Color: Midnight Blue")
      const optionRow     = optBtn.closest('.qv__option');
      const selectedLabel = optionRow && qs('[data-qv-option-selected]', optionRow);
      if (selectedLabel) selectedLabel.textContent = optBtn.getAttribute('data-value');

      // Build currentOptions array from all active buttons in this .qv
      const currentOptions = [];
      qsa('[data-qv-swatch].is-active, [data-qv-option-btn].is-active', wrap)
        .forEach((b) => {
          const idx = parseInt(b.getAttribute('data-option-index'), 10);
          currentOptions[idx] = b.getAttribute('data-value');
        });

      // Parse variant JSON island
      const productId = wrap.getAttribute('data-product-id');
      const jsonEl    = document.getElementById(`qv-variant-data-${productId}`);
      if (!jsonEl) return;

      let variants;
      try   { variants = JSON.parse(jsonEl.textContent); }
      catch { return; }

      // Find the matching variant
      const variant = variants.find((v) =>
        v.options.every((opt, i) => opt === currentOptions[i])
      );

      if (variant) updateVariant(wrap, variant);
    });
  }

  // ── Apply a matched variant to the UI ────────────────────────────────────────
  function updateVariant(wrap, variant) {
    // 1. Sync hidden select
    const select = qs('[data-qv-variant-select]', wrap);
    if (select) select.value = variant.id;

    // 2. Swap featured image if variant has one
    if (variant.featured_image) {
      const mainImg = qs('[data-qv-main-img]', wrap);
      if (mainImg) {
        mainImg.style.opacity = '0';
        mainImg.src = variant.featured_image.src;
        mainImg.alt = variant.featured_image.alt || '';
        mainImg.onload = () => { mainImg.style.opacity = '1'; };
      }
    }

    // 3. Update ATC button
    const atcBtn = qs('[data-atc-btn]', wrap);
    if (atcBtn) {
      atcBtn.setAttribute('data-variant-id', variant.id);
      const label = qs('[data-atc-label]', atcBtn);

      if (variant.available) {
        atcBtn.disabled = false;
        atcBtn.classList.remove('qv__atc--soldout');
        if (label) label.textContent = 'Add to cart';
      } else {
        atcBtn.disabled = true;
        atcBtn.classList.add('qv__atc--soldout');
        if (label) label.textContent = 'Sold out';
      }
    }

    // 4. [B] Update price using shared formatMoney
    const priceEl = qs('[data-qv-price]', wrap);
    if (priceEl) {
      let html = '';
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        html += `<span class="qv__price-current qv__price-current--sale">${formatMoney(variant.price)}</span>`;
        html += `<s class="qv__price-compare">${formatMoney(variant.compare_at_price)}</s>`;
        const savePct = Math.round(
          ((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100
        );
        html += `<span class="qv__price-save-badge">Save ${savePct}%</span>`;
      } else {
        html += `<span class="qv__price-current">${formatMoney(variant.price)}</span>`;
      }
      priceEl.innerHTML = html;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════════════════════
  window.EcombioQuickView = {
    open:  (handle, trigger) =>
      document.dispatchEvent(
        new CustomEvent('quickview:open', { bubbles: true, detail: { handle, trigger } })
      ),
    close: closeModal,
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // [E] INIT
  // ══════════════════════════════════════════════════════════════════════════════
  function init() {
    buildModal();
    initFetch();
    initClose();
    initKeyboard();
    initVariantUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();