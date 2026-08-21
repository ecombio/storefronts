(function () {
  'use strict';

  var COMPARE_KEY = 'shopify_compare';
  var settings     = window.__comparePageSettings || {};

  function getCompareList() {
    try { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; } catch (e) { return []; }
  }
  function saveCompareList(list) {
    try { localStorage.setItem(COMPARE_KEY, JSON.stringify(list)); } catch (e) { }
  }
  function entryId(entry) {
    return typeof entry === 'object' ? entry.id : entry;
  }

  function formatMoney(cents) {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function getHandlesFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get('handles');
    if (!raw) return [];
    return raw.split(',')
      .map(function (h) { return h.trim(); })
      .filter(Boolean);
  }

  function mergeQueryHandles() {
    var queryHandles = getHandlesFromQuery();
    if (queryHandles.length === 0) return;

    var list = getCompareList();
    var existingHandles = list
      .filter(function (entry) { return typeof entry === 'object' && entry.handle; })
      .map(function (entry) { return entry.handle; });

    var added = false;
    queryHandles.forEach(function (handle) {
      if (existingHandles.indexOf(handle) === -1) {
        list.push({ id: handle, handle: handle });
        existingHandles.push(handle);
        added = true;
      }
    });

    if (added) saveCompareList(list);

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function reconcileIds(products) {
    var list = getCompareList();
    var changed = false;

    products.forEach(function (product) {
      var entry = list.filter(function (e) {
        return typeof e === 'object' && e.handle === product.handle;
      })[0];

      if (entry && String(entry.id) !== String(product.id)) {
        entry.id = String(product.id);
        changed = true;
      }
    });

    if (changed) saveCompareList(list);
  }

  var tableWrap = document.querySelector('[data-compare-table-wrap]');
  var thead     = document.querySelector('[data-compare-thead]');
  var tbody     = document.querySelector('[data-compare-tbody]');
  var empty     = document.querySelector('[data-compare-empty]');
  var actions   = document.querySelector('[data-compare-actions]');
  var countLbl  = document.querySelector('[data-compare-count-label]');

  if (!tableWrap || !thead || !tbody) return;

  function fetchProduct(handle) {
    return fetch('/products/' + handle + '.js')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function updateCount(n) {
    if (!countLbl) return;
    countLbl.textContent = n === 0 ? '' : n === 1 ? '1 item' : n + ' items';
  }

  function setEmpty(isEmpty) {
    tableWrap.hidden = isEmpty;
    empty.hidden     = !isEmpty;
    actions.hidden   = isEmpty;
  }

  function removeProduct(productId) {
    var list = getCompareList().filter(function (entry) { return entryId(entry) !== productId; });
    saveCompareList(list);
    document.dispatchEvent(new CustomEvent('compare:toggle', { bubbles: true, detail: { productId: productId, compared: false, fromPage: true } }));
    render();
  }

  function addToCart(variantId, btn) {
    btn.disabled    = true;
    btn.textContent = 'Adding…';

    fetch(settings.routes && settings.routes.cartAdd || '/cart/add.js', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify({ id: variantId, quantity: 1 })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.status) {
          btn.textContent = 'Error';
          setTimeout(function () { btn.textContent = 'Add to cart'; btn.disabled = false; }, 1500);
        } else {
          btn.textContent = 'Added!';
          document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
          document.dispatchEvent(new CustomEvent('cart:open',    { bubbles: true }));
          setTimeout(function () { btn.textContent = 'Add to cart'; btn.disabled = false; }, 1500);
        }
      })
      .catch(function () {
        btn.textContent = 'Error';
        setTimeout(function () { btn.textContent = 'Add to cart'; btn.disabled = false; }, 1500);
      });
  }

  function buildHead(products) {
    var tr = document.createElement('tr');

    var labelTh = document.createElement('th');
    labelTh.className = 'compare-table__label-col';
    labelTh.textContent = '';
    tr.appendChild(labelTh);

    products.forEach(function (product) {
      var id  = String(product.id);
      var url = '/products/' + product.handle;
      var image = product.featured_image || (product.images && product.images[0]) || '';

      var th = document.createElement('th');
      th.className = 'compare-table__product-col';
      th.setAttribute('data-product-id', id);

      var topRow = document.createElement('div');
      topRow.className = 'compare-product__header-top';

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'compare-product__remove';
      removeBtn.setAttribute('aria-label', 'Remove ' + product.title + ' from compare');
      removeBtn.setAttribute('data-compare-remove-btn', '');
      removeBtn.setAttribute('data-product-id', id);
      removeBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      topRow.appendChild(removeBtn);

      var mediaA = document.createElement('a');
      mediaA.className = 'compare-product__media';
      mediaA.href = url;
      var img = document.createElement('img');
      img.className = 'compare-product__img';
      img.loading = 'lazy';
      img.width = 300;
      img.height = 300;
      img.alt = product.title;
      img.src = image + (image.indexOf('?') === -1 ? '?' : '&') + 'width=400';
      mediaA.appendChild(img);

      var titleA = document.createElement('a');
      titleA.className = 'compare-product__title';
      titleA.href = url;
      titleA.textContent = product.title;

      th.appendChild(topRow);
      th.appendChild(mediaA);
      th.appendChild(titleA);
      tr.appendChild(th);
    });

    thead.innerHTML = '';
    thead.appendChild(tr);
  }

  function buildRow(label, products, cellFn) {
    var tr = document.createElement('tr');

    var th = document.createElement('th');
    th.className = 'compare-table__label-col';
    th.scope = 'row';
    th.textContent = label;
    tr.appendChild(th);

    products.forEach(function (product) {
      var td = document.createElement('td');
      cellFn(td, product);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  }

  function buildBody(products) {
    tbody.innerHTML = '';

    if (settings.showVendor) {
      buildRow('Vendor', products, function (td, product) {
        td.textContent = product.vendor || '—';
      });
    }

    if (settings.showPrice !== false) {
      buildRow('Price', products, function (td, product) {
        var variant = product.variants && product.variants[0];
        if (!variant) { td.textContent = '—'; return; }

        td.classList.add('compare-row__price');
        var compare = variant.compare_at_price;
        if (compare && compare > variant.price) {
          td.innerHTML =
            '<s>' + formatMoney(compare) + '</s> ' +
            '<span class="compare-row__price--sale">' + formatMoney(variant.price) + '</span>';
        } else {
          td.textContent = formatMoney(variant.price);
        }
      });
    }

    if (settings.showAvailability !== false) {
      buildRow('Availability', products, function (td, product) {
        var variant = product.variants && product.variants[0];
        var available = variant && variant.available;
        td.textContent = available ? 'In stock' : 'Sold out';
        td.classList.add(available ? 'compare-row__availability--in' : 'compare-row__availability--out');
      });
    }

    if (settings.enableAtc !== false) {
      buildRow('', products, function (td, product) {
        var variant = product.variants && product.variants[0];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn compare-row__atc-btn';
        btn.setAttribute('data-compare-atc-btn', '');

        if (variant) {
          btn.setAttribute('data-variant-id', variant.id);
          if (!variant.available) {
            btn.textContent = 'Sold out';
            btn.disabled = true;
          } else {
            btn.textContent = 'Add to cart';
          }
        } else {
          btn.textContent = 'Unavailable';
          btn.disabled = true;
        }

        td.appendChild(btn);
      });
    }
  }

  function render() {
    mergeQueryHandles();

    var entries = getCompareList();

    var valid = entries.filter(function (e) {
      return typeof e === 'object' && e.handle;
    });

    updateCount(valid.length);

    if (valid.length === 0) {
      setEmpty(true);
      return;
    }

    var fetches = valid.map(function (entry) {
      return fetchProduct(entry.handle);
    });

    Promise.all(fetches).then(function (results) {
      var products = results.filter(Boolean);

      if (products.length === 0) {
        setEmpty(true);
        return;
      }

      reconcileIds(products);

      setEmpty(false);
      buildHead(products);
      buildBody(products);
      updateCount(products.length);
    });
  }

  document.addEventListener('click', function (e) {
    var removeBtn = e.target.closest('[data-compare-remove-btn]');
    if (removeBtn && thead.contains(removeBtn)) {
      removeProduct(removeBtn.getAttribute('data-product-id'));
      return;
    }

    var atcBtn = e.target.closest('[data-compare-atc-btn]');
    if (atcBtn && tbody.contains(atcBtn)) {
      var variantId = atcBtn.getAttribute('data-variant-id');
      if (variantId) addToCart(variantId, atcBtn);
      return;
    }

    if (e.target.closest('[data-compare-page-clear]')) {
      saveCompareList([]);
      thead.innerHTML = '';
      tbody.innerHTML = '';
      updateCount(0);
      setEmpty(true);
      document.dispatchEvent(new CustomEvent('compare:cleared', { bubbles: true }));
    }
  });

  document.addEventListener('compare:toggle', function (e) {
    var detail = e.detail || {};
    if (detail.fromPage) return;
    render();
  });

  window.addEventListener('storage', function (e) {
    if (e.key === COMPARE_KEY) render();
  });

  render();

})();
