(function () {
  const relatedSection = document.querySelector('.product-recommendations--related');
  if (!relatedSection) return;

  const url = relatedSection.dataset.url;
  const isDesignMode = typeof Shopify !== 'undefined' && Shopify.designMode;

  const initCarousel = (root) => {
    const track = root.querySelector('[data-carousel-track]');
    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    if (!track || !prevBtn || !nextBtn) return;

    const scrollAmount = () => {
      const item = track.querySelector('.product-recommendations__item');
      if (!item) return track.clientWidth;
      const itemWidth = item.getBoundingClientRect().width;
      const gap = 24; // matches 1.5rem gap in CSS
      return itemWidth + gap;
    };

    const updateArrowState = () => {
      const maxScroll = track.scrollWidth - track.clientWidth - 1;
      prevBtn.disabled = track.scrollLeft <= 0;
      nextBtn.disabled = track.scrollLeft >= maxScroll;
    };

    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });

    track.addEventListener('scroll', updateArrowState, { passive: true });
    window.addEventListener('resize', updateArrowState);

    updateArrowState();
  };

  const fetchRecommendations = () => {
    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('.product-recommendations--related');

        if (recommendations && recommendations.innerHTML.trim().length) {
          relatedSection.innerHTML = recommendations.innerHTML;
          initCarousel(relatedSection);
        }
      })
      .catch((e) => {
        console.error(e);
      });
  };

  if (isDesignMode) {
    // In the theme editor, fetch immediately so merchants see results
    // without relying on scroll-triggered IntersectionObserver behavior.
    fetchRecommendations();
  } else {
    // If the section rendered with products already present (server-rendered),
    // wire up the carousel right away.
    if (relatedSection.querySelector('[data-carousel-track]')) {
      initCarousel(relatedSection);
    }

    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;

      observer.unobserve(relatedSection);
      fetchRecommendations();
    };

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '0px 0px 200px 0px'
    });

    observer.observe(relatedSection);
  }
})();