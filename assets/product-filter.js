/**
 * product-filter.js
 * Progressive enhancement for sections/product-filter.liquid.
 *
 * Written fresh against this section's actual markup. Does NOT reuse
 * collection-filters.js — that file targeted ids/classes (#ProductGrid,
 * #FilterDrawer, -GTE/-LTE range sliders) that don't exist here.
 *
 * Responsibilities:
 *   - Auto-submit the form when a checkbox changes
 *   - Auto-submit when sort changes
 *   - Price "Apply" button submits the form (inputs alone don't)
 *   - Mobile drawer open/close toggle
 *
 * No-JS fallback: the form is a plain GET form with a visible
 * "Apply filters" submit button — everything below is optional.
 */

(function () {
  'use strict';

  document.querySelectorAll('[data-product-filter-form]').forEach((form) => {
    form.classList.add('js-enhanced');

    // Auto-submit on checkbox change
    form.querySelectorAll('[data-product-filter-checkbox]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => form.submit());
    });

    // Auto-submit on sort change
    const sortSelect = form.querySelector('[data-product-filter-sort]');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => form.submit());
    }

    // Price range "Apply" button
    const priceApply = form.querySelector('[data-product-filter-price-apply]');
    if (priceApply) {
      priceApply.addEventListener('click', () => form.submit());
    }

    // Submit price inputs on Enter key too
    form.querySelectorAll('[data-product-filter-price-min], [data-product-filter-price-max]').forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          form.submit();
        }
      });
    });
  });

  // Mobile drawer toggle
  const mobileToggle = document.querySelector('[data-product-filter-mobile-toggle]');
  const drawer = document.getElementById('product-filter-drawer');

  if (mobileToggle && drawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('is-open');
      drawer.classList.toggle('is-open', !isOpen);
      mobileToggle.setAttribute('aria-expanded', (!isOpen).toString());
    });
  }
})();
