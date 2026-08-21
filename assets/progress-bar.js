(() => {
  'use strict';

  const BAR_SEL = '[data-ecombio-progress-bar]';

  function formatMoney(cents) {
    if (cents == null) return '';
    try {
      const currency = window.Shopify?.currency?.active ?? 'USD';
      return new Intl.NumberFormat(navigator.language, {
        style: 'currency', currency,
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(cents / 100);
    } catch (_) {
      return `$${(cents / 100).toFixed(2)}`;
    }
  }

  function render(el, currentCents) {
    const threshold = parseInt(el.dataset.threshold, 10);
    if (!threshold || threshold <= 0) return;

    const messageEl = el.querySelector('[data-ecombio-progress-message]');
    const fillEl    = el.querySelector('[data-ecombio-progress-fill]');
    if (!messageEl || !fillEl) return;

    const clampedCurrent = Math.max(0, currentCents);
    const percent   = Math.min(100, (clampedCurrent / threshold) * 100);
    const remaining = Math.max(0, threshold - clampedCurrent);
    const isComplete = clampedCurrent >= threshold;

    el.classList.toggle('is-complete', isComplete);
    fillEl.style.width = `${percent}%`;

    const template = isComplete
      ? el.dataset.labelComplete
      : el.dataset.labelProgress;

    messageEl.innerHTML = isComplete
      ? template
      : template.replace(
          '{{ amount }}',
          `<span class="ecombio-progress-bar__amount">${formatMoney(remaining)}</span>`
        );

    el.setAttribute('data-current', String(clampedCurrent));
  }

  async function refresh() {
    const bars = document.querySelectorAll(BAR_SEL);
    if (!bars.length) return;

    try {
      const cart = await (await fetch('/cart.js')).json();
      bars.forEach((el) => render(el, cart.total_price));
    } catch (err) {
      console.error('[EcombioProgressBar] refresh failed', err);
    }
  }

  ['cart:drawer:open', 'cart:updated', 'cart:rec:added'].forEach((evt) => {
    document.addEventListener(evt, refresh);
  });

})();