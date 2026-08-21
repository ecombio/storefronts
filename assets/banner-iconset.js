(() => {
  const SELECTOR = '[data-banner-iconset]';

  class BannerIconset {
    constructor(root) {
      this.root = root;
      this.track = root.querySelector('[data-banner-iconset-track]');
      this.prevBtn = root.querySelector('[data-banner-iconset-prev]');
      this.nextBtn = root.querySelector('[data-banner-iconset-next]');
      this.dotsWrapper = root.querySelector('[data-banner-iconset-dots]');
      this.slides = Array.from(root.querySelectorAll('[data-banner-iconset-slide]'));

      if (!this.track || this.slides.length === 0) return;

      this.autoplayEnabled = root.dataset.autoplay === 'true';
      this.autoplaySpeed = parseInt(root.dataset.autoplaySpeed, 10) || 5000;
      this.autoplayTimer = null;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.activeIndex = 0;

      this.onPrevClick = this.onPrevClick.bind(this);
      this.onNextClick = this.onNextClick.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onKeydown = this.onKeydown.bind(this);
      this.stopAutoplay = this.stopAutoplay.bind(this);
      this.maybeStartAutoplay = this.maybeStartAutoplay.bind(this);

      this.buildDots();
      this.bindEvents();
      this.update();
      this.observeSlides();

      if (this.autoplayEnabled && !this.reducedMotion) {
        this.startAutoplay();
      }
    }

    /* ---------- Setup ---------- */

    getSlidesPerView() {
      const width = window.innerWidth;
      const styles = getComputedStyle(this.root);
      if (width >= 990) return parseFloat(styles.getPropertyValue('--slides-desktop')) || 1;
      if (width >= 750) return parseFloat(styles.getPropertyValue('--slides-tablet')) || 1;
      return parseFloat(styles.getPropertyValue('--slides-mobile')) || 1;
    }

    buildDots() {
      if (!this.dotsWrapper) return;
      this.dotsWrapper.innerHTML = '';

      const perView = this.getSlidesPerView();
      const pageCount = Math.max(1, Math.ceil(this.slides.length / perView));

      if (pageCount <= 1) {
        this.dotsWrapper.hidden = true;
        this.dots = [];
        return;
      }

      this.dotsWrapper.hidden = false;
      this.dots = [];

      for (let i = 0; i < pageCount; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'banner-iconset__dot';
        dot.setAttribute('aria-label', `Go to card group ${i + 1}`);
        if (i === 0) dot.classList.add('is-active');
        dot.addEventListener('click', () => this.goToPage(i));
        this.dotsWrapper.appendChild(dot);
        this.dots.push(dot);
      }
    }

    bindEvents() {
      if (this.prevBtn) this.prevBtn.addEventListener('click', this.onPrevClick);
      if (this.nextBtn) this.nextBtn.addEventListener('click', this.onNextClick);

      this.track.addEventListener('scroll', this.onScroll, { passive: true });
      this.track.addEventListener('keydown', this.onKeydown);
      window.addEventListener('resize', this.onResize);

      // Re-check overflow once layout has actually settled (fonts loading,
      // theme-editor re-renders, etc.) — the constructor's update() call
      // can run before scrollWidth/clientWidth are accurate.
      window.addEventListener('load', () => this.update());

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => this.update());
        this.resizeObserver.observe(this.track);
      }

      ['pointerdown', 'focusin', 'mouseenter'].forEach((evt) => {
        this.root.addEventListener(evt, this.stopAutoplay);
      });
      ['pointerup', 'focusout', 'mouseleave'].forEach((evt) => {
        this.root.addEventListener(evt, this.maybeStartAutoplay);
      });
    }

    onKeydown(event) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.onNextClick();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.onPrevClick();
      }
    }

    /* ---------- Navigation ---------- */

    getStep() {
      const slide = this.slides[0];
      const styles = getComputedStyle(this.track);
      const gap = parseFloat(styles.columnGap || styles.gap || '0');
      return slide.getBoundingClientRect().width + gap;
    }

    onPrevClick() {
      const perView = Math.max(1, Math.floor(this.getSlidesPerView()));
      this.track.scrollBy({ left: -this.getStep() * perView, behavior: this.reducedMotion ? 'auto' : 'smooth' });
    }

    onNextClick() {
      const perView = Math.max(1, Math.floor(this.getSlidesPerView()));
      this.track.scrollBy({ left: this.getStep() * perView, behavior: this.reducedMotion ? 'auto' : 'smooth' });
    }

    goToPage(pageIndex) {
      const perView = this.getSlidesPerView();
      const slideIndex = Math.round(pageIndex * perView);
      const target = this.slides[slideIndex];
      if (!target) return;
      this.track.scrollTo({
        left: target.offsetLeft - this.track.offsetLeft,
        behavior: this.reducedMotion ? 'auto' : 'smooth',
      });
    }

    onScroll() {
      if (this.scrollRaf) return;
      this.scrollRaf = requestAnimationFrame(() => {
        this.update();
        this.scrollRaf = null;
      });
    }

    onResize() {
      this.buildDots();
      this.update();
    }

    observeSlides() {
      this.slideObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              const index = this.slides.indexOf(entry.target);
              if (index !== -1) this.setActivePage(index);
            }
          });
        },
        { root: this.track, threshold: [0.6] }
      );
      this.slides.forEach((slide) => this.slideObserver.observe(slide));
    }

    setActivePage(slideIndex) {
      const perView = this.getSlidesPerView();
      const pageIndex = Math.floor(slideIndex / perView);
      if (pageIndex === this.activeIndex) return;
      this.activeIndex = pageIndex;

      if (this.dots) {
        this.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === pageIndex));
      }
    }

    /* ---------- Overflow / fade edges + disabled arrow state ---------- */

    update() {
      const { scrollLeft, scrollWidth, clientWidth } = this.track;
      const maxScroll = scrollWidth - clientWidth;
      const atStart = scrollLeft <= 1;
      const atEnd = scrollLeft >= maxScroll - 1;
      const hasOverflow = maxScroll > 1;

      if (this.prevBtn) this.prevBtn.disabled = !hasOverflow || atStart;
      if (this.nextBtn) this.nextBtn.disabled = !hasOverflow || atEnd;

      this.root.classList.toggle('has-overflow-start', hasOverflow && !atStart);
      this.root.classList.toggle('has-overflow-end', hasOverflow && !atEnd);
    }

    /* ---------- Autoplay ---------- */

    startAutoplay() {
      this.stopAutoplay();
      this.autoplayTimer = setInterval(() => {
        const { scrollLeft, scrollWidth, clientWidth } = this.track;
        if (scrollLeft + clientWidth >= scrollWidth - 1) {
          this.track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          this.onNextClick();
        }
      }, this.autoplaySpeed);
    }

    stopAutoplay() {
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
        this.autoplayTimer = null;
      }
    }

    maybeStartAutoplay() {
      if (this.autoplayEnabled && !this.reducedMotion) this.startAutoplay();
    }
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach((root) => {
      if (root.__bannerIconset) return;
      root.__bannerIconset = new BannerIconset(root);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init when Shopify theme editor injects/re-renders a section
  document.addEventListener('shopify:section:load', (event) => {
    const root = event.target.querySelector(SELECTOR);
    if (root) new BannerIconset(root);
  });
})();