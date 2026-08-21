/**
 * assets/sticky-atc.js
 *
 * Responsibilities
 * ────────────────
 * 1. Show / hide the bar via IntersectionObserver watching #BuyNow
 * 2. Keep variant selectors in sync with the main form (bidirectional)
 * 3. Mirror price, compare-price, image, and availability from variant:changed
 * 4. ATC fetch (reuses cart:updated event so cart-drawer opens normally)
 * 5. BIN form carries the correct variant id
 */

(function () {
  'use strict';

  const SUCCESS_MS = 1800;

  /* ── Money helper (mirrors product.js) ───────────────────── */
  function money(cents) {
    if (window.theme && window.theme.moneyFormat) {
      var amount = (cents / 100).toFixed(2);
      return window.theme.moneyFormat
        .replace('{{amount}}', amount)
        .replace('{{ amount }}', amount);
    }
    var currency = window.Shopify && window.Shopify.currency && window.Shopify.currency.active;
    var amt = (cents / 100).toFixed(2);
    return currency ? amt + '\u00a0' + currency : '$' + amt;
  }

  /* ── Variant lookup (mirrors product.js) ─────────────────── */
  function findVariant(variants, selectedOptions) {
    return variants.find(function (v) {
      return v.options.every(function (opt, i) {
        return opt === selectedOptions[i];
      });
    }) || null;
  }

  /* ── Boot ────────────────────────────────────────────────── */
  function init() {
    var bar         = document.getElementById('StickyAtc');
    var atcAnchor   = document.getElementById('AddToCart');  // observe the ATC button
    if (!bar || !atcAnchor) return;

    var variants    = window.productVariants || [];
    var options     = window.productOptions  || [];

    /* elements inside the bar */
    var atcBtn      = document.getElementById('StickyAtcBtn');
    var binInput    = document.getElementById('StickyVariantId');
    var binBtn      = document.getElementById('StickyBuyNow');
    var priceEl     = document.getElementById('StickyAtcPriceCurrent');
    var cmpEl       = document.getElementById('StickyAtcPriceCompare');
    var imageEl     = document.getElementById('StickyAtcImage');

    /* option inputs inside the bar */
    var swatchInputs = bar.querySelectorAll('.sticky-atc__swatch-input');
    var radioInputs  = bar.querySelectorAll('.sticky-atc__radio');
    var allInputs    = Array.prototype.slice.call(swatchInputs)
                       .concat(Array.prototype.slice.call(radioInputs));

    /* label value spans */
    var labelMap = {};
    options.forEach(function (name) {
      var key = 'StickySelected' + name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      var el  = document.getElementById(key);
      if (el) labelMap[name] = el;
    });

    /* ── 1. Visibility via IntersectionObserver ───────────── */
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          bar.classList.remove('is-visible');
          bar.setAttribute('aria-hidden', 'true');
        } else {
          bar.classList.add('is-visible');
          bar.setAttribute('aria-hidden', 'false');
        }
      });
    }, { threshold: 0 });

    observer.observe(atcAnchor);

    /* ── 2. Read selected options from the BAR's inputs ─────── */
    function selectedOptions() {
      return options.map(function (name) {
        if (name === 'Color') {
          var checked = bar.querySelector('.sticky-atc__swatch-input:checked');
          return checked ? checked.value : null;
        }
        var checked = bar.querySelector(
          '.sticky-atc__radio[name="sticky-' + CSS.escape(name) + '"]:checked'
        );
        return checked ? checked.value : null;
      });
    }

    /* ── 3. Apply a variant to the bar ───────────────────── */
    function applyVariant(variant, updateMainForm) {
      /* hidden id for BIN */
      if (binInput) binInput.value = variant.id;

      /* price */
      if (priceEl) {
        priceEl.textContent = money(variant.price);
        var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
        priceEl.classList.toggle('sale-price', onSale);

        if (cmpEl) {
          if (onSale) {
            cmpEl.textContent    = money(variant.compare_at_price);
            cmpEl.style.display  = '';
          } else {
            cmpEl.style.display  = 'none';
          }
        }
      }

      /* image */
      if (imageEl && variant.featured_image) {
        imageEl.src = variant.featured_image.src
          ? variant.featured_image.src.replace(/(\.[^.?]+)(\?.*)?$/, '_96x$1')
          : imageEl.src;
        imageEl.alt = variant.featured_image.alt || imageEl.alt;
      }

      /* availability */
      setAtcState(variant.available ? 'available' : 'unavailable');

      /* sync label spans */
      options.forEach(function (name, i) {
        if (labelMap[name]) labelMap[name].textContent = variant.options[i] || '';
      });

      /* optionally push selection back to the main form */
      if (updateMainForm) {
        syncMainForm(variant);
      }
    }

    /* ── 4. Push sticky selection → main product form ──────── */
    function syncMainForm(variant) {
      /* update the main hidden variant input directly */
      var mainVariantInput = document.getElementById('ProductVariantId');
      if (mainVariantInput) mainVariantInput.value = variant.id;

      /* tick the right radio in the main form — visual sync only, no event */
      variant.options.forEach(function (value, i) {
        var optName = options[i];
        if (!optName) return;

        if (optName === 'Color') {
          var mainSwatch = document.querySelector(
            '.color-input[value="' + CSS.escape(value) + '"]'
          );
          if (mainSwatch) mainSwatch.checked = true;
        } else {
          var mainRadio = document.querySelector(
            '.variant-radio[name="' + CSS.escape(optName) + '"][value="' + CSS.escape(value) + '"]'
          );
          if (mainRadio) mainRadio.checked = true;
        }
      });

      /*
       * Dispatch variant:changed as the single source of truth.
       * product.js, the gallery, and anything else listening will all
       * update correctly without us needing to know their internals.
       * sticky-atc.js listens for this too, but applyVariant is called
       * with updateMainForm=false from that handler, so no loop occurs.
       */
      document.dispatchEvent(new CustomEvent('variant:changed', {
        bubbles: true,
        detail:  { variant: variant }
      }));
    }

    /* ── 5. ATC button state ──────────────────────────────── */
    function setAtcState(state) {
      if (!atcBtn) return;
      atcBtn.classList.remove('success');

      switch (state) {
        case 'available':
          atcBtn.disabled    = false;
          atcBtn.textContent = 'Add to Cart';
          if (binBtn) binBtn.disabled = false;
          break;
        case 'unavailable':
          atcBtn.disabled    = true;
          atcBtn.textContent = 'Sold Out';
          if (binBtn) binBtn.disabled = true;
          break;
        case 'loading':
          atcBtn.disabled    = true;
          atcBtn.textContent = 'Adding\u2026';
          break;
        case 'success':
          atcBtn.disabled    = false;
          atcBtn.classList.add('success');
          atcBtn.textContent = 'Added!';
          break;
        case 'error':
          atcBtn.disabled    = false;
          atcBtn.textContent = 'Try again';
          break;
      }
    }

    /* ── 6. ATC click ─────────────────────────────────────── */
    if (atcBtn) {
      atcBtn.addEventListener('click', function () {
        var varId = binInput ? parseInt(binInput.value, 10) : null;
        if (!varId) return;

        /* respect whatever quantity the user set in the main form */
        var qtyInput = document.getElementById('ProductQuantity');
        var qty      = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;

        setAtcState('loading');

        fetch('/cart/add.js', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body:    JSON.stringify({ id: varId, quantity: qty })
        })
        .then(function (res) {
          if (!res.ok) return res.json().then(function (d) { throw d; });
          return res.json();
        })
        .then(function (item) {
          setAtcState('success');

          /*
           * /cart/add.js only returns the single line item that was just
           * added — it does NOT include the cart's total item_count. But
           * header.js's cart-badge listener (and cart-drawer.js's own
           * cartChange()) both expect cart:updated's detail to carry
           * { itemCount }. Without it, header.js's count === null guard
           * bails and the header badge never updates after a sticky ATC.
           * Fetch the real cart total before dispatching so both listeners
           * get a usable count. This also lets cart-drawer.js's cart:open
           * handler skip its own fallback fetch, since itemCount is now
           * provided directly.
           */
          fetch('/cart.js')
            .then(function (res) { return res.json(); })
            .then(function (cart) {
              document.dispatchEvent(new CustomEvent('cart:updated', {
                bubbles: true,
                detail:  { item: item, itemCount: cart.item_count }
              }));
              document.dispatchEvent(new CustomEvent('cart:open', {
                bubbles: true,
                detail:  { itemCount: cart.item_count }
              }));
            })
            .catch(function (err) {
              console.error('[sticky-atc] cart totals fetch failed', err);
              /* Still open the drawer / notify listeners — cart-drawer.js's
                 own cart:open fallback will fetch /cart.js itself, but
                 header.js has no such fallback, so the header badge just
                 won't update on this rare failure path. */
              document.dispatchEvent(new CustomEvent('cart:updated', {
                bubbles: true,
                detail:  { item: item }
              }));
              document.dispatchEvent(new CustomEvent('cart:open', { bubbles: true }));
            });

          setTimeout(function () { setAtcState('available'); }, SUCCESS_MS);
        })
        .catch(function (err) {
          console.error('[sticky-atc] ATC error', err);
          setAtcState('error');
          setTimeout(function () { setAtcState('available'); }, SUCCESS_MS);
        });
      });
    }

    /* ── 7. Sticky variant inputs → resolve + apply ──────── */
    allInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        var sel     = selectedOptions();
        var variant = findVariant(variants, sel);

        /* update label for this option */
        var optName = this.dataset.optionName;
        if (optName && labelMap[optName]) {
          labelMap[optName].textContent = this.value;
        }

        if (variant) {
          applyVariant(variant, true);
        } else {
          setAtcState('unavailable');
        }
      });
    });

    /* ── 8. Listen for variant:changed from the MAIN form ─── */
    /*    Keeps the sticky bar in sync when user picks on the main form */
    document.addEventListener('variant:changed', function (e) {
      var variant = e.detail && e.detail.variant;
      if (!variant) return;

      /* tick sticky inputs to match */
      variant.options.forEach(function (value, i) {
        var optName = options[i];
        if (!optName) return;

        if (optName === 'Color') {
          var swatch = bar.querySelector(
            '.sticky-atc__swatch-input[value="' + CSS.escape(value) + '"]'
          );
          if (swatch) swatch.checked = true;
        } else {
          var radio = bar.querySelector(
            '.sticky-atc__radio[name="sticky-' + CSS.escape(optName) + '"][value="' + CSS.escape(value) + '"]'
          );
          if (radio) radio.checked = true;
        }
      });

      /* apply without syncing back (avoid loop) */
      applyVariant(variant, false);
    });
  }

  /* ── DOMContentLoaded guard ──────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (e.target.querySelector('#StickyAtc')) init();
  });

})();