/**
 * Complementary Products section controller.
 * - Lazily fetches recommended products from Shopify's Product
 *   Recommendations API (intent=complementary) once the section
 *   scrolls into view, per Shopify's documented pattern:
 *   https://shopify.dev/docs/storefronts/themes/product-merchandising/recommendations/complementary-products
 *   Skipped entirely when the merchant has added manual "Product
 *   override" blocks — those render server-side, no fetch needed.
 * - Tracks checkbox/radio selection across product cards
 * - Tracks per-card variant selection (updates price + variant id)
 * - Enforces an optional max-selectable limit
 * - Adds all selected items to the cart in a single /cart/add.js request
 * - Dispatches a `cart:updated` event other theme sections (cart drawer/icon) can listen for
 */

class ComplementaryProductsSection extends HTMLElement {
  constructor() {
    super();
    this.selectionMode = this.dataset.selectionMode || 'checkbox';
    this.maxSelected = parseInt(this.dataset.maxSelected || '0', 10);
    this.moneyFormat = window.Shopify?.money_format || '${{amount}}';
  }

  connectedCallback() {
    this.form = this.querySelector('[data-complementary-form]');
    this.list = this.querySelector('[data-complementary-list]');
    this.countEl = this.querySelector('[data-selected-count]');
    this.totalEl = this.querySelector('[data-selected-total]');
    this.submitButton = this.querySelector('[data-add-selected-button]');
    this.buttonTextEl = this.querySelector('[data-button-text]');
    this.spinner = this.querySelector('[data-loading-spinner]');
    this.errorEl = this.querySelector('[data-form-error]');

    if (!this.form) return;

    this.defaultButtonText = this.buttonTextEl ? this.buttonTextEl.textContent : 'Add selected to cart';

    // Selection + variant-change handling is delegated on the list
    // container itself, so it keeps working after the list's innerHTML
    // is swapped out by the async recommendations fetch below.
    this.list.addEventListener('change', (event) => {
      if (event.target.matches('[data-item-input]')) {
        this.handleSelectionChange(event.target);
      }
      if (event.target.matches('[data-variant-select]')) {
        this.handleVariantChange(event.target);
      }
    });

    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.addSelectedToCart();
    });

    this.updateSummary();
    this.initRecommendations();
  }

  initRecommendations() {
    const url = this.dataset.url;
    if (!url) return; // manual override blocks were used — nothing to fetch

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        this.fetchRecommendations(url);
      },
      { rootMargin: '0px 0px 200px 0px' }
    );

    observer.observe(this);
  }

  async fetchRecommendations(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Recommendations request failed');

      const text = await response.text();
      const parsed = document.createElement('div');
      parsed.innerHTML = text;

      const newList = parsed.querySelector('[data-complementary-list]');

      if (!newList || !newList.children.length) {
        // No complementary products for this product — Shopify's UI
        // guidance is to not show the section at all in that case.
        this.hidden = true;
        return;
      }

      this.list.innerHTML = newList.innerHTML;
      this.updateSummary();
    } catch (error) {
      // Fail quietly and hide the section rather than show empty/broken cards.
      this.hidden = true;
    }
  }

  getItemInputs() {
    return Array.from(this.querySelectorAll('[data-item-input]'));
  }

  getSelectedInputs() {
    return this.getItemInputs().filter((input) => input.checked && input.dataset.available === 'true');
  }

  handleSelectionChange(changedInput) {
    const selected = this.getItemInputs().filter((input) => input.checked);

    if (
      this.selectionMode === 'checkbox' &&
      this.maxSelected > 0 &&
      selected.length > this.maxSelected
    ) {
      changedInput.checked = false;
      this.showError(
        `You can select up to ${this.maxSelected} item${this.maxSelected === 1 ? '' : 's'}.`
      );
      return;
    }

    this.clearError();
    this.updateSummary();
  }

  handleVariantChange(select) {
    const card = select.closest('[data-complementary-item]');
    const input = card?.querySelector('[data-item-input]');
    const selectedOption = select.options[select.selectedIndex];

    if (!input || !selectedOption) return;

    input.dataset.variantId = selectedOption.value;
    input.dataset.price = selectedOption.dataset.price || '0';
    input.dataset.available = selectedOption.dataset.available || 'false';

    const priceEl = card.querySelector('[data-item-price]');
    if (priceEl) priceEl.textContent = this.formatMoney(selectedOption.dataset.price);

    this.updateSummary();
  }

  updateSummary() {
    const selected = this.getSelectedInputs();
    const total = selected.reduce((sum, input) => sum + parseInt(input.dataset.price || '0', 10), 0);

    if (this.countEl) this.countEl.textContent = String(selected.length);
    if (this.totalEl) this.totalEl.textContent = selected.length ? this.formatMoney(total) : '';
    if (this.submitButton) this.submitButton.disabled = selected.length === 0;
  }

  formatMoney(cents) {
    const amount = (parseInt(cents || '0', 10) / 100).toFixed(2);
    return this.moneyFormat.replace('{{amount}}', amount).replace('{{ amount }}', amount);
  }

  showError(message) {
    if (!this.errorEl) return;
    this.errorEl.textContent = message;
    this.errorEl.hidden = false;
  }

  clearError() {
    if (!this.errorEl) return;
    this.errorEl.hidden = true;
    this.errorEl.textContent = '';
  }

  setLoading(isLoading) {
    if (this.submitButton) this.submitButton.disabled = isLoading || this.getSelectedInputs().length === 0;
    if (this.spinner) this.spinner.hidden = !isLoading;
    if (this.buttonTextEl) {
      this.buttonTextEl.textContent = isLoading ? 'Adding…' : this.defaultButtonText;
    }
  }

  async addSelectedToCart() {
    const selected = this.getSelectedInputs();
    if (selected.length === 0) return;

    this.clearError();
    this.setLoading(true);

    const items = selected.map((input) => ({
      id: parseInt(input.dataset.variantId, 10),
      quantity: 1,
    }));

    try {
      const response = await fetch(window.Shopify?.routes?.root
        ? `${window.Shopify.routes.root}cart/add.js`
        : '/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.description || data.message || 'Could not add items to cart.');
      }

      // Let cart drawers / icon bubbles elsewhere in the theme react.
      document.dispatchEvent(
        new CustomEvent('cart:updated', { bubbles: true, detail: { source: 'complementary-products', items: data } })
      );

      this.setLoading(false);

      if (this.buttonTextEl) {
        this.buttonTextEl.textContent = 'Added ✓';
        setTimeout(() => {
          this.buttonTextEl.textContent = this.defaultButtonText;
        }, 1800);
      }
    } catch (error) {
      this.setLoading(false);
      this.showError(error.message || 'Something went wrong adding these items to your cart.');
    }
  }
}

if (!customElements.get('complementary-products-section')) {
  customElements.define('complementary-products-section', ComplementaryProductsSection);
}
