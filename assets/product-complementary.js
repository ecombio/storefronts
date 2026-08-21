(function () {
  const section = document.querySelector('.product-recommendations--complementary');
  if (!section) return;

  const url = section.dataset.url;
  const isDesignMode = typeof Shopify !== 'undefined' && Shopify.designMode;

  const formatMoney = (cents) => {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney && window.theme && window.theme.moneyFormat) {
      return Shopify.formatMoney(cents, window.theme.moneyFormat);
    }
    return '$' + (cents / 100).toFixed(2);
  };

  const initInteractions = (root) => {
    const checkboxes = root.querySelectorAll('.fbt__checkbox');
    const totalEl = root.querySelector('[data-fbt-total]');
    const addAllBtn = root.querySelector('[data-fbt-add-all]');
    if (!checkboxes.length || !totalEl || !addAllBtn) return;

    const addAllLabelTemplate = addAllBtn.dataset.labelTemplate || addAllBtn.textContent.trim();
    if (!addAllBtn.dataset.labelTemplate) {
      addAllBtn.dataset.labelTemplate = addAllLabelTemplate;
    }

    const recalc = () => {
      let totalCents = 0;
      let checkedCount = 0;

      checkboxes.forEach((cb) => {
        if (cb.checked) {
          totalCents += parseInt(cb.dataset.price || '0', 10);
          checkedCount += 1;
        }
      });

      totalEl.textContent = formatMoney(totalCents);
      addAllBtn.textContent = addAllBtn.dataset.labelTemplate.replace('{{ count }}', checkedCount).replace('{count}', checkedCount);
      addAllBtn.disabled = checkedCount === 0;
    };

    checkboxes.forEach((cb) => {
      cb.addEventListener('change', recalc);
    });

    addAllBtn.addEventListener('click', () => {
      const items = [];
      checkboxes.forEach((cb) => {
        if (cb.checked && cb.dataset.variantId) {
          items.push({ id: parseInt(cb.dataset.variantId, 10), quantity: 1 });
        }
      });

      if (!items.length) return;

      addAllBtn.disabled = true;
      const originalText = addAllBtn.textContent;
      addAllBtn.textContent = '...';

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items })
      })
        .then((response) => {
          if (!response.ok) throw new Error('Cart add failed');
          return response.json();
        })
        .then(() => {
          document.dispatchEvent(new CustomEvent('cart:updated'));
          window.location.href = '/cart';
        })
        .catch((e) => {
          console.error(e);
          addAllBtn.disabled = false;
          addAllBtn.textContent = originalText;
        });
    });

    recalc();
  };

  const hasRenderedItems = (rootEl) => {
    const row = rootEl.querySelector('.fbt__row');
    return !!(row && row.children.length > 0);
  };

  const setLoading = (isLoading) => {
    section.dataset.loading = isLoading ? 'true' : 'false';
  };

  const applyResponseHtml = (text) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = text;
    const fetched = wrapper.querySelector('.product-recommendations--complementary');
    if (fetched && hasRenderedItems(fetched)) {
      section.innerHTML = fetched.innerHTML;
      initInteractions(section);
      return true;
    }
    return false;
  };

  const fetchOnce = () => {
    return fetch(url, { cache: 'no-store' })
      .then((response) => response.text())
      .then((text) => applyResponseHtml(text))
      .catch((e) => {
        console.error(e);
        return false;
      });
  };

  const fetchWithRetry = (attemptsLeft, delayMs) => {
    setLoading(true);

    fetchOnce().then((succeeded) => {
      if (succeeded) {
        setLoading(false);
        return;
      }

      if (attemptsLeft > 0) {
        setTimeout(() => {
          fetchWithRetry(attemptsLeft - 1, delayMs);
        }, delayMs);
      } else {
        setLoading(false);
      }
    });
  };

  if (isDesignMode) {
    fetchWithRetry(3, 1500);

    document.addEventListener('shopify:section:load', (event) => {
      if (!event.target || !event.target.contains) return;
      const reloadedSection = event.target.querySelector('.product-recommendations--complementary');
      if (reloadedSection) {
        fetchWithRetry(3, 1500);
      }
    });
  } else {
    // If the section rendered with products already present (server-rendered),
    // wire up interactions right away.
    if (hasRenderedItems(section)) {
      initInteractions(section);
    }

    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(section);
      fetchOnce();
    };

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '0px 0px 200px 0px'
    });

    observer.observe(section);
  }
})();
