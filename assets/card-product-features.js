/* ============================================================
   card-product-features.js
   Add to Cart · Wishlist · Compare · Quick View
   ============================================================ */

(function () {
  'use strict';

  function qs(sel, root)  { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

  /* ──────────────────────────────────────────────────────────
     ADD TO CART
  ────────────────────────────────────────────────────────── */
  function initAddToCart() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-atc-btn]');
      if (!btn || btn.disabled) return;

      var variantId = btn.getAttribute('data-variant-id');
      if (!variantId) return;

      var label = btn.querySelector('.card-product__atc-label');
      var originalHTML = btn.innerHTML;

      btn.classList.add('is-loading');
      if (label) label.textContent = 'Adding…';

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      })
        .then(function (res) { if (!res.ok) throw new Error('Cart error'); return res.json(); })
        .then(function () {
          if (label) label.textContent = 'Added!';
          btn.classList.remove('is-loading');
          document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
          document.dispatchEvent(new CustomEvent('cart:open',    { bubbles: true }));
          setTimeout(function () { btn.innerHTML = originalHTML; }, 1800);
        })
        .catch(function () {
          btn.classList.remove('is-loading');
          if (label) label.textContent = 'Try again';
          setTimeout(function () { btn.innerHTML = originalHTML; }, 2000);
        });
    });
  }

  /* ──────────────────────────────────────────────────────────
     WISHLIST
     Stores: [{ id: "123", handle: "my-product" }, …]
     Backward-compat: bare string IDs from old format are kept
     as-is but won't resolve on the wishlist page until
     re-toggled.
  ────────────────────────────────────────────────────────── */
  var WISHLIST_KEY = 'shopify_wishlist';

  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; } catch (e) { return []; }
  }
  function saveWishlist(list) {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); } catch (e) { /* */ }
  }

  /* Normalise an entry — old format was a bare id string */
  function entryId(entry) {
    return typeof entry === 'object' ? entry.id : entry;
  }

  function syncWishlistButtons() {
    var list = getWishlist();
    var ids  = list.map(entryId);
    qsa('[data-wishlist-btn]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(ids.indexOf(btn.getAttribute('data-product-id')) !== -1));
    });
  }

  function initWishlist() {
    syncWishlistButtons();
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-wishlist-btn]');
      if (!btn) return;

      var id     = btn.getAttribute('data-product-id');
      /* Walk up to the card element to grab the handle */
      var card   = btn.closest('[data-product-handle]');
      var handle = (card && card.getAttribute('data-product-handle')) || '';

      var list = getWishlist();
      var ids  = list.map(entryId);
      var idx  = ids.indexOf(id);

      if (idx === -1) {
        list.push({ id: id, handle: handle });
      } else {
        list.splice(idx, 1);
      }

      saveWishlist(list);
      syncWishlistButtons();
      document.dispatchEvent(new CustomEvent('wishlist:toggle', {
        bubbles: true,
        detail: { productId: id, wishlisted: idx === -1 }
      }));
    });
  }

  /* ──────────────────────────────────────────────────────────
     COMPARE
     URL shape: /pages/compare?handles=handle-a,handle-b,...

     Product card attributes read:
       data-compare-checkbox   — the checkbox
       data-product-id         — numeric ID (used for dedup)
       data-product-handle     — slug (used in the URL)
       data-product-title      — display name
       data-product-image      — thumbnail URL
       data-product-price      — formatted price string

     Bar attributes:
       .compare-bar            — wrapper
       .compare-bar__counter   — "N" span
       .compare-bar__list      — <ul> for thumbnails
       [data-compare-submit]   — open/compare button
       [data-compare-clear]    — clear all buttons
       [data-compare-remove]   — per-item remove buttons (injected)
  ────────────────────────────────────────────────────────── */
  var COMPARE_MAX  = 5;
  var compareItems = []; // [{ id, handle, title, image, price }, …]

  function findCompareItem(id) {
    return compareItems.findIndex(function (x) { return x.id === id; });
  }

  function syncCompareCheckboxes() {
    qsa('[data-compare-checkbox]').forEach(function (cb) {
      cb.checked = findCompareItem(cb.getAttribute('data-product-id')) !== -1;
    });
  }

  function renderCompareBar() {
    var bar = qs('.compare-bar');
    if (!bar) return;

    var counterEl = qs('.compare-bar__counter', bar);
    if (counterEl) counterEl.textContent = compareItems.length;

    var list = qs('.compare-bar__list', bar);
    if (list) {
      list.innerHTML = '';
      compareItems.forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'compare-bar__item';
        li.innerHTML =
          '<img src="' + item.image + '" alt="' + item.title + '" width="48" height="48" style="border-radius:6px;object-fit:cover;">' +
          '<button class="compare-bar__item-remove" type="button" aria-label="Remove ' + item.title + ' from compare" data-compare-remove="' + item.id + '">&times;</button>';
        list.appendChild(li);
      });
      for (var i = compareItems.length; i < COMPARE_MAX; i++) {
        var li = document.createElement('li');
        li.className = 'compare-bar__item compare-bar__item-placeholder';
        li.setAttribute('aria-hidden', 'true');
        list.appendChild(li);
      }
    }

    var submitBtn = qs('[data-compare-submit]', bar);
    if (submitBtn) submitBtn.disabled = compareItems.length < 2;

    bar.classList.toggle('is-active', compareItems.length > 0);
  }

  function buildCompareUrl() {
    var handles = compareItems.map(function (x) { return x.handle; });
    return '/pages/compare?handles=' + handles.join(',');
  }

  function initCompare() {
    document.addEventListener('change', function (e) {
      var cb = e.target.closest('[data-compare-checkbox]');
      if (!cb) return;

      var id = cb.getAttribute('data-product-id');
      var idx = findCompareItem(id);

      if (cb.checked) {
        if (compareItems.length >= COMPARE_MAX) {
          cb.checked = false;
          var bar = qs('.compare-bar');
          if (bar) { bar.classList.add('is-limit'); setTimeout(function () { bar.classList.remove('is-limit'); }, 600); }
          return;
        }
        compareItems.push({
          id    : id,
          handle: cb.getAttribute('data-product-handle') || '',
          title : cb.getAttribute('data-product-title')  || '',
          image : cb.getAttribute('data-product-image')  || '',
          price : cb.getAttribute('data-product-price')  || ''
        });
      } else {
        if (idx !== -1) compareItems.splice(idx, 1);
      }

      syncCompareCheckboxes();
      renderCompareBar();
      document.dispatchEvent(new CustomEvent('compare:updated', { bubbles: true, detail: { items: compareItems } }));
    });

    document.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('[data-compare-remove]');
      if (!removeBtn) return;
      var idx = findCompareItem(removeBtn.getAttribute('data-compare-remove'));
      if (idx !== -1) compareItems.splice(idx, 1);
      syncCompareCheckboxes();
      renderCompareBar();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-compare-clear]')) return;
      compareItems = [];
      syncCompareCheckboxes();
      renderCompareBar();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-compare-submit]')) return;
      if (compareItems.length >= 2) window.location.href = buildCompareUrl();
    });

    renderCompareBar();
  }

  /* ──────────────────────────────────────────────────────────
     QUICK VIEW
  ────────────────────────────────────────────────────────── */
  function buildModal() {
    if (qs('#card-quickview-modal')) return;
    var modal = document.createElement('div');
    modal.id  = 'card-quickview-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Quick view');
    modal.className = 'quickview-modal';
    modal.innerHTML =
      '<div class="quickview-modal__backdrop"></div>' +
      '<div class="quickview-modal__panel">' +
        '<button class="quickview-modal__close" type="button" aria-label="Close quick view">&times;</button>' +
        '<div class="quickview-modal__body"></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelector('.quickview-modal__backdrop').addEventListener('click', closeModal);
    modal.querySelector('.quickview-modal__close').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  function openModal(html) {
    var modal = qs('#card-quickview-modal');
    if (!modal) return;
    modal.querySelector('.quickview-modal__body').innerHTML = html;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.quickview-modal__close').focus();
  }

  function closeModal() {
    var modal = qs('#card-quickview-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function initQuickView() {
    buildModal();
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-quickview-btn]');
      if (!btn) return;
      var handle = btn.getAttribute('data-product-handle');
      if (!handle) return;
      var body = qs('#card-quickview-modal .quickview-modal__body');
      body.innerHTML = '<div class="quickview-modal__loading" aria-live="polite">Loading…</div>';
      openModal(body.innerHTML);

      fetch('/products/' + handle + '?view=quickview&sections=product-quickview', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        /* ✅ FIX: was res.text() — Shopify sections API returns JSON, not raw HTML */
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (!data || !data['product-quickview']) {
            body.innerHTML =
              '<div style="padding:2rem;text-align:center">' +
                '<p style="margin:0 0 1rem;font-size:0.9rem;color:#555">Preview unavailable.</p>' +
                '<a href="/products/' + handle + '" style="display:inline-flex;text-decoration:none">View product</a>' +
              '</div>';
            return;
          }
          /* ✅ FIX: extract the rendered HTML from the sections wrapper key */
          body.innerHTML = data['product-quickview'];
        })
        .catch(function () {
          body.innerHTML = '<p style="padding:2rem;color:#c0392b">Unable to load preview.</p>';
        });
    });
  }
