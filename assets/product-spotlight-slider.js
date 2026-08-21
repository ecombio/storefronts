/* ================================================================
   Product Spotlight Slider — product-spotlight-slider.js
   Place in: /assets/product-spotlight-slider.js
   ================================================================ */

(function () {
  'use strict';

  const SCROLL_STEP = 240; // px per nav button click

  class ProductSpotlightSlider {
    constructor(section) {
      this.section = section;
      this.track   = section.querySelector('.pss__track');
      this.btnPrev = section.querySelector('.pss__nav-btn--prev');
      this.btnNext = section.querySelector('.pss__nav-btn--next');

      if (!this.track) return;

      this._bindDrag();
      this._bindNav();
      this._bindScroll();
      this._updateNav();
    }

    /* ── Drag-to-scroll ── */
    _bindDrag() {
      const t = this.track;
      let isDown = false, startX, scrollLeft;

      t.addEventListener('mousedown', (e) => {
        isDown = true;
        t.classList.add('is-dragging');
        startX     = e.pageX - t.offsetLeft;
        scrollLeft = t.scrollLeft;
      });

      const end = () => { isDown = false; t.classList.remove('is-dragging'); };
      t.addEventListener('mouseleave', end);
      t.addEventListener('mouseup',   end);

      t.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x    = e.pageX - t.offsetLeft;
        const walk = (x - startX) * 1.5;
        t.scrollLeft = scrollLeft - walk;
      });

      // Prevent click-through after drag
      t.addEventListener('click', (e) => {
        if (t.classList.contains('is-dragging')) e.preventDefault();
      }, true);
    }

    /* ── Nav buttons ── */
    _bindNav() {
      if (this.btnPrev) {
        this.btnPrev.addEventListener('click', () => {
          this.track.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
        });
      }
      if (this.btnNext) {
        this.btnNext.addEventListener('click', () => {
          this.track.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
        });
      }
    }

    /* ── Scroll → update nav disabled state ── */
    _bindScroll() {
      this.track.addEventListener('scroll', () => this._updateNav(), { passive: true });
    }

    _updateNav() {
      const { scrollLeft, scrollWidth, clientWidth } = this.track;
      if (this.btnPrev) this.btnPrev.disabled = scrollLeft <= 2;
      if (this.btnNext) this.btnNext.disabled = scrollLeft + clientWidth >= scrollWidth - 2;
    }
  }

  function init() {
    document.querySelectorAll('.pss').forEach((el) => new ProductSpotlightSlider(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (e) => {
    const el = e.target.querySelector('.pss');
    if (el) new ProductSpotlightSlider(el);
  });

})();
