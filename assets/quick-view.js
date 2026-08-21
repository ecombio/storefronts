/**
 * assets/quick-view.js
 * ====================
 * Quick View modal for snippets/product-card.liquid.
 *
 * Flow:
 *   1. product-card.js intercepts [data-quickview-btn] clicks and fires:
 *        document.dispatchEvent(new CustomEvent('quickview:open', { detail: { handle, trigger } }))
 *   2. This file listens for that event, fetches:
 *        /products/${handle}?sections=quick-view
 *      and injects the returned HTML into .quick-view-modal__body.
 *   3. sections/quick-view.liquid + snippets/quick-view-media.liquid
 *      + snippets/quick-view-detail.liquid produce that HTML on demand.
 *
 * Dependencies:
 *   • sections/quick-view.liquid  — modal shell rendered once in theme.liquid
 *   • product-card.js             — fires 'quickview:open'; owns [data-atc-btn]
 *
 * Loaded globally via theme.liquid.
 */

(() => {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const emit = (name, detail = {}) =>
    document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

  // ── Constants ─────────────────────────────────────────────────────────────
  const MODAL_ID    = 'quick-view-modal';
  const SECTION_KEY = 'quick-view';

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;

  const body = qs('.quick-view-modal__body', modal);

  // ── Money formatter ───────────────────────────────────────────────────────
  // Delegates to product-card.js's shared formatter when available;
  // falls back to a local implementation so quick-view.js is self-contained.
  function formatMoney(cents) {
    if (window.EcombioCard?.formatMoney) return window.EcombioCard.formatMoney(cents);
    const symbol = window.Shopify?.currency?.symbol ?? '$';
    return symbol + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODAL OPEN / CLOSE
  // ══════════════════════════════════════════════════════════════════════════

  // Built once, reused for every open.
  let modalBuilt = false;
  function ensureModal() {
    if (modalBuilt) return;
    modalBuilt = true;

    // Backdrop + close button both use [data-quick-view-close].
    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-quick-view-close]')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  }

  function openModal(html) {
    ensureModal();
    body.innerHTML = html;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    // [D] Uses classList on <html> so it does NOT clobber cart drawer scroll lock.
    document.documentElement.classList.add('quick-view-open');
    trapFocus(modal);
    qs('.quick-view-modal__close', modal)?.focus();
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('quick-view-open');
    releaseFocus();
    emit('quickview:closed');
    // Clear body after transition so it doesn't flash on next open.
    setTimeout(() => { body.innerHTML = ''; }, 300);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FETCH + INJECT
  // ══════════════════════════════════════════════════════════════════════════

  async function loadProduct(handle) {
    // Show loading state immediately.
    openModal(`
      <div class="quick-view-modal__loading" role="status" aria-live="polite">
        <span class="quick-view-modal__spinner" aria-hidden="true"></span>
      </div>
    `);

    try {
      const res = await fetch(
        `/products/${handle}?sections=${SECTION_KEY}`,
        { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const html = data[SECTION_KEY];

      if (!html) throw new Error(`Section "${SECTION_KEY}" missing from response`);

      // The sections API returns the full section HTML including the modal
      // shell wrapper. We only want the inner .quick-view-modal__body content,
      // so we parse it and extract just the .quick-view div.
      const doc     = new DOMParser().parseFromString(html, 'text/html');
      const content = qs('.quick-view', doc);

      if (!content) throw new Error('Could not find .quick-view in section response');

      body.innerHTML = '';
      body.appendChild(content);

      initVariantUI();

    } catch (err) {
      body.innerHTML = `
        <div class="quick-view-modal__error">
          <p>Sorry, couldn't load this product.</p>
          <a href="/products/${handle}" class="quick-view-modal__fallback-link">
            View full product page
          </a>
        </div>
      `;
      console.error('[quick-view]', err);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VARIANT UI
  // Reads the JSON island injected by quick-view-detail.liquid and wires up
  // swatch / pill buttons, image swaps, price updates, and ATC state.
  // ══════════════════════════════════════════════════════════════════════════

  function initVariantUI() {
    const wrap = qs('.quick-view', body);
    if (!wrap) return;

    const productId = wrap.dataset.productId;
    const jsonEl    = document.getElementById(`quick-view-variant-data-${productId}`);
    if (!jsonEl) return;

    let variants;
    try { variants = JSON.parse(jsonEl.textContent); }
    catch { return; }

    // ── Option button clicks (swatches + pills) ──────────────────────────
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-quick-view-swatch], [data-quick-view-option-btn]');
      if (!btn) return;

      const optionIndex = parseInt(btn.dataset.optionIndex, 10);
      const group = btn.closest('.quick-view__option');

      // Deactivate siblings in this option group.
      qsa('[data-quick-view-swatch], [data-quick-view-option-btn]', group)
        .forEach((b) => {
          b.classList.remove('is-active');
          b.setAttribute('aria-checked', 'false');
        });

      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');

      // Update the live selected-value label.
      const selectedLabel = qs('[data-quick-view-option-selected]', group);
      if (selectedLabel) selectedLabel.textContent = btn.dataset.value;

      // Rebuild currentOptions from all active buttons in this .quick-view.
      const currentOptions = qsa(
        '[data-quick-view-swatch].is-active, [data-quick-view-option-btn].is-active',
        wrap
      ).map((b) => b.dataset.value);

      const variant = variants.find((v) =>
        v.options.every((opt, i) => opt === currentOptions[i])
      ) || null;

      updateVariant(wrap, variant, productId);
    });

    // ── Thumbnail clicks ──────────────────────────────────────────────────
    wrap.addEventListener('click', (e) => {
      const thumb = e.target.closest('[data-quick-view-thumb]');
      if (!thumb) return;

      const mainImg = qs('[data-quick-view-main-img]', wrap);
      if (mainImg) {
        mainImg.src = thumb.dataset.src;
        mainImg.alt = thumb.dataset.alt;
      }

      qsa('[data-quick-view-thumb]', wrap)
        .forEach((t) => {
          t.classList.remove('is-active');
          t.setAttribute('aria-pressed', 'false');
        });
      thumb.classList.add('is-active');
      thumb.setAttribute('aria-pressed', 'true');
    });

    initDescriptionTabs();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESCRIPTION TABS
  // Reads the [data-qv-desc-wrap] markup injected by
  // snippets/quick-view-description.liquid and wires up tab switching
  // following the ARIA tabs pattern (roving tabindex + arrow-key nav).
  // ══════════════════════════════════════════════════════════════════════════

  function initDescriptionTabs() {
    const wrap = qs('[data-qv-desc-wrap]', body);
    if (!wrap || wrap.dataset.qvDescInit) return;
    wrap.dataset.qvDescInit = '1';

    const tabs   = qsa('[data-qv-tab]', wrap);
    const panels = qsa('[data-qv-tab-panel]', wrap);
    if (!tabs.length) return;

    // ── Activate tab at given index ────────────────────────────────────────
    function activateTab(index) {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.setAttribute('tabindex', active ? '0' : '-1');
      });

      panels.forEach((panel, i) => {
        const active = i === index;
        panel.classList.toggle('is-active', active);
        panel.setAttribute('aria-hidden', String(!active));
      });
    }

    // Ensure correct initial tabindex (Liquid sets is-active on first tab)
    tabs.forEach((tab, i) => {
      const isActive = tab.classList.contains('is-active');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // ── Click ──────────────────────────────────────────────────────────────
    wrap.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-qv-tab]');
      if (!tab) return;
      const index = tabs.indexOf(tab);
      if (index === -1) return;
      activateTab(index);
      tab.focus();
    });

    // ── Keyboard: roving tabindex (ARIA tabs pattern) ──────────────────────
    wrap.addEventListener('keydown', (e) => {
      const tab = e.target.closest('[data-qv-tab]');
      if (!tab) return;

      const current = tabs.indexOf(tab);
      let next = current;

      switch (e.key) {
        case 'ArrowRight': next = (current + 1) % tabs.length;                    break;
        case 'ArrowLeft':  next = (current - 1 + tabs.length) % tabs.length;      break;
        case 'Home':       next = 0;                                               break;
        case 'End':        next = tabs.length - 1;                                 break;
        default: return;
      }

      e.preventDefault();
      activateTab(next);
      tabs[next].focus();
    });
  }

  // ── Apply a matched variant to the UI ───────────────────────────────────
  function updateVariant(wrap, variant, productId) {
    if (!variant) return;

    // Sync hidden <select>.
    const select = qs('[data-quick-view-variant-select]', wrap);
    if (select) select.value = variant.id;

    // Swap main image if variant has a featured image.
    if (variant.featured_image) {
      const mainImg = qs('[data-quick-view-main-img]', wrap);
      if (mainImg) {
        mainImg.src = variant.featured_image.src;
        mainImg.alt = variant.featured_image.alt;
      }
    }

    // Update ATC button.
    const atcBtn = qs('[data-atc-btn]', wrap);
    if (atcBtn) {
      atcBtn.dataset.variantId = variant.id;
      atcBtn.disabled = !variant.available;
      atcBtn.classList.toggle('quick-view__atc--soldout', !variant.available);
      const label = qs('[data-atc-label]', atcBtn);
      if (label) label.textContent = variant.available ? 'Add to cart' : 'Sold out';
    }

    // Update price block.
    const priceEl = qs('[data-quick-view-price]', wrap);
    if (priceEl) {
      let html = '';
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        const savePct = Math.round(
          (variant.compare_at_price - variant.price) / variant.compare_at_price * 100
        );
        html += `<span class="quick-view__price-current quick-view__price-current--sale">${formatMoney(variant.price)}</span>`;
        html += `<s class="quick-view__price-compare">${formatMoney(variant.compare_at_price)}</s>`;
        html += `<span class="quick-view__price-save-badge">Save ${savePct}%</span>`;
      } else {
        html += `<span class="quick-view__price-current">${formatMoney(variant.price)}</span>`;
      }
      priceEl.innerHTML = html;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOCUS TRAP
  // Single implementation — replaces the two separate ones that existed in
  // quick-view.js and product-quickview.js.
  // ══════════════════════════════════════════════════════════════════════════

  let previousFocus = null;

  function trapFocus(el) {
    previousFocus = document.activeElement;

    const focusable = qsa(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      el
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    el._focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };

    el.addEventListener('keydown', el._focusTrapHandler);
  }

  function releaseFocus() {
    if (modal._focusTrapHandler) {
      modal.removeEventListener('keydown', modal._focusTrapHandler);
      modal._focusTrapHandler = null;
    }
    previousFocus?.focus();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // Exposed on window so other scripts can open the modal programmatically.
  // ══════════════════════════════════════════════════════════════════════════
  window.EcombioQuickView = {
    open: (handle, trigger) => {
      previousFocus = trigger || document.activeElement;
      loadProduct(handle);
    },
    close: closeModal,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ENTRY POINT
  // product-card.js fires 'quickview:open' with { handle, trigger }.
  // ══════════════════════════════════════════════════════════════════════════
  document.addEventListener('quickview:open', (e) => {
    const { handle, trigger } = e.detail || {};
    if (!handle) return;
    previousFocus = trigger || document.activeElement;
    loadProduct(handle);
  });

})();