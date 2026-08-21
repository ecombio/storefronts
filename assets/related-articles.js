/**
 * Related Article Carousel
 * Self-contained, no dependencies.
 * Supports responsive columns: 3 desktop / 2 tablet / 1 mobile.
 */

(function () {
  'use strict';

  function RelatedArticleCarousel(section) {
    this.section   = section;
    this.track     = section.querySelector('.related-article__track');
    this.slides    = Array.from(section.querySelectorAll('.related-article__slide'));
    this.btnPrev   = section.querySelector('.related-article__btn--prev');
    this.btnNext   = section.querySelector('.related-article__btn--next');

    this.currentIndex = 0;

    this._onResize = this._debounce(this.reset.bind(this), 200);

    this._bindEvents();
    this.reset();
  }

  /** Return how many cards are visible at the current viewport width. */
  RelatedArticleCarousel.prototype._visibleCount = function () {
    var width = window.innerWidth;
    if (width <= 640)  return 1;
    if (width <= 1024) return 2;
    return 3;
  };

  /** Slide to a given index (clamped). */
  RelatedArticleCarousel.prototype._goTo = function (index) {
    var maxIndex = Math.max(0, this.slides.length - this._visibleCount());
    this.currentIndex = Math.min(Math.max(index, 0), maxIndex);

    // Calculate offset: each slide width = track width / visibleCount
    var slideWidth = this.track.offsetWidth / this._visibleCount();
    var gap = 24; // must match the CSS gap value
    var offset = this.currentIndex * (slideWidth + gap);

    this.track.style.transform = 'translateX(-' + offset + 'px)';
    this._updateButtons();
  };

  /** Enable / disable prev-next buttons based on position. */
  RelatedArticleCarousel.prototype._updateButtons = function () {
    var maxIndex = Math.max(0, this.slides.length - this._visibleCount());
    this.btnPrev.disabled = this.currentIndex <= 0;
    this.btnNext.disabled = this.currentIndex >= maxIndex;
  };

  /** Reset position and button state (called on init and resize). */
  RelatedArticleCarousel.prototype.reset = function () {
    // Clamp current index in case visible count changed
    var maxIndex = Math.max(0, this.slides.length - this._visibleCount());
    if (this.currentIndex > maxIndex) {
      this.currentIndex = maxIndex;
    }
    this._goTo(this.currentIndex);
  };

  /** Attach click and resize listeners. */
  RelatedArticleCarousel.prototype._bindEvents = function () {
    this.btnPrev.addEventListener('click', function () {
      this._goTo(this.currentIndex - 1);
    }.bind(this));

    this.btnNext.addEventListener('click', function () {
      this._goTo(this.currentIndex + 1);
    }.bind(this));

    window.addEventListener('resize', this._onResize);
  };

  /** Simple debounce utility. */
  RelatedArticleCarousel.prototype._debounce = function (fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  };

  /** Init all carousels on the page. */
  function init() {
    var sections = document.querySelectorAll('.related-article');
    sections.forEach(function (section) {
      new RelatedArticleCarousel(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();