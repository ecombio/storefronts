/* ============================================================
   Collection Orbit Slider — collection-orbit-slider.js
   Place in: /assets/collection-orbit-slider.js
   ============================================================ */

(function () {
  'use strict';

  class OrbitSlider {
    constructor(section) {
      this.section   = section;
      this.track     = section.querySelector('.orbit-slider__track');
      this.btnPrev   = section.querySelector('.orbit-slider__nav--prev');
      this.btnNext   = section.querySelector('.orbit-slider__nav--next');
      this.fadeLeft  = section.querySelector('.orbit-slider__fade--left');
      this.fadeRight = section.querySelector('.orbit-slider__fade--right');

      if (!this.track) return;

      this._scrollStep = 260; // px per button click

      this._bindDrag();
      this._bindNav();
      this._bindScroll();
      this._updateState();
    }

    /* ---- Drag-to-scroll ---- */
    _bindDrag() {
      const track = this.track;
      let isDown = false;
      let startX, scrollLeft;

      track.addEventListener('mousedown', (e) => {
        isDown = true;
        track.classList.add('is-dragging');
        startX     = e.pageX - track.offsetLeft;
        scrollLeft = track.scrollLeft;
      });

      const end = () => {
        isDown = false;
        track.classList.remove('is-dragging');
      };

      track.addEventListener('mouseleave', end);
      track.addEventListener('mouseup',   end);

      track.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x    = e.pageX - track.offsetLeft;
        const walk = (x - startX) * 1.4;
        track.scrollLeft = scrollLeft - walk;
      });

      /* Prevent click-through after drag */
      track.addEventListener('click', (e) => {
        if (track.classList.contains('is-dragging')) e.preventDefault();
      }, true);
    }

    /* ---- Prev / Next buttons ---- */
    _bindNav() {
      [this.btnPrev, this.btnNext].forEach((btn) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
          const dir = parseInt(btn.dataset.dir, 10);
          this.track.scrollBy({ left: dir * this._scrollStep, behavior: 'smooth' });
        });
      });
    }

    /* ---- Scroll listener → update fades & nav state ---- */
    _bindScroll() {
      this.track.addEventListener('scroll', () => this._updateState(), { passive: true });
    }

    _updateState() {
      const { scrollLeft, scrollWidth, clientWidth } = this.track;
      const atStart = scrollLeft <= 2;
      const atEnd   = scrollLeft + clientWidth >= scrollWidth - 2;

      if (this.fadeLeft)  this.fadeLeft.classList.toggle('orbit-slider__fade--hidden',  atStart);
      if (this.fadeRight) this.fadeRight.classList.toggle('orbit-slider__fade--hidden', atEnd);

      if (this.btnPrev) this.btnPrev.disabled = atStart;
      if (this.btnNext) this.btnNext.disabled = atEnd;
    }
  }

  /* ---- Init all instances on the page ---- */
  function init() {
    document.querySelectorAll('.orbit-slider').forEach((el) => new OrbitSlider(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---- Shopify Theme Editor live reload ---- */
  document.addEventListener('shopify:section:load', (e) => {
    const section = e.target.querySelector('.orbit-slider');
    if (section) new OrbitSlider(section);
  });

})();
