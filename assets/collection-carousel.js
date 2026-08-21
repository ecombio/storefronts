(() => {
  const SELECTOR = '[data-cc-carousel]';

  class CollectionCarousel {
    constructor(root) {
      this.root = root;
      this.track = root.querySelector('[data-cc-carousel-track]');
      this.prevBtn = root.querySelector('[data-cc-carousel-prev]');
      this.nextBtn = root.querySelector('[data-cc-carousel-next]');

      if (!this.track) return;

      this.isDragging = false;
      this.dragMoved = false;
      this.startX = 0;
      this.startScroll = 0;

      this.onPrevClick = this.onPrevClick.bind(this);
      this.onNextClick = this.onNextClick.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onClickCapture = this.onClickCapture.bind(this);

      this.bindEvents();
      this.update();
    }

    bindEvents() {
      if (this.prevBtn) this.prevBtn.addEventListener('click', this.onPrevClick);
      if (this.nextBtn) this.nextBtn.addEventListener('click', this.onNextClick);

      this.track.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize);

      // Pointer-based drag to scroll (mouse + pen; touch already scrolls natively)
      this.track.addEventListener('pointerdown', this.onPointerDown);
      this.track.addEventListener('pointermove', this.onPointerMove);
      this.track.addEventListener('pointerup', this.onPointerUp);
      this.track.addEventListener('pointerleave', this.onPointerUp);
      this.track.addEventListener('pointercancel', this.onPointerUp);
      this.track.addEventListener('click', this.onClickCapture, true);
    }

    getStep() {
      const item = this.track.querySelector('.cc-carousel__item');
      if (!item) return this.track.clientWidth;
      const styles = getComputedStyle(this.track);
      const gap = parseFloat(styles.columnGap || styles.gap || '0');
      const itemWidth = item.getBoundingClientRect().width;
      const visibleCount = Math.max(1, Math.floor(this.track.clientWidth / (itemWidth + gap)));
      return (itemWidth + gap) * visibleCount;
    }

    onPrevClick() {
      this.track.scrollBy({ left: -this.getStep(), behavior: 'smooth' });
    }

    onNextClick() {
      this.track.scrollBy({ left: this.getStep(), behavior: 'smooth' });
    }

    onScroll() {
      if (this.scrollRaf) return;
      this.scrollRaf = requestAnimationFrame(() => {
        this.update();
        this.scrollRaf = null;
      });
    }

    onResize() {
      this.update();
    }

    onPointerDown(event) {
      if (event.pointerType === 'touch') return; // let native touch scrolling handle this
      this.isDragging = true;
      this.dragMoved = false;
      this.startX = event.clientX;
      this.startScroll = this.track.scrollLeft;
      this.track.classList.add('is-dragging');
      this.track.setPointerCapture(event.pointerId);
    }

    onPointerMove(event) {
      if (!this.isDragging) return;
      const delta = event.clientX - this.startX;
      if (Math.abs(delta) > 4) this.dragMoved = true;
      this.track.scrollLeft = this.startScroll - delta;
    }

    onPointerUp(event) {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.track.classList.remove('is-dragging');
      try {
        this.track.releasePointerCapture(event.pointerId);
      } catch (e) {
        /* no-op */
      }
    }

    onClickCapture(event) {
      // Suppress the click that follows a drag so links aren't triggered accidentally
      if (this.dragMoved) {
        event.preventDefault();
        event.stopPropagation();
        this.dragMoved = false;
      }
    }

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
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach((root) => {
      if (root.__ccCarousel) return;
      root.__ccCarousel = new CollectionCarousel(root);
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
    if (root) new CollectionCarousel(root);
  });
})();