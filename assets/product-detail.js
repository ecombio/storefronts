/**
 * assets/product-detail.js
 *
 * Controller for snippets/product-detail.liquid ONLY.
 * (Moved out of main-product.js — every ID/class this file touches
 * lives inside the #ProductInfo markup in product-detail.liquid.)
 *
 * Responsibilities
 * ────────────────
 * 1. Variant resolution from color swatches + radio buttons
 * 2. Price / compare-price / sale-badge updates
 * 3. ATC button state (available / sold-out / loading / success)
 * 4. Buy-It-Now hidden-input sync
 * 5. Quantity stepper (+/− buttons)
 * 6. Featured-image hand-off to product-media.liquid via
 *    a custom `variant:changed` event (the gallery script listens for it)
 * 7. SKU update (optional — no-ops if element absent)
 * 8. Selected-value label updates (Color: Red, Size: M, etc.)
 * 9. Theme-editor re-init on shopify:section:load
 */

(function () {
  'use strict';

  /* ── Constants ────────────────────────────────────────────── */
  const FORM_ID      = 'ProductForm';
  const BUY_FORM_ID  = 'BuyNowForm';
  const PRICE_ID     = 'ProductPrice';
  const CMP_PRICE_ID = 'ProductComparePrice';
  const VARIANT_ID   = 'ProductVariantId';
  const QTY_ID       = 'ProductQuantity';
  const ATC_ID       = 'AddToCart';
  const BUY_ID       = 'BuyNow';
  const INFO_ID      = 'ProductInfo';

  const SUCCESS_MS   = 1800;
  const ERROR_MS     = 2200;

  /* ── Money helper ─────────────────────────────────────────── */
  function money(cents) {
    const amount = (cents / 100).toFixed(2);
    const currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active)
      ? window.Shopify.currency.active
      : null;
    // Respect storefront money_format if available
    if (window.theme && window.theme.moneyFormat) {
      return window.theme.moneyFormat.replace('{{amount}}', amount)
                                     .replace('{{ amount }}', amount);
    }
    return currency ? amount + '\u00a0' + currency : '$' + amount;
  }

  /* ── Variant matcher ──────────────────────────────────────── */
  function findVariant(variants, selectedOptions) {
    return variants.find(function (v) {
      return v.options.every(function (opt, i) {
        return opt === selectedOptions[i];
      });
    }) || null;
  }

  /* ── ProductForm class ────────────────────────────────────── */
  function ProductForm(container) {
    this.container  = container;
    this.variants   = window.productVariants  || [];
    this.options    = window.productOptions   || [];  // ['Color','Size',…]

    this.form       = document.getElementById(FORM_ID);
    this.buyForm    = document.getElementById(BUY_FORM_ID);
    this.priceEl    = document.getElementById(PRICE_ID);
    this.cmpEl      = document.getElementById(CMP_PRICE_ID);
    this.variantInput  = document.getElementById(VARIANT_ID);
    this.qtyInput      = document.getElementById(QTY_ID);
    this.atcBtn        = document.getElementById(ATC_ID);
    this.buyBtn        = document.getElementById(BUY_ID);
    this.badgeEl       = container.querySelector('.product-badge');
    this.skuEl         = container.querySelector('[data-sku]');

    // option radios (color inputs + variant-radio)
    this.colorInputs  = container.querySelectorAll('.color-input');
    this.variantRadios = container.querySelectorAll('.variant-radio');

    // selected-value label spans (e.g. id="SelectedColor")
    this._labelMap = {};
    this.options.forEach(function (name) {
      var key = 'Selected' + name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      var el  = document.getElementById(key);
      if (el) this._labelMap[name] = el;
    }, this);

    // quantity stepper buttons
    var minusBtn = container.querySelector('.quantity-button[name="minus"]');
    var plusBtn  = container.querySelector('.quantity-button[name="plus"]');
    if (minusBtn) minusBtn.addEventListener('click', this._stepQty.bind(this, -1));
    if (plusBtn)  plusBtn.addEventListener('click',  this._stepQty.bind(this,  1));
    if (this.qtyInput) {
      this.qtyInput.addEventListener('change', this._clampQty.bind(this));
    }

    // variant option change
    this.colorInputs.forEach(function (el) {
      el.addEventListener('change', this._onOptionChange.bind(this));
    }, this);
    this.variantRadios.forEach(function (el) {
      el.addEventListener('change', this._onOptionChange.bind(this));
    }, this);

    // ATC submit
    if (this.form) {
      this.form.addEventListener('submit', this._onAtcSubmit.bind(this));
    }
  }

  /* ── Read currently selected options ──────────────────────── */
  ProductForm.prototype._selectedOptions = function () {
    var self = this;
    return this.options.map(function (name) {
      // color
      if (name === 'Color') {
        var checked = self.container.querySelector('.color-input:checked');
        return checked ? checked.value : null;
      }
      // other options
      var checked = self.container.querySelector(
        '.variant-radio[name="' + CSS.escape(name) + '"]:checked'
      );
      return checked ? checked.value : null;
    });
  };

  /* ── Handle any option radio change ─────────────────────────*/
  ProductForm.prototype._onOptionChange = function (e) {
    var optionName = e.target.name;
    var optionVal  = e.target.value;

    // update label span
    if (this._labelMap[optionName]) {
      this._labelMap[optionName].textContent = optionVal;
    }

    var selectedOptions = this._selectedOptions();
    var variant = findVariant(this.variants, selectedOptions);

    if (variant) {
      this._applyVariant(variant);
    } else {
      // partial selection — disable ATC
      this._setAtcState('unavailable');
    }
  };

  /* ── Apply a resolved variant to the page ─────────────────── */
  ProductForm.prototype._applyVariant = function (variant) {
    // hidden inputs
    if (this.variantInput) this.variantInput.value = variant.id;

    // sync Buy-It-Now form hidden id
    if (this.buyForm) {
      var buyId = this.buyForm.querySelector('input[name="id"]');
      if (buyId) buyId.value = variant.id;
    }

    // price
    this._updatePrice(variant);

    // sale badge
    this._updateBadge(variant);

    // SKU
    if (this.skuEl) {
      this.skuEl.textContent = variant.sku || '';
    }

    // ATC / Buy state
    this._setAtcState(variant.available ? 'available' : 'unavailable');

    // quantity max
    if (this.qtyInput && variant.inventory_quantity != null) {
      this.qtyInput.max = variant.inventory_quantity > 0
        ? variant.inventory_quantity
        : 99;
    }

    // fire variant:changed so product-media gallery can switch image
    document.dispatchEvent(new CustomEvent('variant:changed', {
      bubbles: true,
      detail: { variant: variant }
    }));

    // update URL without reload
    if (window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({ variantId: variant.id }, '', url.toString());
    }
  };

  /* ── Price update ─────────────────────────────────────────── */
  ProductForm.prototype._updatePrice = function (variant) {
    if (!this.priceEl) return;

    var isOnSale = variant.compare_at_price && variant.compare_at_price > variant.price;

    this.priceEl.textContent = money(variant.price);
    this.priceEl.classList.toggle('sale-price', isOnSale);

    if (isOnSale) {
      if (!this.cmpEl) {
        // create compare-price span if it doesn't exist yet
        var span = document.createElement('span');
        span.id        = CMP_PRICE_ID;
        span.className = 'compare-price';
        this.priceEl.insertAdjacentElement('afterend', span);
        this.cmpEl = span;
      }
      this.cmpEl.textContent = money(variant.compare_at_price);
      this.cmpEl.style.display = '';
    } else if (this.cmpEl) {
      this.cmpEl.style.display = 'none';
    }
  };

  /* ── Sale badge ───────────────────────────────────────────── */
  ProductForm.prototype._updateBadge = function (variant) {
    if (!this.badgeEl) return;

    var isOnSale = variant.compare_at_price && variant.compare_at_price > variant.price;

    if (isOnSale) {
      var savings    = variant.compare_at_price - variant.price;
      var savingsPct = Math.round(savings * 100 / variant.compare_at_price);
      this.badgeEl.textContent  = 'Save\u00a0' + savingsPct + '%';
      this.badgeEl.style.display = '';
    } else {
      this.badgeEl.style.display = 'none';
    }
  };

  /* ── ATC button state machine ─────────────────────────────── */
  //  states: 'available' | 'unavailable' | 'loading' | 'success' | 'error'
  ProductForm.prototype._setAtcState = function (state) {
    var btn     = this.atcBtn;
    var buyBtn  = this.buyBtn;
    if (!btn) return;

    btn.classList.remove('success');

    switch (state) {
      case 'available':
        btn.disabled    = false;
        btn.textContent = 'Add To Cart';
        if (buyBtn) buyBtn.disabled = false;
        break;

      case 'unavailable':
        btn.disabled    = true;
        btn.textContent = 'Sold Out';
        if (buyBtn) buyBtn.disabled = true;
        break;

      case 'loading':
        btn.disabled    = true;
        btn.textContent = 'Adding\u2026';
        break;

      case 'success':
        btn.disabled    = false;
        btn.classList.add('success');
        btn.textContent = 'Added!';
        break;

      case 'error':
        btn.disabled    = false;
        btn.textContent = 'Try again';
        break;
    }
  };

  /* ── ATC submit (AJAX) ────────────────────────────────────── */
  ProductForm.prototype._onAtcSubmit = function (e) {
    e.preventDefault();

    var self    = this;
    var form    = this.form;
    var varId   = this.variantInput ? this.variantInput.value : null;
    var qty     = this.qtyInput     ? parseInt(this.qtyInput.value, 10) || 1 : 1;

    if (!varId) return;

    this._setAtcState('loading');

    fetch('/cart/add.js', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: parseInt(varId, 10), quantity: qty })
    })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (d) { throw d; });
      return res.json();
    })
    .then(function (item) {
      self._setAtcState('success');

      // Also fire Shopify's native event some themes rely on
      document.dispatchEvent(new CustomEvent('cart:item-added', {
        bubbles: true,
        detail: { product: item }
      }));

      // /cart/add.js only returns the added line item, not the cart's
      // total count — header-cart.js's badge sync needs itemCount, so
      // fetch the current cart before announcing cart:updated.
      fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
        .then(function (res) { return res.json(); })
        .then(function (cart) {
          document.dispatchEvent(new CustomEvent('cart:updated', {
            bubbles: true,
            detail: { itemCount: cart.item_count, item: item, cart: cart }
          }));

          // Open the drawer with the fresh count already known, so
          // cart-drawer.js doesn't need its own fallback fetch.
          document.dispatchEvent(new CustomEvent('cart:open', {
            bubbles: true,
            detail: { itemCount: cart.item_count }
          }));
        })
        .catch(function () {
          // Cart count fetch failed — still announce the add so the
          // drawer can open, just without a reliable count. cart-drawer.js
          // will fetch its own count in this case.
          document.dispatchEvent(new CustomEvent('cart:updated', {
            bubbles: true,
            detail: { item: item }
          }));
          document.dispatchEvent(new CustomEvent('cart:open', { bubbles: true }));
        });

      setTimeout(function () {
        self._setAtcState('available');
      }, SUCCESS_MS);
    })
    .catch(function (err) {
      console.error('[product-detail.js] Cart add error:', err);
      self._setAtcState('error');
      setTimeout(function () {
        self._setAtcState('available');
      }, ERROR_MS);
    });
  };

  /* ── Quantity stepper ─────────────────────────────────────── */
  ProductForm.prototype._stepQty = function (delta) {
    if (!this.qtyInput) return;
    var current = parseInt(this.qtyInput.value, 10) || 1;
    var min     = parseInt(this.qtyInput.min,   10) || 1;
    var max     = parseInt(this.qtyInput.max,   10) || 9999;
    var next    = Math.min(max, Math.max(min, current + delta));
    this.qtyInput.value = next;
  };

  ProductForm.prototype._clampQty = function () {
    if (!this.qtyInput) return;
    var val = parseInt(this.qtyInput.value, 10);
    var min = parseInt(this.qtyInput.min,  10) || 1;
    if (!val || val < min) this.qtyInput.value = min;
  };

  /* ── Boot ─────────────────────────────────────────────────── */
  function init() {
    var container = document.getElementById(INFO_ID);
    if (!container) return;
    new ProductForm(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Theme editor support
  document.addEventListener('shopify:section:load', function (e) {
    if (e.target.querySelector('#' + INFO_ID)) init();
  });

})();