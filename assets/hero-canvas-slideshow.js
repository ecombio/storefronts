/* ================================================================
   Hero Canvas Slideshow — hero-canvas-slideshow.js
   Place in: /assets/hero-canvas-slideshow.js
   ================================================================ */

(function () {
  'use strict';

  class HeroCanvasSlideshow {
    constructor(el) {
      this.root   = el;
      this.slides = Array.from(el.querySelectorAll('.hcs__slide'));
      this.dots   = Array.from(el.querySelectorAll('.hcs__dot'));
      this.btnPrev = el.querySelector('.hcs__arrow--prev');
      this.btnNext = el.querySelector('.hcs__arrow--next');

      this.total   = this.slides.length;
      this.current = 0;
      this.timer   = null;

      this.autoplay = el.dataset.autoplay === 'true';
      this.delay    = parseInt(el.dataset.autoplayDelay, 10) || 6000;

      // Expose delay to CSS for the dot progress bar
      el.style.setProperty('--hcs-autoplay-delay', `${this.delay}ms`);
      if (!this.autoplay) el.classList.add('hcs--no-autoplay');

      if (this.total < 2) return; // single slide — nothing to wire up

      this._bindNav();
      this._bindDots();
      this._bindPause();

      if (this.autoplay) this._startAutoplay();
    }

    /* ──────────────────────────────────────── */
    /*  Go to slide                             */
    /* ──────────────────────────────────────── */
    goTo(index) {
      const prev = this.current;
      this.current = (index + this.total) % this.total;

      // Slides
      this.slides[prev].classList.remove('is-active');
      this.slides[this.current].classList.add('is-active');

      // Reset & re-trigger motion elements on the incoming slide
      this._resetMotion(this.slides[prev]);

      // Dots
      this.dots.forEach((dot, i) => {
        const isActive = i === this.current;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-selected', String(isActive));

        // Re-trigger progress animation by cloning the progress span
        const prog = dot.querySelector('.hcs__dot-progress');
        if (prog && isActive && this.autoplay) {
          const clone = prog.cloneNode(true);
          prog.parentNode.replaceChild(clone, prog);
        }
      });
    }

    /* ──────────────────────────────────────── */
    /*  Motion reset helper                     */
    /* ──────────────────────────────────────── */
    _resetMotion(slide) {
      slide.querySelectorAll('[data-motion="fade-up"]').forEach((el) => {
        el.style.transition = 'none';
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(2.5rem)';
        // Force reflow so the next slide's transition fires fresh
        void el.offsetHeight;
        el.style.transition = '';
      });
    }

    /* ──────────────────────────────────────── */
    /*  Autoplay                                */
    /* ──────────────────────────────────────── */
    _startAutoplay() {
      this._stopAutoplay();
      this.timer = setInterval(() => this.goTo(this.current + 1), this.delay);
    }

    _stopAutoplay() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }

    /* ──────────────────────────────────────── */
    /*  Nav arrows                              */
    /* ──────────────────────────────────────── */
    _bindNav() {
      if (this.btnPrev) {
        this.btnPrev.addEventListener('click', () => {
          this.goTo(this.current - 1);
          if (this.autoplay) this._startAutoplay(); // reset timer
        });
      }
      if (this.btnNext) {
        this.btnNext.addEventListener('click', () => {
          this.goTo(this.current + 1);
          if (this.autoplay) this._startAutoplay();
        });
      }

      // Keyboard: left / right arrow keys
      this.root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  { this.goTo(this.current - 1); if (this.autoplay) this._startAutoplay(); }
        if (e.key === 'ArrowRight') { this.goTo(this.current + 1); if (this.autoplay) this._startAutoplay(); }
      });
    }

    /* ──────────────────────────────────────── */
    /*  Dot clicks                              */
    /* ──────────────────────────────────────── */
    _bindDots() {
      this.dots.forEach((dot) => {
        dot.addEventListener('click', () => {
          this.goTo(parseInt(dot.dataset.index, 10));
          if (this.autoplay) this._startAutoplay();
        });
      });
    }

    /* ──────────────────────────────────────── */
    /*  Pause on hover / focus                  */
    /* ──────────────────────────────────────── */
    _bindPause() {
      if (!this.autoplay) return;

      this.root.addEventListener('mouseenter', () => this._stopAutoplay());
      this.root.addEventListener('mouseleave', () => this._startAutoplay());
      this.root.addEventListener('focusin',    () => this._stopAutoplay());
      this.root.addEventListener('focusout',   () => this._startAutoplay());
    }
  }

  /* ── Init ── */
  function init() {
    document.querySelectorAll('.hcs').forEach((el) => new HeroCanvasSlideshow(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Shopify Theme Editor live reload ── */
  document.addEventListener('shopify:section:load', (e) => {
    const el = e.target.querySelector('.hcs');
    if (el) new HeroCanvasSlideshow(el);
  });

})();
