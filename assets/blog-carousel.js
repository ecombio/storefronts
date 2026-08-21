if (!customElements.get('blog-carousel')) {
  class BlogCarousel extends HTMLElement {
    constructor() {
      super();
      this.track = this.querySelector('.blog-carousel__track');
      this.viewport = this.querySelector('.blog-carousel__viewport');
      this.prevButton = this.querySelector('.blog-carousel__nav-button--prev');
      this.nextButton = this.querySelector('.blog-carousel__nav-button--next');
      this.dotsWrapper = this.querySelector('.blog-carousel__dots');
      this.slides = Array.from(this.querySelectorAll('.blog-carousel__slide'));

      this.autoplayEnabled = this.dataset.autoplay === 'true';
      this.autoplaySpeed = parseInt(this.dataset.autoplaySpeed, 10) || 5000;
      this.autoplayTimer = null;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.activeIndex = 0;
    }

    connectedCallback() {
      if (!this.track || this.slides.length === 0) return;

      this.buildDots();
      this.bindEvents();
      this.updateNavState();
      this.observeSlides();

      if (this.autoplayEnabled && !this.reducedMotion) {
        this.startAutoplay();
      }
    }

    disconnectedCallback() {
      this.stopAutoplay();
      if (this.slideObserver) this.slideObserver.disconnect();
      if (this.resizeObserver) this.resizeObserver.disconnect();
    }

    /* ---------- Setup ---------- */

    getSlidesPerView() {
      const width = window.innerWidth;
      const styles = getComputedStyle(this);
      if (width >= 990) return parseInt(styles.getPropertyValue('--slides-desktop'), 10) || 4;
      if (width >= 750) return parseInt(styles.getPropertyValue('--slides-tablet'), 10) || 2;
      return parseInt(styles.getPropertyValue('--slides-mobile'), 10) || 1;
    }

    buildDots() {
      if (!this.dotsWrapper) return;
      this.dotsWrapper.innerHTML = '';

      const perView = this.getSlidesPerView();
      const pageCount = Math.max(1, Math.ceil(this.slides.length / perView));

      if (pageCount <= 1) {
        this.dotsWrapper.hidden = true;
        return;
      }

      this.dotsWrapper.hidden = false;
      this.dots = [];

      for (let i = 0; i < pageCount; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'blog-carousel__dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Go to slide group ${i + 1}`);
        dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        dot.addEventListener('click', () => this.goToPage(i));
        this.dotsWrapper.appendChild(dot);
        this.dots.push(dot);
      }
    }

    bindEvents() {
      if (this.prevButton) {
        this.prevButton.addEventListener('click', () => this.scrollByDirection(-1));
      }
      if (this.nextButton) {
        this.nextButton.addEventListener('click', () => this.scrollByDirection(1));
      }

      this.track.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          this.scrollByDirection(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          this.scrollByDirection(-1);
        }
      });

      this.track.addEventListener('scroll', () => this.updateNavState(), { passive: true });

      ['pointerdown', 'focusin', 'mouseenter'].forEach((evt) => {
        this.addEventListener(evt, () => this.stopAutoplay());
      });
      ['pointerup', 'focusout', 'mouseleave'].forEach((evt) => {
        this.addEventListener(evt, () => {
          if (this.autoplayEnabled && !this.reducedMotion) this.startAutoplay();
        });
      });

      let resizeTimeout;
      this.resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.buildDots();
          this.updateNavState();
        }, 150);
      });
      this.resizeObserver.observe(this);
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

    /* ---------- Navigation ---------- */

    getSlideStep() {
      const firstSlide = this.slides[0];
      const gap = parseFloat(getComputedStyle(this).getPropertyValue('--carousel-gap')) || 0;
      return firstSlide.getBoundingClientRect().width + gap;
    }

    scrollByDirection(direction) {
      const perView = this.getSlidesPerView();
      const step = this.getSlideStep() * perView;
      this.track.scrollBy({ left: step * direction, behavior: this.reducedMotion ? 'auto' : 'smooth' });
    }

    goToPage(pageIndex) {
      const perView = this.getSlidesPerView();
      const slideIndex = pageIndex * perView;
      const target = this.slides[slideIndex];
      if (!target) return;
      this.track.scrollTo({
        left: target.offsetLeft - this.track.offsetLeft,
        behavior: this.reducedMotion ? 'auto' : 'smooth',
      });
    }

    setActivePage(slideIndex) {
      const perView = this.getSlidesPerView();
      const pageIndex = Math.floor(slideIndex / perView);
      if (pageIndex === this.activeIndex) return;
      this.activeIndex = pageIndex;

      if (this.dots) {
        this.dots.forEach((dot, i) => {
          dot.setAttribute('aria-selected', i === pageIndex ? 'true' : 'false');
        });
      }
    }

    updateNavState() {
      if (!this.prevButton && !this.nextButton) return;
      const { scrollLeft, scrollWidth, clientWidth } = this.track;
      const atStart = scrollLeft <= 1;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;

      if (this.prevButton) this.prevButton.disabled = atStart;
      if (this.nextButton) this.nextButton.disabled = atEnd;
    }

    /* ---------- Autoplay ---------- */

    startAutoplay() {
      this.stopAutoplay();
      this.autoplayTimer = setInterval(() => {
        const { scrollLeft, scrollWidth, clientWidth } = this.track;
        if (scrollLeft + clientWidth >= scrollWidth - 1) {
          this.track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          this.scrollByDirection(1);
        }
      }, this.autoplaySpeed);
    }

    stopAutoplay() {
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
        this.autoplayTimer = null;
      }
    }
  }

  customElements.define('blog-carousel', BlogCarousel);
}
