(function () {
  'use strict';

  function formatMoney(cents, format) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      try {
        return window.Shopify.formatMoney(cents, format);
      } catch (e) {
        /* fall through to basic formatter below */
      }
    }
    var amount = (cents / 100).toFixed(2);
    return '$' + amount;
  }

  function bindItems(section, itemsWrap, totalEl, addButton, buttonText, moneyFormat, labelTemplate) {
    var items = Array.prototype.slice.call(itemsWrap.querySelectorAll('[data-fbt-item]'));

    function getItemState(item) {
      var checkbox = item.querySelector('input[type="checkbox"]');
      var select = item.querySelector('[data-fbt-variant-select]');
      var checked = checkbox ? checkbox.checked : true;
      var variantId = select ? select.value : item.getAttribute('data-variant-id');
      var price = select
        ? parseInt(select.options[select.selectedIndex].getAttribute('data-price'), 10)
        : parseInt(item.getAttribute('data-price'), 10);

      return {
        checked: checked,
        variantId: variantId,
        price: isNaN(price) ? 0 : price
      };
    }

    function updateButtonLabel(count) {
      if (buttonText) {
        buttonText.textContent = labelTemplate.replace('[count]', count);
      }
    }

    function recalcTotal() {
      var total = 0;
      var count = 0;

      items.forEach(function (item) {
        var state = getItemState(item);
        if (state.checked && state.variantId) {
          total += state.price;
          count += 1;
        }
      });

      if (totalEl) {
        totalEl.textContent = formatMoney(total, moneyFormat);
      }

      updateButtonLabel(count);
      addButton.disabled = count === 0;
    }

    function updateItemPriceDisplay(item) {
      var priceWrap = item.querySelector('[data-fbt-price]');
      var state = getItemState(item);
      if (!priceWrap) return;

      var moneyStr = formatMoney(state.price, moneyFormat);
      var wholeLen = moneyStr.length - 3;
      var symbol = moneyStr.slice(0, 1);
      var whole = moneyStr.slice(1, wholeLen);
      var decimal = moneyStr.slice(wholeLen);

      priceWrap.innerHTML =
        '<span class="fbt-item-price__symbol">' + symbol + '</span>' +
        '<span class="fbt-item-price__whole">' + whole + '</span>' +
        '<span class="fbt-item-price__decimal">' + decimal + '</span>';
    }

    items.forEach(function (item) {
      var checkbox = item.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.disabled) {
        checkbox.addEventListener('change', function () {
          item.setAttribute('data-fbt-disabled', checkbox.checked ? 'false' : 'true');
          recalcTotal();
        });
      }

      var select = item.querySelector('[data-fbt-variant-select]');
      if (select) {
        select.addEventListener('change', function () {
          item.setAttribute('data-variant-id', select.value);
          item.setAttribute('data-price', select.options[select.selectedIndex].getAttribute('data-price'));
          updateItemPriceDisplay(item);
          recalcTotal();
        });
      }
    });

    recalcTotal();

    return items;
  }

  function initSection(section) {
    var itemsWrap = section.querySelector('[data-fbt-products]');
    var totalEl = section.querySelector('[data-fbt-total]');
    var addButton = section.querySelector('[data-fbt-add-button]');
    var buttonText = section.querySelector('[data-fbt-button-text]');
    var messageEl = section.querySelector('[data-fbt-message]');
    var moneyFormat = (window.theme && window.theme.moneyFormat) || section.getAttribute('data-money-format') || null;
    var labelTemplate = (addButton && addButton.getAttribute('data-label-template')) || 'Add all [count] to Cart';

    if (!itemsWrap || !addButton) return;

    var items = [];

    function setMessage(text, state) {
      if (!messageEl) return;
      messageEl.textContent = text || '';
      if (state) {
        messageEl.setAttribute('data-state', state);
      } else {
        messageEl.removeAttribute('data-state');
      }
    }

    function setLoading(isLoading) {
      addButton.disabled = isLoading;
      addButton.setAttribute('data-loading', isLoading ? 'true' : 'false');

      if (isLoading && buttonText) {
        addButton.setAttribute('data-restore-label', buttonText.textContent);
        buttonText.textContent = 'Adding…';
      } else if (buttonText && addButton.getAttribute('data-restore-label')) {
        buttonText.textContent = addButton.getAttribute('data-restore-label');
      }
    }

    function handleAddClick() {
      var toAdd = [];

      items.forEach(function (item) {
        var checkbox = item.querySelector('input[type="checkbox"]');
        var select = item.querySelector('[data-fbt-variant-select]');
        var checked = checkbox ? checkbox.checked : true;
        var variantId = select ? select.value : item.getAttribute('data-variant-id');

        if (checked && variantId) {
          toAdd.push({ id: parseInt(variantId, 10), quantity: 1 });
        }
      });

      if (!toAdd.length) {
        setMessage('Select at least one product to add.', 'error');
        return;
      }

      setLoading(true);
      setMessage('');

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: toAdd })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              var errMessage = (data && data.description) || 'Could not add items to cart.';
              throw new Error(errMessage);
            }
            return data;
          });
        })
        .then(function () {
          setMessage('Added to cart!', 'success');
          document.dispatchEvent(
            new CustomEvent('cart:updated', { bubbles: true, detail: { source: 'frequently-bought-together' } })
          );
          document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
        })
        .catch(function (error) {
          setMessage(error.message || 'Something went wrong. Please try again.', 'error');
        })
        .finally(function () {
          setLoading(false);
        });
    }

    addButton.addEventListener('click', handleAddClick);

    // -- Fetch complementary recommendations ---------------------------
    // On a normal page load `recommendations` is blank server-side, so
    // the section renders hidden with shimmer placeholders only. This
    // re-requests the section through the Product Recommendations
    // endpoint (intent=complementary); Shopify resolves recommendations
    // server-side and returns the fully rendered #fbt-products markup.
    var recommendationsUrl = section.getAttribute('data-recommendations-url');
    var sectionId = section.getAttribute('data-section-id');
    var productId = section.getAttribute('data-product-id');
    var limit = section.getAttribute('data-limit');
    var intent = section.getAttribute('data-intent');
    var alreadyPerformed = section.getAttribute('data-performed') === 'true';

    function finalizeWithItems() {
      items = bindItems(section, itemsWrap, totalEl, addButton, buttonText, moneyFormat, labelTemplate);
    }

    if (alreadyPerformed) {
      // Section markup was already populated (e.g. re-init after a
      // shopify:section:load reload of already-resolved content) —
      // just wire it up, no fetch needed.
      section.hidden = false;
      finalizeWithItems();
      return;
    }

    if (!recommendationsUrl || !sectionId || !productId) {
      section.hidden = true;
      return;
    }

    // Reveal the shimmer state while the fetch is in flight.
    section.hidden = false;

    var url = recommendationsUrl + '?section_id=' + encodeURIComponent(sectionId) +
      '&product_id=' + encodeURIComponent(productId) +
      '&limit=' + encodeURIComponent(limit || 2) +
      '&intent=' + encodeURIComponent(intent || 'complementary');

    // Inside the Theme Editor, the customizer preview needs its own
    // query params (e.g. _fd, pb) carried along or this fetch resolves
    // against the published theme instead of the draft being edited.
    if (window.Shopify && window.Shopify.designMode) {
      url += window.location.search.replace(/^\?/, '&');
    }

    fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('Recommendations request failed (' + response.status + ')');
        return response.text();
      })
      .then(function (html) {
        var doc = document.createElement('div');
        doc.innerHTML = html;

        var newSection = doc.querySelector('[data-fbt-section]');
        var newProducts = doc.querySelector('[data-fbt-products]');

        if (!newSection || newSection.getAttribute('data-performed') !== 'true' || !newProducts) {
          // No complementary recommendations available for this
          // product — stay hidden, same as the SSR fallback.
          section.hidden = true;
          return;
        }

        itemsWrap.innerHTML = newProducts.innerHTML;
        section.hidden = false;
        finalizeWithItems();
      })
      .catch(function (error) {
        console.error('Frequently bought together:', error);
        section.hidden = true;
      });
  }

  function init() {
    var sections = document.querySelectorAll('[data-fbt-section]');
    sections.forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector('[data-fbt-section]');
    if (section) initSection(section);
  });
})();