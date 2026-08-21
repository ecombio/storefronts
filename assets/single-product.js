/* ─────────────────────────────────────────
   single-product.js
   Scope: [data-single-product]

   SELF-CONTAINED: everything this section needs at runtime — variant
   resolution, price formatting, gallery swap, quantity stepper, AJAX
   add-to-cart, optional zoom — lives in this one file. It does not
   read from or depend on product-card.js / product-gallery.js /
   product-row's inline onclick handlers; those belong to a different
   DOM shape (merchandising cards) and are never assumed to be present
   on the product page.

   Multiple instances of this section on one page are supported —
   everything is scoped per [data-single-product] root rather than
   using page-global ids, the same reason main-article.js scopes its
   TOC lookups to a single #toc rather than assuming only one exists.
───────────────────────────────────────── */

(function () {
  'use strict';

  function formatMoney(cents, format) {
    // Shopify money is stored in cents. If the section printed a
    // format string (from routes/money_format), respect it; otherwise
    // fall back to a plain two-decimal dollar amount so the UI never
    // breaks even if that setting wasn't passed through.
    var amount = (cents / 100).toFixed(2);
    if (!format) return '$' + amount;
    return format.replace(/\{\{\s*amount\s*\}\}/, amount);
  }

  function initSingleProduct(root) {
    var dataEl = root.querySelector('[data-product-json]');
    if (!dataEl) return;

    var product;
    try {
      product = JSON.parse(dataEl.textContent);
    } catch (err) {
      console.error('single-product.js: could not parse product JSON', err);
      return;
    }

    var moneyFormat   = root.getAttribute('data-money-format') || null;
    var form          = root.querySelector('[data-product-form]');
    var variantInput  = root.querySelector('[data-variant-id-input]');
    var atcBtn        = root.querySelector('[data-atc-btn]');
    var atcLabel      = atcBtn ? atcBtn.querySelector('[data-atc-label]') : null;
    var atcLabelDefault = atcLabel ? atcLabel.textContent : 'Add to cart';
    var formError     = root.querySelector('[data-form-error]');
    var priceEl       = root.querySelector('[data-price]');
    var comparePriceEl = root.querySelector('[data-compare-price]');
    var saveBadgeEl   = root.querySelector('[data-save-badge]');
    var stockEl       = root.querySelector('[data-stock-message]');
    var skuEl         = root.querySelector('[data-sku]');
    var qtyInput      = root.querySelector('[data-qty-input]');
    var optionInputs  = root.querySelectorAll('[data-option-input]');
    var mainImageZone = root.querySelector('[data-main-image-zone]');
    var mainImage     = root.querySelector('[data-main-image]');
    var thumbButtons  = root.querySelectorAll('[data-thumb-btn]');

    var lowStockThreshold = parseInt(root.getAttribute('data-low-stock-threshold') || '0', 10);

    /* ── Variant resolution ── */
    function getSelectedOptions() {
      var selected = [];
      optionInputs.forEach(function (group) {
        // group is a <fieldset>; find the checked radio within it, or
        // the value of a <select> if that markup variant is in use.
        var checked = group.querySelector('input:checked');
        if (checked) {
          selected[parseInt(group.getAttribute('data-option-position'), 10) - 1] = checked.value;
        } else {
          var select = group.querySelector('select');
          if (select) {
            selected[parseInt(group.getAttribute('data-option-position'), 10) - 1] = select.value;
          }
        }
      });
      return selected;
    }

    function findVariant(selectedOptions) {
      for (var i = 0; i < product.variants.length; i++) {
        var v = product.variants[i];
        var matches = true;
        for (var j = 0; j < selectedOptions.length; j++) {
          if (selectedOptions[j] !== undefined && v.options[j] !== selectedOptions[j]) {
            matches = false;
            break;
          }
        }
        if (matches) return v;
      }
      return null;
    }

    function updateSwatchAvailability(selectedOptions) {
      // For each option group, mark values that have no matching
      // available variant as unavailable — same idea as Shopify's
      // Dawn theme, done from scratch here since this file doesn't
      // depend on any shared helper.
      optionInputs.forEach(function (group) {
        var position = parseInt(group.getAttribute('data-option-position'), 10) - 1;
        var labels = group.querySelectorAll('[data-swatch-label]');
        labels.forEach(function (label) {
          var value = label.getAttribute('data-value');
          var testOptions = selectedOptions.slice();
          testOptions[position] = value;
          var testVariant = findVariant(testOptions);
          var unavailable = !testVariant || !testVariant.available;
          label.setAttribute('data-unavailable', unavailable ? 'true' : 'false');
        });
      });
    }

    function updateMediaForVariant(variant) {
      if (!variant || !variant.featured_media || !mainImage) return;
      var src = variant.featured_media.preview_image
        ? variant.featured_media.preview_image.src
        : null;
      if (!src) return;
      mainImage.src = src.replace(/(\.[a-zA-Z]{3,4})(\?|$)/, '_800x$1$2');
      mainImage.alt = variant.featured_media.alt || product.title;

      thumbButtons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-media-id') === String(variant.featured_media.id));
      });
    }

    function updateStockMessage(variant) {
      if (!stockEl) return;
      if (!variant) {
        stockEl.textContent = 'This combination is unavailable';
        stockEl.setAttribute('data-state', 'out');
        return;
      }
      if (!variant.available) {
        stockEl.textContent = 'Sold out';
        stockEl.setAttribute('data-state', 'out');
        return;
      }
      if (variant.inventory_management === 'shopify'
          && lowStockThreshold > 0
          && typeof variant.inventory_quantity === 'number'
          && variant.inventory_quantity > 0
          && variant.inventory_quantity <= lowStockThreshold) {
        stockEl.textContent = 'Only ' + variant.inventory_quantity + ' left in stock';
        stockEl.setAttribute('data-state', 'low');
        return;
      }
      stockEl.textContent = 'In stock';
      stockEl.setAttribute('data-state', 'in');
    }

    function updateForVariant(variant) {
      if (variantInput) variantInput.value = variant ? variant.id : '';

      if (priceEl) {
        priceEl.textContent = variant ? formatMoney(variant.price, moneyFormat) : '—';
        priceEl.classList.toggle('single-product__price--sale',
          !!(variant && variant.compare_at_price && variant.compare_at_price > variant.price));
      }

      if (comparePriceEl) {
        var onSale = !!(variant && variant.compare_at_price && variant.compare_at_price > variant.price);
        comparePriceEl.classList.toggle('is-hidden', !onSale);
        comparePriceEl.textContent = onSale ? formatMoney(variant.compare_at_price, moneyFormat) : '';
      }

      if (saveBadgeEl) {
        var showSave = !!(variant && variant.compare_at_price && variant.compare_at_price > variant.price);
        saveBadgeEl.classList.toggle('is-hidden', !showSave);
        if (showSave) {
          saveBadgeEl.textContent = 'Save ' + formatMoney(variant.compare_at_price - variant.price, moneyFormat);
        }
      }

      if (skuEl) {
        skuEl.textContent = variant && variant.sku ? 'SKU: ' + variant.sku : '';
      }

      updateMediaForVariant(variant);
      updateStockMessage(variant);

      if (atcBtn) {
        var canBuy = !!(variant && variant.available);
        atcBtn.disabled = !canBuy;
        if (atcLabel) atcLabel.textContent = canBuy ? atcLabelDefault : 'Sold out';
      }
    }

    function onOptionChange() {
      var selected = getSelectedOptions();
      updateSwatchAvailability(selected);
      var variant = findVariant(selected);
      updateForVariant(variant);
    }

    optionInputs.forEach(function (group) {
      group.addEventListener('change', onOptionChange);
    });

    // Run once on load so price/media/stock reflect whatever option
    // values are pre-selected in the markup (first available variant).
    if (optionInputs.length) onOptionChange();

    /* ── Thumbnails ── */
    thumbButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fullSrc = btn.getAttribute('data-full-src');
        var alt = btn.getAttribute('data-alt') || product.title;
        if (fullSrc && mainImage) {
          mainImage.src = fullSrc;
          mainImage.alt = alt;
        }
        thumbButtons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
    });

    /* ── Zoom (optional, opt-in via data-zoom-enabled on the zone) ── */
    if (mainImageZone && mainImageZone.hasAttribute('data-zoom-enabled')) {
      mainImageZone.addEventListener('click', function () {
        mainImageZone.classList.toggle('is-zoomed');
      });
    }

    /* ── Quantity stepper ── */
    var qtyDecrement = root.querySelector('[data-qty-decrement]');
    var qtyIncrement = root.querySelector('[data-qty-increment]');

    function clampQty(value) {
      var n = parseInt(value, 10);
      if (isNaN(n) || n < 1) n = 1;
      return n;
    }

    if (qtyInput) {
      qtyInput.addEventListener('change', function () {
        qtyInput.value = clampQty(qtyInput.value);
      });
    }

    if (qtyDecrement && qtyInput) {
      qtyDecrement.addEventListener('click', function () {
        qtyInput.value = clampQty(qtyInput.value) - 1 < 1 ? 1 : clampQty(qtyInput.value) - 1;
      });
    }

    if (qtyIncrement && qtyInput) {
      qtyIncrement.addEventListener('click', function () {
        qtyInput.value = clampQty(qtyInput.value) + 1;
      });
    }

    /* ── Add to cart (AJAX) ── */
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!atcBtn || atcBtn.disabled) return;

        if (formError) formError.textContent = '';
        atcBtn.classList.add('is-loading');
        atcBtn.classList.remove('is-added');

        var formData = new FormData(form);

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) throw data;
              return data;
            });
          })
          .then(function () {
            atcBtn.classList.remove('is-loading');
            atcBtn.classList.add('is-added');
            if (atcLabel) atcLabel.textContent = 'Added!';

            // Let the rest of the theme (cart drawer/count bubble) know
            // something was added, without this file needing to know
            // how those components are implemented.
            document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));

            setTimeout(function () {
              atcBtn.classList.remove('is-added');
              if (atcLabel) atcLabel.textContent = atcLabelDefault;
            }, 2000);
          })
          .catch(function (err) {
            atcBtn.classList.remove('is-loading');
            if (formError) {
              formError.textContent = (err && err.description) || 'Could not add this item to your cart.';
            }
          });
      });
    }
  }

  function init() {
    document.querySelectorAll('[data-single-product]').forEach(initSingleProduct);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
