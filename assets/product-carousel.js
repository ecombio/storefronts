/* ============================================================
   product-carousel.js
   Each tab/panel gets its own carousel instance.
   Tabs toggle panel visibility + (re)start that panel's carousel.
   Features: arrow nav · dot nav (pill active) · drag/swipe ·
             autoplay · reduced-motion · keyboard ·
             side-arrow mode (greyed-out vs hidden when exhausted) ·
             banner width sync (banner-card matches product-card width)
   ============================================================ */

(function () {
  'use strict';

  function initPanelCarousel(panel, opts) {
    var track   = panel.querySelector('[data-carousel-track]');
    var wrapper = panel.querySelector('[data-carousel-wrapper]');
    var prevBtn = panel.querySelector('[data-carousel-prev]');
    var nextBtn = panel.querySelector('[data-carousel-next]');
    var dotsEl  = panel.querySelector('[data-carousel-dots]');
    var slides  = Array.from(panel.querySelectorAll('[data-carousel-slide]'));

    if (!track || !wrapper || slides.length === 0) return null;

    var index         = 0;
    var autoTimer     = null;
    var reducedMotion = opts.reducedMotion;
    var sideMode      = opts.arrowStyle === 'side';

    function visibleCols() {
      return window.innerWidth >= 768 ? opts.colsDesktop : opts.colsMobile;
    }
    function maxIndex() {
      return Math.max(0, slides.length - visibleCols());
    }
    function slideWidth() {
      var gap  = parseFloat(getComputedStyle(track).gap) || 12;
      var cols = visibleCols();
      var w    = wrapper.offsetWidth;
      if (!w) return 0;
      return (w - gap * (cols - 1)) / cols + gap;
    }
    function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

    function applyTranslate(offset, instant) {
      track.style.transition = (instant || reducedMotion)
        ? 'none'
        : 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
      track.style.transform = 'translateX(-' + offset + 'px)';
    }

    function goTo(newIndex, instant) {
      if (newIndex === 'prev') newIndex = index - 1;
      if (newIndex === 'next') newIndex = index + 1;
      index = clamp(newIndex, 0, maxIndex());
      applyTranslate(index * slideWidth(), instant);
      updateControls();
    }

    function updateControls() {
      var atStart = index === 0;
      var atEnd   = index >= maxIndex();

      if (prevBtn) {
        prevBtn.classList.remove('is-hidden');
        prevBtn.toggleAttribute('disabled', atStart);
      }

      if (nextBtn) {
        nextBtn.classList.remove('is-hidden');
        nextBtn.toggleAttribute('disabled', atEnd);
      }

      /* Sync top-level shared arrows if present */
      var topPrev = panel.closest('.product-carousel') && panel.closest('.product-carousel').querySelector('[data-carousel-top-prev]');
      var topNext = panel.closest('.product-carousel') && panel.closest('.product-carousel').querySelector('[data-carousel-top-next]');
      if (topPrev) topPrev.toggleAttribute('disabled', atStart);
      if (topNext) topNext.toggleAttribute('disabled', atEnd);

      updateDots();
    }

    /* ── Dots ── */
    function buildDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      var total = maxIndex() + 1;
      if (total <= 1) { dotsEl.style.display = 'none'; return; }
      dotsEl.style.display = '';
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'product-carousel__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.dataset.dotIndex = i;
        dotsEl.appendChild(dot);
      }
    }
    function updateDots() {
      if (!dotsEl) return;
      dotsEl.querySelectorAll('.product-carousel__dot').forEach(function (d, i) {
        d.classList.toggle('is-active', i === index);
      });
    }
    if (dotsEl) {
      dotsEl.addEventListener('click', function (e) {
        var dot = e.target.closest('[data-dot-index]');
        if (!dot) return;
        goTo(parseInt(dot.dataset.dotIndex, 10));
        resetAutoplay();
      });
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(index - 1); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(index + 1); resetAutoplay(); });

    /* ── Keyboard ── */
    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { goTo(index - 1); resetAutoplay(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { goTo(index + 1); resetAutoplay(); e.preventDefault(); }
    });

    /* ── Drag / swipe ── */
    var dragStart = null, dragCurrent = null, isDragging = false;

    function onPointerDown(e) {
      dragStart   = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      dragCurrent = dragStart;
      isDragging  = false;
      track.classList.remove('is-dragging');
    }
    function onPointerMove(e) {
      if (dragStart === null) return;
      dragCurrent = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      if (Math.abs(dragCurrent - dragStart) > 6) {
        isDragging = true;
        track.classList.add('is-dragging');
        var live = index * slideWidth() - (dragCurrent - dragStart);
        applyTranslate(Math.max(0, live), true);
        if (e.cancelable) e.preventDefault();
      }
    }
    function onPointerUp() {
      if (dragStart === null) return;
      var delta     = dragCurrent - dragStart;
      var threshold = slideWidth() * 0.2;
      if (isDragging) {
        if (delta < -threshold)     goTo(index + 1);
        else if (delta > threshold) goTo(index - 1);
        else                         goTo(index);
      }
      dragStart = dragCurrent = null;
      isDragging = false;
      track.classList.remove('is-dragging');
      resetAutoplay();
    }
    track.addEventListener('mousedown',  onPointerDown);
    track.addEventListener('mousemove',  onPointerMove);
    track.addEventListener('mouseup',    onPointerUp);
    track.addEventListener('mouseleave', onPointerUp);
    track.addEventListener('touchstart', onPointerDown, { passive: true });
    track.addEventListener('touchmove',  onPointerMove, { passive: false });
    track.addEventListener('touchend',   onPointerUp);
    track.addEventListener('click', function (e) {
      if (isDragging) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* ── Autoplay ── */
    function startAutoplay() {
      if (!opts.autoplay || reducedMotion) return;
      stopAutoplay();
      autoTimer = setInterval(function () {
        goTo(index >= maxIndex() ? 0 : index + 1);
      }, opts.autoplayMs);
    }
    function stopAutoplay()  { clearInterval(autoTimer); autoTimer = null; }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    var ownerSection = panel.closest('.product-carousel');
    if (ownerSection) {
      ownerSection.addEventListener('mouseenter', stopAutoplay);
      ownerSection.addEventListener('mouseleave', startAutoplay);
      ownerSection.addEventListener('focusin',    stopAutoplay);
      ownerSection.addEventListener('focusout',   startAutoplay);
    }

    /* ── Rebuild (used when a panel becomes visible / on resize) ── */
    function rebuild(instant) {
      buildDots();
      goTo(0, instant !== false);
    }

    buildDots();
    goTo(0, true);

    return {
      goTo: goTo,
      rebuild: rebuild,
      startAutoplay: startAutoplay,
      stopAutoplay: stopAutoplay
    };
  }

  function initCarousel(section) {
    var panels      = Array.from(section.querySelectorAll('[data-carousel-panel]'));
    var tabBtns     = Array.from(section.querySelectorAll('[data-carousel-tab]'));
    var topPrevBtn  = section.querySelector('[data-carousel-top-prev]');
    var topNextBtn  = section.querySelector('[data-carousel-top-next]');

    var opts = {
      colsDesktop:   parseInt(section.dataset.cardsDesktop, 10) || 3,
      colsMobile:    parseInt(section.dataset.cardsMobile, 10) || 2,
      autoplay:      section.dataset.autoplay === 'true',
      autoplayMs:    parseInt(section.dataset.autoplayInterval, 10) || 4000,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      arrowStyle:    section.dataset.arrowStyle || 'bottom'
    };

    section.style.setProperty('--_cols-desktop', opts.colsDesktop);
    section.style.setProperty('--_cols-mobile',  opts.colsMobile);

    /* ── Banner width sync ──
       Makes the banner-card's rendered width match one product-card's
       rendered width, so the layout reads as one visual "column" per
       item: [banner-card][product-card][product-card][product-card].
       Skipped on mobile, where the banner stacks full-width above the
       carousel (see product-carousel.css). */
    function syncBannerWidth() {
      var banner = section.querySelector('.product-carousel__banner');
      if (!banner) return;
      if (window.innerWidth < 768) {
        section.style.removeProperty('--pc-banner-width');
        return;
      }
      var slide = section.querySelector(
        '.product-carousel__panel:not(.is-hidden) [data-carousel-slide], ' +
        '.product-carousel__carousel-col > .product-carousel__stage [data-carousel-slide]'
      );
      if (!slide) return;
      var w = slide.getBoundingClientRect().width;
      if (w > 0) section.style.setProperty('--pc-banner-width', w + 'px');
    }

    syncBannerWidth();

    /* No tab blocks → fallback single carousel directly in section */
    if (panels.length === 0) {
      var fallback = initPanelCarousel(section, opts);
      if (fallback) {
        /* Wire top arrows directly to the single carousel */
        if (topPrevBtn) topPrevBtn.addEventListener('click', function () { fallback.goTo('prev'); });
        if (topNextBtn) topNextBtn.addEventListener('click', function () { fallback.goTo('next'); });
        fallback.startAutoplay();
      }
      syncBannerWidth();

      var fallbackResizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(fallbackResizeTimer);
        fallbackResizeTimer = setTimeout(function () {
          if (fallback) fallback.rebuild(true);
          syncBannerWidth();
        }, 150);
      });

      return;
    }

    var carousels = panels.map(function (panel) {
      return initPanelCarousel(panel, opts);
    });

    /* ── Top arrows: find active carousel and delegate ── */
    function getActiveCarousel() {
      var idx = panels.findIndex(function (p) { return !p.classList.contains('is-hidden'); });
      return idx >= 0 ? carousels[idx] : null;
    }

    if (topPrevBtn) {
      topPrevBtn.addEventListener('click', function () {
        var c = getActiveCarousel();
        if (c) c.goTo('prev');
      });
    }
    if (topNextBtn) {
      topNextBtn.addEventListener('click', function () {
        var c = getActiveCarousel();
        if (c) c.goTo('next');
      });
    }

    /* Only the initially-visible panel autoplays */
    panels.forEach(function (panel, i) {
      if (!panel.classList.contains('is-hidden') && carousels[i]) {
        carousels[i].startAutoplay();
      }
    });

    if (tabBtns.length > 0) {
      tabBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var targetId = btn.dataset.carouselTab;

          tabBtns.forEach(function (b) {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');

          panels.forEach(function (panel, i) {
            var isTarget = panel.dataset.carouselPanel === targetId;
            panel.classList.toggle('is-hidden', !isTarget);

            var c = carousels[i];
            if (!c) return;

            if (isTarget) {
              c.rebuild(true);  /* rebuild calls goTo(0) which calls updateControls → syncs top arrows */
              c.startAutoplay();
            } else {
              c.stopAutoplay();
            }
          });

          syncBannerWidth();
        });
      });
    }

    /* Sync top arrows to the initial active panel on load */
    var initialActive = getActiveCarousel();
    if (initialActive) initialActive.goTo(0, true);

    /* Resize: rebuild whichever panel is currently visible */
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        panels.forEach(function (panel, i) {
          if (!panel.classList.contains('is-hidden') && carousels[i]) {
            carousels[i].rebuild(true);
          }
        });
        syncBannerWidth();
      }, 150);
    });
  }

  function init() {
    document.querySelectorAll('.product-carousel').forEach(initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var sec = e.target.querySelector('.product-carousel');
    if (sec) initCarousel(sec);
  });

})();