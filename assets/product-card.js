(() => {
  'use strict';

  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const emit = (name, detail = {}) =>
    document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

  function formatMoney(cents) {
    const symbol = window.Shopify?.currency?.symbol ?? '$';
    const amount = (cents / 100).toFixed(2).replace(/\.00$/, '');
    return symbol + amount;
  }

  function initAddToCart() {
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-atc-btn]');
      if (!btn || btn.disabled) return;

      const variantId = btn.getAttribute('data-variant-id');
      if (!variantId) return;

      const label        = btn.querySelector('[data-atc-label]');
      const originalHTML = btn.innerHTML;

      btn.disabled = true;
      btn.classList.add('is-loading');
      if (label) label.textContent = 'Adding…';

      fetch('/cart/add.js', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: variantId, quantity: 1 }),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Cart error');
          return res.json();
        })
        .then(() => {
          btn.classList.remove('is-loading');
          btn.classList.add('is-added');
          if (label) label.textContent = 'Added!';

          emit('cart:updated');
          emit('cart:open');

          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('is-added');
            btn.disabled = false;
          }, 1800);
        })
        .catch(() => {
          btn.classList.remove('is-loading');
          btn.disabled = false;
          if (label) label.textContent = 'Try again';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 2000);
        });
    });
  }

  const WISHLIST_KEY = 'shopify_wishlist';

  function getWishlist() {
    try   { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
    catch { return []; }
  }

  function saveWishlist(list) {
    try   { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); }
    catch {}
  }

  function entryId(entry) {
    return typeof entry === 'object' ? entry.id : entry;
  }

  function syncWishlistButtons() {
    const ids = getWishlist().map(entryId);
    qsa('[data-wishlist-btn]').forEach((btn) => {
      const pressed = ids.includes(btn.getAttribute('data-product-id'));
      btn.setAttribute('aria-pressed', String(pressed));
      btn.setAttribute(
        'aria-label',
        `${pressed ? 'Remove from' : 'Add to'} wishlist`
      );
    });
  }

  function initWishlist() {
    syncWishlistButtons();

    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wishlist-btn]');
      if (!btn) return;

      const id     = btn.getAttribute('data-product-id');
      const card   = btn.closest('[data-product-handle]');
      const handle = card?.getAttribute('data-product-handle') || '';

      const list = getWishlist();
      const ids  = list.map(entryId);
      const idx  = ids.indexOf(id);

      if (idx === -1) {
        list.push({ id, handle });
      } else {
        list.splice(idx, 1);
      }

      saveWishlist(list);
      syncWishlistButtons();
      emit('wishlist:toggle', { productId: id, wishlisted: idx === -1 });
    });
  }

  const COMPARE_KEY = 'shopify_compare';
  const COMPARE_MAX = 5;
  let compareItems = [];

  function getCompareStorage() {
    try   { return JSON.parse(localStorage.getItem(COMPARE_KEY)) || []; }
    catch { return []; }
  }

  function saveCompareStorage(list) {
    try   { localStorage.setItem(COMPARE_KEY, JSON.stringify(list)); }
    catch {}
  }

  function validCompareEntries(list) {
    return list.filter((entry) => entry && typeof entry === 'object' && entry.id && entry.handle);
  }

  function findCompare(id) {
    return compareItems.findIndex((x) => x.id === id);
  }

  function syncCompareCheckboxes() {
    qsa('[data-compare-checkbox]').forEach((cb) => {
      cb.checked = findCompare(cb.getAttribute('data-product-id')) !== -1;
    });
  }

  function renderCompareBar() {
    const bar = qs('.compare-bar');
    if (!bar) return;

    const counter = qs('.compare-bar__counter', bar);
    if (counter) counter.textContent = compareItems.length;

    const list = qs('.compare-bar__list', bar);
    if (list) {
      list.innerHTML = '';

      compareItems.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'compare-bar__item';
        li.innerHTML = `
          <img src="${item.image}" alt="${item.title}" width="48" height="48">
          <button
            class="compare-bar__item-remove"
            type="button"
            aria-label="Remove ${item.title} from compare"
            data-compare-remove="${item.id}"
          >&times;</button>`;
        list.appendChild(li);
      });

      for (let i = compareItems.length; i < COMPARE_MAX; i++) {
        const li = document.createElement('li');
        li.className = 'compare-bar__item compare-bar__item-placeholder';
        li.setAttribute('aria-hidden', 'true');
        list.appendChild(li);
      }
    }

    const submit = qs('[data-compare-submit]', bar);
    if (submit) submit.disabled = compareItems.length < 2;

    bar.classList.toggle('is-active', compareItems.length > 0);
  }

  function initCompare() {
    compareItems = validCompareEntries(getCompareStorage());
    syncCompareCheckboxes();
    renderCompareBar();

    document.body.addEventListener('change', (e) => {
      const cb = e.target.closest('[data-compare-checkbox]');
      if (!cb) return;

      const id  = cb.getAttribute('data-product-id');
      const idx = findCompare(id);

      if (cb.checked) {
        if (compareItems.length >= COMPARE_MAX) {
          cb.checked = false;
          const bar = qs('.compare-bar');
          if (bar) {
            bar.classList.add('is-limit');
            setTimeout(() => bar.classList.remove('is-limit'), 600);
          }
          return;
        }
        compareItems.push({
          id,
          handle: cb.getAttribute('data-product-handle') || '',
          title:  cb.getAttribute('data-product-title')  || '',
          image:  cb.getAttribute('data-product-image')  || '',
          price:  cb.getAttribute('data-product-price')  || '',
        });
      } else {
        if (idx !== -1) compareItems.splice(idx, 1);
      }

      saveCompareStorage(compareItems);
      syncCompareCheckboxes();
      renderCompareBar();
      emit('compare:updated', { items: compareItems });
    });

    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-compare-remove]');
      if (!btn) return;
      const idx = findCompare(btn.getAttribute('data-compare-remove'));
      if (idx !== -1) compareItems.splice(idx, 1);
      saveCompareStorage(compareItems);
      syncCompareCheckboxes();
      renderCompareBar();
      emit('compare:updated', { items: compareItems });
    });

    document.body.addEventListener('click', (e) => {
      if (!e.target.closest('[data-compare-clear]')) return;
      compareItems.length = 0;
      saveCompareStorage(compareItems);
      syncCompareCheckboxes();
      renderCompareBar();
      emit('compare:updated', { items: compareItems });
    });

    document.body.addEventListener('click', (e) => {
      if (!e.target.closest('[data-compare-submit]')) return;
      if (compareItems.length >= 2) {
        window.location.href = '/pages/compare';
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key !== COMPARE_KEY) return;
      compareItems = validCompareEntries(getCompareStorage());
      syncCompareCheckboxes();
      renderCompareBar();
    });

    document.addEventListener('compare:toggle', (e) => {
      const detail = e.detail || {};
      if (!detail.fromPage) return;
      compareItems = validCompareEntries(getCompareStorage());
      syncCompareCheckboxes();
      renderCompareBar();
    });

    document.addEventListener('compare:cleared', () => {
      compareItems.length = 0;
      syncCompareCheckboxes();
      renderCompareBar();
    });

    renderCompareBar();
  }

  function initQuickViewTrigger() {
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-quickview-btn]');
      if (!btn) return;
      const handle = btn.getAttribute('data-product-handle');
      if (!handle) return;
      emit('quickview:open', { handle, trigger: btn });
    });
  }

  const root = document.documentElement;

  function px(value) {
    return Math.round(value) + 'px';
  }

  function setStickyOffsets() {
    const header = qs('.sticky-header');
    if (header) {
      root.style.setProperty('--sticky-header-height', px(header.offsetHeight));
    }

    const toolbar = document.getElementById('collection-toolbar');
    if (toolbar) {
      root.style.setProperty('--sticky-toolbar-height', px(toolbar.offsetHeight));
    }
  }

  function initStickyOffsets() {
    setStickyOffsets();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setStickyOffsets, 100);
    });

    const header = qs('.sticky-header');
    if (header && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => setStickyOffsets());
      ro.observe(header);
    }
  }

  document.addEventListener('productcard:injected', () => {
    syncWishlistButtons();
    syncCompareCheckboxes();
  });

  window.EcombioCard = {
    formatMoney,
    syncWishlistButtons,
    syncCompareCheckboxes,
  };

  function init() {
    initAddToCart();
    initWishlist();
    initCompare();
    initQuickViewTrigger();
    initStickyOffsets();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();