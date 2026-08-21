/**
 * Product Carousel
 * -----------------
 * Progressively enhances a native scroll-snap row (built from your
 * existing product-card markup) into a full carousel: responsive
 * slides-per-view, prev/next arrows, dots, drag/swipe, optional
 * autoplay and loop. No external dependencies.
 *
 * Works with any number of [data-product-carousel] instances on a page.
 */

class ProductCarousel {
  constructor(root) {
    this.root = root;
    this.viewport = root.querySelector('[data-carousel-viewport]');
    this.track = root.querySelector('[data-carousel-track]');
    this.slides = Array.from(root.querySelectorAll('[data-carousel-slide]'));
    this.prevBtn = root.querySelector('[data-carousel-prev]');
    this.nextBtn = root.querySelector('[data-carousel-next]');
    this.dotsWrap = root.querySelector('[data-carousel-dots]');

    if (!this.track || this.slides.length === 0) return;

    this.slidesDesktop = parseInt(root.dataset.slidesDesktop, 10) || 4;
    this.slidesTablet = parseInt(root.dataset.slidesTablet, 10) || 3;
    this.slidesMobile = parseInt(root.dataset.slidesMobile, 10) || 1;
    this.gap = parseInt(root.dataset.gap, 10) || 16;
    this.loop = root.dataset.loop === 'true';
    this.autoplay = root.dataset.autoplay === 'true';
    this.autoplaySpeed = parseInt(root.dataset.autoplaySpeed, 10) || 4000;

    this.currentIndex = 0;
    this.dragStartX = 0;
    this.dragCurrentX = 0;
    this.isDragging = false;
    this.baseTranslate = 0;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.onResize = this.debounce(this.onResize.bind(this), 150);

    this.init();
  }

  init() {
    this.root.classList.add('is-carousel-js');
    this.updateSlidesPerView();
    this.buildDots();
    this.bindEvents();
    this.goTo(0, false);
    this.updateArrowState();
    if (this.autoplay) this.startAutoplay();
  }

  updateSlidesPerView() {
    const width = window.innerWidth;
    if (width >= 990) {
      this.slidesPerView = this.slidesDesktop;
    } else if (width >= 750) {
      this.slidesPerView = this.slidesTablet;
    } else {
      this.slidesPerView = this.slidesMobile;
    }
    this.maxIndex = Math.max(this.slides.length - this.slidesPerView, 0);
  }

  buildDots() {
    if (!this.dotsWrap) return;
    this.dotsWrap.innerHTML = '';
    this.updateSlidesPerView();
    const dotCount = this.maxIndex + 1;

    if (dotCount <= 1) {
      this.dotsWrap.hidden = true;
      return;
    }
    this.dotsWrap.hidden = false;

    this.dots = [];
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'product-carousel__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => {
        this.goTo(i);
        this.restartAutoplay();
      });
      this.dotsWrap.appendChild(dot);
      this.dots.push(dot);
    }
  }

  updateDots() {
    if (!this.dots) return;
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === this.currentIndex);
    });
  }

  bindEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.goTo(this.currentIndex - 1);
        this.restartAutoplay();
      });
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.goTo(this.currentIndex + 1);
        this.restartAutoplay();
      });
    }

    window.addEventListener('resize', this.onResize);

    // Pointer-based drag / swipe
    this.track.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));

    // Pause autoplay on hover/focus
    this.root.addEventListener('mouseenter', () => this.stopAutoplay());
    this.root.addEventListener('mouseleave', () => {
      if (this.autoplay) this.startAutoplay();
    });
    this.root.addEventListener('focusin', () => this.stopAutoplay());
    this.root.addEventListener('focusout', () => {
      if (this.autoplay) this.startAutoplay();
    });

    // Keyboard support
    this.root.setAttribute('tabindex', '0');
    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.goTo(this.currentIndex - 1);
        this.restartAutoplay();
      } else if (e.key === 'ArrowRight') {
        this.goTo(this.currentIndex + 1);
        this.restartAutoplay();
      }
    });
  }

  onResize() {
    this.updateSlidesPerView();
    this.buildDots();
    this.goTo(Math.min(this.currentIndex, this.maxIndex), false);
    this.updateArrowState();
  }

  slideWidthWithGap() {
    const slideRect = this.slides[0].getBoundingClientRect();
    return slideRect.width + this.gap;
  }

  goTo(index, animate = true) {
    if (this.loop) {
      if (index < 0) index = this.maxIndex;
      if (index > this.maxIndex) index = 0;
    } else {
      index = Math.max(0, Math.min(index, this.maxIndex));
    }

    this.currentIndex = index;
    const offset = -(index * this.slideWidthWithGap());

    this.track.style.transition =
      animate && !this.reducedMotion ? '' : 'none';
    this.track.style.transform = `translateX(${offset}px)`;

    // Force reflow to apply "none" transition before re-enabling it next call
    if (!animate) {
      // eslint-disable-next-line no-unused-expressions
      this.track.offsetHeight;
      this.track.style.transition = '';
    }

    this.updateDots();
    this.updateArrowState();
  }

  updateArrowState() {
    if (this.loop) return; // arrows always active when looping
    if (this.prevBtn) this.prevBtn.disabled = this.currentIndex <= 0;
    if (this.nextBtn) this.nextBtn.disabled = this.currentIndex >= this.maxIndex;
  }

  // ---- Drag / swipe ----

  onPointerDown(e) {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.baseTranslate = -(this.currentIndex * this.slideWidthWithGap());
    this.track.classList.add('is-dragging');
    this.stopAutoplay();
  }

  onPointerMove(e) {
    if (!this.isDragging) return;
    this.dragCurrentX = e.clientX;
    const delta = this.dragCurrentX - this.dragStartX;
    this.track.style.transform = `translateX(${this.baseTranslate + delta}px)`;
  }

  onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.track.classList.remove('is-dragging');

    const delta = this.dragCurrentX - this.dragStartX;
    const threshold = this.slideWidthWithGap() * 0.2;

    if (delta > threshold) {
      this.goTo(this.currentIndex - 1);
    } else if (delta < -threshold) {
      this.goTo(this.currentIndex + 1);
    } else {
      this.goTo(this.currentIndex); // snap back
    }

    this.dragStartX = 0;
    this.dragCurrentX = 0;
    if (this.autoplay) this.startAutoplay();
  }

  // ---- Autoplay ----

  startAutoplay() {
    this.stopAutoplay();
    if (this.reducedMotion) return;
    this._autoplayTimer = setInterval(() => {
      this.goTo(this.currentIndex + 1);
    }, this.autoplaySpeed);
  }

  stopAutoplay() {
    if (this._autoplayTimer) clearInterval(this._autoplayTimer);
  }

  restartAutoplay() {
    if (this.autoplay) this.startAutoplay();
  }

  debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }
}

function initProductCarousels() {
  document
    .querySelectorAll('[data-product-carousel]')
    .forEach((root) => new ProductCarousel(root));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductCarousels);
} else {
  initProductCarousels();
}

// Re-init inside Shopify theme editor when this section is added/re-rendered
document.addEventListener('shopify:section:load', (event) => {
  const root = event.target.querySelector('[data-product-carousel]');
  if (root) new ProductCarousel(root);
});