/* ──────────────────────────────────────────────────────────
     QUICK VIEW UI (Global Event Delegation)
  ────────────────────────────────────────────────────────── */
  function initQuickViewUI() {
    document.addEventListener('click', function (e) {
      // 1. Thumbnail Image Swapping
      var thumb = e.target.closest('[data-qv-thumb]');
      if (thumb) {
        var wrap = thumb.closest('.qv');
        var mainImg = wrap.querySelector('#qv-main-img');
        if (mainImg) {
          mainImg.src = thumb.getAttribute('data-src');
          mainImg.alt = thumb.getAttribute('data-alt');
        }
        wrap.querySelectorAll('[data-qv-thumb]').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
        return;
      }

      // 2. Variant Swatch / Button Logic
      var optBtn = e.target.closest('[data-qv-swatch], [data-qv-option-btn]');
      if (optBtn) {
        var wrap = optBtn.closest('.qv');
        var productId = wrap.getAttribute('data-product-id');
        var value = optBtn.getAttribute('data-value');

        /* Update visual active state on the clicked group */
        var group = optBtn.closest('[role="radiogroup"]');
        if (group) {
          group.querySelectorAll('[data-qv-swatch], [data-qv-option-btn]').forEach(function (b) {
            b.classList.remove('is-active');
            b.setAttribute('aria-checked', 'false');
          });
          optBtn.classList.add('is-active');
          optBtn.setAttribute('aria-checked', 'true');
        }

        /* Update the text label */
        var optionName = optBtn.closest('.qv__option');
        var selectedLabel = optionName && optionName.querySelector('[data-qv-option-selected]');
        if (selectedLabel) selectedLabel.textContent = value;

        /* Find the correct variant from the JSON block */
        var jsonEl = document.getElementById('qv-variant-data-' + productId);
        if (!jsonEl) return;
        var variants = JSON.parse(jsonEl.textContent);

        /* Gather all currently active option values in this modal */
        var activeBtns = wrap.querySelectorAll('[data-qv-swatch].is-active, [data-qv-option-btn].is-active');
        var currentOptions = [];
        activeBtns.forEach(function (b) {
          var idx = parseInt(b.getAttribute('data-option-index'), 10);
          currentOptions[idx] = b.getAttribute('data-value');
        });

        /* Find matching variant */
        var variant = variants.find(function (v) {
          return v.options.every(function (opt, i) { return opt === currentOptions[i]; });
        });

        if (variant) updateQuickViewVariant(wrap, variant);
      }
    });
  }

  function updateQuickViewVariant(wrap, variant) {
    /* Update hidden select */
    var select = wrap.querySelector('[data-qv-variant-select]');
    if (select) select.value = variant.id;

    /* Update ATC button */
    var atcBtn = wrap.querySelector('.qv__atc');
    if (atcBtn) {
      atcBtn.setAttribute('data-variant-id', variant.id);
      var label = atcBtn.querySelector('[data-atc-label]');
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

    /* Update Price */
    var priceEl = wrap.querySelector('.qv__price');
    if (priceEl) {
      var moneyFormatter = function (cents) {
        return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
      };
      var html = '';
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        html += '<s class="qv__price-compare">' + moneyFormatter(variant.compare_at_price) + '</s>';
        html += '<span class="qv__price-sale-badge">Save ' + moneyFormatter(variant.compare_at_price - variant.price) + '</span>';
      }
      html += '<span class="qv__price-current">' + moneyFormatter(variant.price) + '</span>';
      priceEl.innerHTML = html;
    }
  }

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    initAddToCart();
    initWishlist();
    initCompare();
    initQuickView();
    initQuickViewUI();
  });

})();