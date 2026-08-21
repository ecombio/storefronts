/**
 * Recently Viewed Products
 * -------------------------------------------------
 * Tracks viewed product handles in localStorage and renders
 * a shelf of the most recently viewed products (excluding
 * the current one) using Shopify's AJAX Product API.
 *
 * Drop this in /assets/recently-viewed.js and reference it
 * from sections/recently-viewed.liquid.
 */

class RecentlyViewedProducts extends HTMLElement {
  static STORAGE_KEY = 'recently_viewed_products';
  static MAX_STORED = 20; // how many handles we keep in storage

  connectedCallback() {
    this.limit = parseInt(this.dataset.limit || '4', 10);
    this.currentHandle = this.dataset.currentProductHandle || null;

    // 1. Record this page view (if we're on a product page)
    if (this.currentHandle) {
      this.recordView(this.currentHandle);
    }

    // 2. Render the shelf from whatever's stored, minus the current product
    this.render();
  }

  getStored() {
    try {
      const raw = localStorage.getItem(RecentlyViewedProducts.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  setStored(handles) {
    try {
      localStorage.setItem(
        RecentlyViewedProducts.STORAGE_KEY,
        JSON.stringify(handles.slice(0, RecentlyViewedProducts.MAX_STORED))
      );
    } catch (e) {
      // localStorage unavailable (private mode, quota, etc.) — fail silently
    }
  }

  recordView(handle) {
    const handles = this.getStored().filter((h) => h !== handle);
    handles.unshift(handle);
    this.setStored(handles);
  }

  async render() {
    const handles = this.getStored()
      .filter((h) => h !== this.currentHandle)
      .slice(0, this.limit);

    if (handles.length === 0) {
      this.hidden = true;
      return;
    }

    const products = await Promise.all(
      handles.map((handle) =>
        fetch(`/products/${handle}.js`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      )
    );

    const validProducts = products.filter(Boolean);

    if (validProducts.length === 0) {
      this.hidden = true;
      return;
    }

    const list = this.querySelector('[data-recently-viewed-list]');
    if (!list) return;

    list.innerHTML = validProducts.map((product) => this.renderCard(product)).join('');
    this.hidden = false;
  }

  renderCard(product) {
    const image = product.featured_image || (product.images && product.images[0]);
    const price = this.formatMoney(product.price);
    const compareAtPrice =
      product.compare_at_price > product.price ? this.formatMoney(product.compare_at_price) : null;

    return `
      <li class="grid__item recently-viewed__item">
        <a href="${product.url}" class="recently-viewed__link">
          ${
            image
              ? `<img
                  src="${image}"
                  alt="${this.escapeHtml(product.title)}"
                  loading="lazy"
                  width="220"
                  height="220"
                  class="recently-viewed__image"
                />`
              : ''
          }
          <span class="recently-viewed__title">${this.escapeHtml(product.title)}</span>
          <span class="recently-viewed__price">
            ${compareAtPrice ? `<s>${compareAtPrice}</s> ` : ''}${price}
          </span>
        </a>
      </li>
    `;
  }

  formatMoney(cents) {
    // Swap this for Shopify.formatMoney(cents, moneyFormat) if you want
    // full currency-format support driven by shop settings.
    return `$${(cents / 100).toFixed(2)}`;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define('recently-viewed-products', RecentlyViewedProducts);
