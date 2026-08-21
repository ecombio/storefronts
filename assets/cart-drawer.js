(() => {
  'use strict';

  const DRAWER_ID   = 'ecombio-cart-drawer';
  const OPEN_CLASS  = 'is-open';
  const LOCK_CLASS  = 'cart-drawer-open';

  const TRIGGER_SEL = '[data-ecombio-cart-trigger]';
  const CLOSE_SEL   = '[data-ecombio-cart-close]';
  const QTY_SEL     = '[data-ecombio-qty-change]';
  const REMOVE_SEL  = '[data-ecombio-remove-item]';
  const BODY_SEL    = '[data-ecombio-cart-body]';
  const FOOTER_SEL  = '[data-ecombio-cart-footer]';
  const COUNT_SEL   = '[data-cart-count]';
  const LOADING_SEL = '[data-ecombio-cart-loading]';

  let lastTrigger     = null;
  let cartChangeAbort = null;

  const getDrawer    = () => document.getElementById(DRAWER_ID);
  const isOpen       = () => getDrawer()?.classList.contains(OPEN_CLASS) ?? false;
  const getFocusable = (el) => Array.from(el.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ));

  function openDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;
    drawer.removeAttribute('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add(OPEN_CLASS);
    document.documentElement.classList.add(LOCK_CLASS);
    document.dispatchEvent(new CustomEvent('cart:drawer:open'));
    requestAnimationFrame(() => getFocusable(drawer)[0]?.focus());
  }

  function closeDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;
    drawer.setAttribute('hidden', '');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.classList.remove(OPEN_CLASS);
    document.documentElement.classList.remove(LOCK_CLASS);
    document.dispatchEvent(new CustomEvent('cart:drawer:close'));
    lastTrigger?.focus();
  }

  function setLoading(on) {
    const drawer  = getDrawer();
    const overlay = drawer?.querySelector(LOADING_SEL);
    if (!drawer || !overlay) return;

    if (on) {
      overlay.removeAttribute('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      drawer.classList.add('is-loading');
      drawer.querySelectorAll(`${QTY_SEL}, ${REMOVE_SEL}`)
            .forEach((btn) => btn.setAttribute('disabled', ''));
    } else {
      overlay.setAttribute('hidden', '');
      overlay.setAttribute('aria-hidden', 'true');
      drawer.classList.remove('is-loading');
      drawer.querySelectorAll(`${QTY_SEL}[disabled], ${REMOVE_SEL}[disabled]`)
            .forEach((btn) => btn.removeAttribute('disabled'));
    }
  }

  async function cartChange(key, quantity) {
    if (cartChangeAbort) cartChangeAbort.abort();
    cartChangeAbort = new AbortController();
    setLoading(true);

    try {
      const res = await fetch('/cart/change.js', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: key, quantity }),
        signal:  cartChangeAbort.signal,
      });
      if (!res.ok) throw new Error('Cart update failed');

      const cart = await res.json();
      await refreshDrawerHTML();
      updateCountBadges(cart.item_count);

      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { itemCount: cart.item_count } }));

    } catch (err) {
      if (err.name !== 'AbortError') console.error('[EcombioCart] cartChange failed', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshDrawerHTML() {
    try {
      const res = await fetch('/?section_id=cart-drawer', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        cache:   'no-store',
      });
      if (!res.ok) return;

      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');

      const newBody = doc.querySelector(BODY_SEL);
      const curBody = document.querySelector(BODY_SEL);
      if (newBody && curBody) curBody.innerHTML = newBody.innerHTML;

      const newFooter = doc.querySelector(FOOTER_SEL);
      const curFooter = document.querySelector(FOOTER_SEL);
      if (newFooter && curFooter) {
        curFooter.innerHTML = newFooter.innerHTML;
        newFooter.hasAttribute('hidden')
          ? curFooter.setAttribute('hidden', '')
          : curFooter.removeAttribute('hidden');
      }
    } catch (err) {
      console.error('[EcombioCart] HTML refresh failed', err);
    }
  }

  function updateCountBadges(itemCount) {
    document.querySelectorAll(COUNT_SEL).forEach((el) => {
      el.textContent = el.textContent.trim().startsWith('(')
        ? `(${itemCount})`
        : itemCount;
      el.setAttribute('aria-label', `${itemCount} item${itemCount !== 1 ? 's' : ''} in cart`);
    });
  }

  document.body.addEventListener('click', (e) => {
    const trigger = e.target.closest(TRIGGER_SEL);
    if (trigger) {
      lastTrigger = trigger;
      isOpen() ? closeDrawer() : openDrawer();
      return;
    }

    if (e.target.closest(CLOSE_SEL)) { closeDrawer(); return; }

    const qtyBtn = e.target.closest(QTY_SEL);
    if (qtyBtn) {
      const key     = qtyBtn.dataset.key;
      const valueEl = document.querySelector(`[data-qty-value="${key}"]`);
      const current = valueEl ? parseInt(valueEl.textContent, 10) : 1;
      cartChange(key, Math.max(0, current + parseInt(qtyBtn.dataset.delta, 10)));
      return;
    }

    const removeBtn = e.target.closest(REMOVE_SEL);
    if (removeBtn) { cartChange(removeBtn.dataset.key, 0); return; }

    const drawer = getDrawer();
    if (drawer && isOpen()) {
      const inner = drawer.querySelector('.ecombio-cart-drawer__inner');
      if (inner && !inner.contains(e.target)) closeDrawer();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;

    if (e.key === 'Escape') { closeDrawer(); return; }

    if (e.key === 'Tab') {
      const focusable = getFocusable(getDrawer());
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });

  document.addEventListener('cart:open', async (e) => {
    await refreshDrawerHTML();
    openDrawer();

    if (e.detail?.itemCount != null) {
      updateCountBadges(e.detail.itemCount);
    } else {
      try {
        const cart = await (await fetch('/cart.js')).json();
        updateCountBadges(cart.item_count);
      } catch (err) {
        console.error('[EcombioCart] badge refresh failed', err);
      }
    }
  });

  document.addEventListener('cart:rec:added', async ({ detail }) => {
    await refreshDrawerHTML();
    if (detail?.itemCount != null) {
      updateCountBadges(detail.itemCount);
    } else {
      try {
        const cart = await (await fetch('/cart.js')).json();
        updateCountBadges(cart.item_count);
      } catch (err) {
        console.error('[EcombioCart] badge refresh failed', err);
      }
    }
  });

  window.EcombioCart = {
    open:    openDrawer,
    close:   closeDrawer,
    toggle:  () => (isOpen() ? closeDrawer() : openDrawer()),
    refresh: refreshDrawerHTML,
  };

})();