(() => {
  'use strict';

  // sections/related-products.liquid renders a <related-products> wrapper.
  // On the normal page load it shows the fallback collection (if any) —
  // the `recommendations` global object is blank until this section is
  // fetched again through Shopify's dedicated recommendations endpoint
  // (routes.product_recommendations_url), which is what this file does.

  function loadSection(el) {
    const baseUrl   = el.getAttribute('data-recommendations-url');
    const productId = el.getAttribute('data-product-id');
    const sectionId = el.getAttribute('data-section-id');
    const limit     = el.getAttribute('data-limit') || 8;

    if (!baseUrl || !productId || !sectionId) return;

    const url = `${baseUrl}?product_id=${productId}&section_id=${sectionId}&limit=${limit}&intent=related`;

    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const fresh = doc.querySelector('related-products');

        const hadContent = !!el.innerHTML.trim();

        if (fresh && fresh.innerHTML.trim()) {
          // Only swap in the fetched result if it actually has products —
          // never overwrite existing (e.g. fallback) content with an
          // empty or malformed response.
          el.innerHTML = fresh.innerHTML;
          document.dispatchEvent(new CustomEvent('productcard:injected', { bubbles: true }));
        } else if (!hadContent) {
          // Nothing was server-rendered (no fallback collection configured)
          // and the recommendations endpoint returned nothing either.
          el.closest('.shopify-section')?.setAttribute('hidden', '');
        }
        // If the fetch comes back empty but content was already showing
        // (e.g. a fallback collection), that content is left untouched —
        // this branch intentionally does nothing.
      })
      .catch(() => {
        if (!el.innerHTML.trim()) {
          el.closest('.shopify-section')?.setAttribute('hidden', '');
        }
      });
  }

  function init() {
    const targets = document.querySelectorAll('related-products[data-product-id]');
    if (targets.length === 0) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadSection(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px' });

      targets.forEach((el) => observer.observe(el));
    } else {
      targets.forEach(loadSection);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();