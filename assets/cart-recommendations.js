(() => {
  'use strict';

  const DRAWER_ID      = 'ecombio-cart-drawer';
  const RECS_SEL       = '[data-ecombio-recs]';
  const REC_ATC_SEL    = '[data-ecombio-rec-atc]';
  const LAST_ADDED_KEY = 'ecombio_last_added_product_id';

  let recsAbort      = null;
  let lastSourceId   = null;

  const getDrawer = () => document.getElementById(DRAWER_ID);

  function getRecsSourceId() {
    const stored = sessionStorage.getItem(LAST_ADDED_KEY);
    const fallback = document.querySelector('[data-cart-product-id]')?.dataset.cartProductId;
    const id = stored ?? fallback ?? null;

    if (id != null && !/^\d+$/.test(String(id))) {
      console.warn('[EcombioRecs] source id is not a plain numeric product id, ignoring:', id);
      return fallback && /^\d+$/.test(String(fallback)) ? fallback : null;
    }
    return id;
  }

  function getCartProductIds() {
    const ids = new Set();
    document.querySelectorAll('[data-cart-product-id]')
            .forEach((el) => ids.add(el.dataset.cartProductId));
    return ids;
  }

  async function fetchIntent(productId, intent, limit, signal) {
    const url = `/recommendations/products.json?product_id=${productId}&intent=${intent}&limit=${limit}`;
    try {
      const res = await fetch(url, { signal });

      if (!res.ok) {
        let detail = '';
        try {
          const body = await res.json();
          detail = body?.description || body?.errors || JSON.stringify(body);
        } catch (_) { /* body wasn't JSON, ignore */ }
        console.error(
          `[EcombioRecs] recommendations fetch failed: ${res.status} ${res.statusText} ` +
          `(intent=${intent}, product_id=${productId})${detail ? ` — ${detail}` : ''}`
        );
        return [];
      }

      return (await res.json()).products ?? [];
    } catch (err) {
      if (err.name !== 'AbortError') console.error(`[EcombioRecs] fetch failed intent=${intent}`, err);
      return [];
    }
  }

  async function loadRecommendations() {
    const drawer    = getDrawer();
    const recsShell = drawer?.querySelector(RECS_SEL);
    if (!recsShell) return;

    const productId = getRecsSourceId();
    if (!productId) { recsShell.innerHTML = ''; lastSourceId = null; return; }

    const showRelated        = drawer.dataset.showRelated        === 'true';
    const showComplementary  = drawer.dataset.showComplementary  === 'true';
    const limit               = Math.min(Math.max(parseInt(drawer.dataset.recLimit, 10) || 4, 1), 10);
    const relatedLabel       = recsShell.dataset.relatedLabel;
    const complementaryLabel = recsShell.dataset.complementaryLabel;

    if (!showRelated && !showComplementary) { recsShell.innerHTML = ''; return; }

    if (recsAbort) recsAbort.abort();
    recsAbort = new AbortController();
    const { signal } = recsAbort;

    showSkeleton(recsShell);

    try {
      const [related, complementary] = await Promise.all([
        showRelated       ? fetchIntent(productId, 'related',       limit, signal) : Promise.resolve([]),
        showComplementary ? fetchIntent(productId, 'complementary', limit, signal) : Promise.resolve([]),
      ]);

      const inCart             = getCartProductIds();
      const filter             = (ps) => ps.filter((p) => !inCart.has(String(p.id)));
      const filteredRelated    = filter(related);
      const filteredComplement = filter(complementary);

      if (!filteredRelated.length && !filteredComplement.length) {
        recsShell.innerHTML = '';
        lastSourceId = productId;
        return;
      }

      renderRecs(recsShell, {
        related:       { products: filteredRelated,    label: relatedLabel,       intent: 'related' },
        complementary: { products: filteredComplement, label: complementaryLabel, intent: 'complementary' },
        showRelated,
        showComplementary,
      });

      announce(recsShell, 'Product recommendations loaded.');
      lastSourceId = productId;

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[EcombioRecs] loadRecommendations failed', err);
        recsShell.innerHTML = '';
      }
    }
  }

  function announce(shell, message) {
    const el = shell.querySelector('.ecombio-cart-recs__status');
    if (el) el.textContent = message;
  }

  function showSkeleton(shell) {
    shell.innerHTML = `
      <span class="ecombio-cart-recs__status" role="status" aria-live="polite" aria-atomic="true"></span>
      <div class="ecombio-cart-recs__skeleton" aria-hidden="true">
        <div class="ecombio-cart-recs__skeleton-bar"></div>
        <div class="ecombio-cart-recs__skeleton-cards">
          <div class="ecombio-cart-recs__skeleton-card"></div>
          <div class="ecombio-cart-recs__skeleton-card"></div>
          <div class="ecombio-cart-recs__skeleton-card"></div>
          <div class="ecombio-cart-recs__skeleton-card"></div>
        </div>
      </div>`;
  }

  function renderRecs(shell, { related, complementary, showRelated, showComplementary }) {
    const rails = [];
    if (showRelated      && related.products.length)       rails.push(buildRail(related.label,       related.products,      'related'));
    if (showComplementary && complementary.products.length) rails.push(buildRail(complementary.label, complementary.products, 'complementary'));
    shell.innerHTML = `<span class="ecombio-cart-recs__status" role="status" aria-live="polite" aria-atomic="true"></span>${rails.join('')}`;
    wireRailNav(shell);
  }

  const NAV_ICON_PREV = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
  const NAV_ICON_NEXT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

  function buildRail(label, products, intent) {
    const cards = products.map((p) => buildCard(p, intent)).filter(Boolean).join('');
    if (!cards) return '';
    const safeLabel = escapeHTML(label);
    return `
      <div class="ecombio-cart-recs__rail" data-intent="${intent}">
        <h3 class="ecombio-cart-recs__heading">${safeLabel}</h3>
        <div class="ecombio-cart-recs__scroller">
          <button
            type="button"
            class="ecombio-cart-recs__nav ecombio-cart-recs__nav--prev"
            data-rec-nav="prev"
            aria-label="Scroll ${safeLabel} left"
          >${NAV_ICON_PREV}</button>
          <ul class="ecombio-cart-recs__list" role="list">${cards}</ul>
          <button
            type="button"
            class="ecombio-cart-recs__nav ecombio-cart-recs__nav--next"
            data-rec-nav="next"
            aria-label="Scroll ${safeLabel} right"
          >${NAV_ICON_NEXT}</button>
        </div>
      </div>`;
  }

  function wireRailNav(shell) {
    shell.querySelectorAll('.ecombio-cart-recs__rail').forEach((rail) => {
      const list    = rail.querySelector('.ecombio-cart-recs__list');
      const prevBtn = rail.querySelector('[data-rec-nav="prev"]');
      const nextBtn = rail.querySelector('[data-rec-nav="next"]');
      if (!list || !prevBtn || !nextBtn) return;

      const update = () => {
        const max        = Math.max(0, list.scrollWidth - list.clientWidth);
        const scrollable = max > 4;

        prevBtn.hidden = !scrollable;
        nextBtn.hidden = !scrollable;
        if (!scrollable) return;

        prevBtn.disabled = list.scrollLeft <= 2;
        nextBtn.disabled = list.scrollLeft >= max - 2;
      };

      const scrollByPage = (dir) => {
        list.scrollBy({ left: list.clientWidth * 0.9 * dir, behavior: 'smooth' });
      };

      prevBtn.addEventListener('click', () => scrollByPage(-1));
      nextBtn.addEventListener('click', () => scrollByPage(1));
      list.addEventListener('scroll', update, { passive: true });

      new ResizeObserver(update).observe(list);

      update();
    });
  }

  function buildCard(product, intent) {
    const variant = product.variants?.[0];
    if (!variant) return '';

    const available      = variant.available;
    const isMultiVariant = product.variants.length > 1;

    const rawUrl = product.url ?? '';
    const safeUrl = rawUrl.startsWith('/') || rawUrl.startsWith('https://') ? rawUrl : '#';

    const rawFeaturedImage =
      (typeof product.featured_image === 'string' && product.featured_image) ||
      product.featured_image?.src ||
      product.images?.[0]?.src ||
      product.images?.[0] ||
      null;

    const imgSrc = rawFeaturedImage
      ? rawFeaturedImage.replace(/(\.[a-z]+)(\?|$)/i, '_160x160$1$2')
      : '';
    const imgAlt = escapeHTML(product.images?.[0]?.alt || product.title);

    const price     = formatMoney(variant.price);
    const compPrice = variant.compare_at_price > variant.price
      ? formatMoney(variant.compare_at_price)
      : null;

    // Variant line and "was" price are now ALWAYS rendered (empty when not
    // applicable) rather than conditionally omitted. This keeps every
    // card's reserved-height slots (see CSS) consistent, so Add buttons
    // land on the same row regardless of whether a given product has a
    // variant name or a sale price.
    const variantLine = isMultiVariant
      ? `<p class="ecombio-cart-recs__card-variant">${escapeHTML(variant.title)}</p>`
      : `<p class="ecombio-cart-recs__card-variant"></p>`;

    const wasPriceLine = compPrice
      ? `<s class="ecombio-cart-recs__price--was">${compPrice}</s>`
      : `<s class="ecombio-cart-recs__price--was"></s>`;

    return `
      <li class="ecombio-cart-recs__card" data-product-id="${product.id}">
        <a href="${escapeHTML(safeUrl)}" class="ecombio-cart-recs__card-image-link" tabindex="-1" aria-hidden="true">
          ${imgSrc
            ? `<img src="${escapeHTML(imgSrc)}" alt="${imgAlt}" width="120" height="120" loading="lazy" class="ecombio-cart-recs__card-image">`
            : `<div class="ecombio-cart-recs__card-image ecombio-cart-recs__card-image--placeholder"></div>`}
        </a>
        <div class="ecombio-cart-recs__card-info">
          <a href="${escapeHTML(safeUrl)}" class="ecombio-cart-recs__card-title">${escapeHTML(product.title)}</a>
          ${variantLine}
          <div class="ecombio-cart-recs__card-bottom">
            <div class="ecombio-cart-recs__card-price">
              ${wasPriceLine}
              <span class="ecombio-cart-recs__price">${price}</span>
            </div>
            <button
              type="button"
              class="ecombio-cart-recs__atc"
              data-ecombio-rec-atc
              data-variant-id="${variant.id}"
              data-product-id="${product.id}"
              data-intent="${intent}"
              aria-label="Add ${escapeHTML(product.title)} to cart"
              ${available ? '' : 'disabled'}
            >${available ? 'Add' : 'Sold out'}</button>
          </div>
        </div>
      </li>`;
  }

  function formatMoney(cents) {
    if (cents == null) return '';
    try {
      const currency = window.Shopify?.currency?.active ?? 'USD';
      if (!window.Shopify?.currency?.active) console.warn('[EcombioRecs] Shopify.currency not set, defaulting to USD');
      return new Intl.NumberFormat(navigator.language, {
        style: 'currency', currency,
        minimumFractionDigits: 0, maximumFractionDigits: 2,
      }).format(cents / 100);
    } catch (_) {
      return `$${(cents / 100).toFixed(2)}`;
    }
  }

  function escapeHTML(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function recAddToCart(btn) {
    if (!btn.dataset.variantId || btn.disabled) return;

    btn.disabled = true;
    btn.classList.add('is-loading');

    try {
      const res = await fetch('/cart/add.js', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: btn.dataset.variantId, quantity: 1 }),
      });
      if (!res.ok) throw new Error('ATC failed');

      await res.json();

      sessionStorage.setItem(LAST_ADDED_KEY, btn.dataset.productId);
      lastSourceId = null;

      btn.classList.remove('is-loading');
      btn.classList.add('is-added');
      btn.textContent = '✓';

      const cart = await (await fetch('/cart.js')).json();

      // CHANGED: previously this only dispatched 'cart:rec:added' and
      // trusted cart-drawer.js to refresh the drawer body independently.
      // That left this script with no signal for *when* the body (and the
      // recs skeleton inside it) had actually been rebuilt, so the rail
      // stayed stale until the drawer was closed and reopened. Now we drive
      // the sequence ourselves: refresh the drawer body first (this also
      // rebuilds a fresh recs skeleton and syncs item-count badges via the
      // event below), and only then reload recommendations into that fresh
      // container — matching the same safe ordering the qty-change flow in
      // cart-drawer.js already uses for 'cart:updated'.
      document.dispatchEvent(new CustomEvent('cart:rec:added', { detail: { itemCount: cart.item_count } }));

      if (window.EcombioCart?.refresh) {
        await window.EcombioCart.refresh();
      }

      await loadRecommendations();

    } catch (err) {
      console.error('[EcombioRecs] ATC failed', err);
      btn.classList.remove('is-loading');
      btn.textContent = 'Error';
      setTimeout(() => {
        if (!btn.isConnected) return;
        btn.textContent = 'Add';
        btn.disabled = false;
      }, 2000);
    }

    // NOTE: no revert-after-2s timeout for the success path anymore.
    // loadRecommendations() above rebuilds the entire rail (the just-added
    // product is now filtered out since it's in the cart), so the original
    // button node is already gone by the time any timeout would fire.
  }

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest(REC_ATC_SEL);
    if (btn) recAddToCart(btn);
  });

  // FIX: don't rely solely on the cached lastSourceId to decide whether to
  // reload. cart-drawer.js's refreshDrawerHTML() can wipe the recs container
  // back to a bare skeleton (it re-renders the Liquid section, which never
  // contains product cards) without this script knowing about it. If that
  // happens while the "source" product hasn't changed, the old check would
  // skip reloading and leave the drawer stuck on the skeleton forever. Now
  // we also check whether the DOM actually has rendered cards, and reload
  // if not.
  document.addEventListener('cart:drawer:open', () => {
    const drawer    = getDrawer();
    const recsShell = drawer?.querySelector(RECS_SEL);
    const isEmpty   = !recsShell?.querySelector('.ecombio-cart-recs__rail');
    const currentSourceId = getRecsSourceId();

    if (isEmpty || currentSourceId !== lastSourceId) loadRecommendations();
  });

  document.addEventListener('cart:updated', () => {
    lastSourceId = null;
    if (getDrawer()?.classList.contains('is-open')) loadRecommendations();
  });

})();