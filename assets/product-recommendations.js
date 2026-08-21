/* ============================================================
   product-recommendations.js
   Self-contained — pairs with sections/product-recommendations.liquid
   and product-recommendations.css only.

   Flow:
   1. If the section wasn't server-rendered with real recommendations
      (data-performed="false"), fetch THIS section again through
      routes.product_recommendations_url?section_id=...&product_id=...
      Shopify resolves `recommendations.products` server-side and
      returns the section's full HTML — cards and all, via
      snippets/product-card.liquid. Swap that into the track and
      reveal the section.
   2. Either way (server-rendered on load, or swapped in via fetch),
      initialize carousel behavior: arrows, dots, drag/swipe,
      autoplay, resize handling.

   NOTE: product-card.js is assumed loaded globally in theme.liquid
   (same assumption product-carousel.js makes) — this file does not
   touch Add to Cart / Wishlist / Compare / Quick View wiring. It only
   dispatches `productcard:injected` after swapping in fetched cards
   so that global listener can sync button states.
   ============================================================ */

(function () {
  'use strict';

  function fetchRecommendations(section) {
    var baseUrl   = section.getAttribute('data-recommendations-url');
    var productId = section.getAttribute('data-product-id');
    var sectionId = section.getAttribute('data-section-id');
    var limit     = section.getAttribute('data-limit');

    if (!baseUrl || !productId) return Promise.reject();

    var url = baseUrl
      + '?section_id=' + encodeURIComponent(sectionId)
      + '&product_id=' + encodeURIComponent(productId)
      + '&limit=' + encodeURIComponent(limit)
      + '&intent=related';

    return fetch(url).then(function (res) {
      return res.ok ? res.text() : Promise.reject();
    });
  }

  function swapInRecommendations(section, html) {
    var sectionId  = section.getAttribute('data-section-id');
    var doc        = new DOMParser().parseFromString(html, 'text/html');
    var newSection = doc.getElementById('pr-section-' + sectionId);
    var newTrack   = doc.getElementById('pr-track-' + sectionId);
    var track      = document.getElementById('pr-track-' + sectionId);

    // FIX: previously this only checked `newTrack.children.length === 0`,
    // but the Liquid's placeholder branch always renders `limit` shimmer
    // <li> cards into the track even when recommendations.products_count
    // is 0 — so that check never actually caught the "zero recommendations"
    // case. It would swap in shimmer placeholders and reveal the section
    // permanently instead of leaving it hidden. Checking the fetched
    // section's own data-performed attribute (set server-side from
    // recommendations.performed / products_count, same as the initial
    // render) correctly distinguishes "real cards came back" from
    // "still just placeholders."
    if (
      !newSection ||
      newSection.getAttribute('data-performed') !== 'true' ||
      !newTrack ||
      !track ||
      newTrack.children.length === 0
    ) {
      return false;
    }

    track.innerHTML = newTrack.innerHTML;
    section.removeAttribute('hidden');
    section.setAttribute('data-performed', 'true');

    document.dispatchEvent(new CustomEvent('productcard:injected', { bubbles: true }));
    return true;
  }

  function initCarousel(section) {
    var track   = section.querySelector('[data-pr-track]');
    var wrapper = section.querySelector('[data-pr-wrapper]');
    var prevBtns = Array.from(section.querySelectorAll('[data-pr-prev]'));
    var nextBtns = Array.from(section.querySelectorAll('[data-pr-next]'));
    var dotsEl  = section.querySelector('[data-pr-dots]');

    if (!track || !wrapper) return;

    var slides = Array.from(track.querySelectorAll('[data-pr-slide]'));
    if (slides.length === 0) return;

    var opts = {
      colsDesktop:   parseInt(section.dataset.colsDesktop, 10) || 4,
      colsMobile:    parseInt(section.dataset.colsMobile, 10) || 2,
      autoplay:      section.dataset.autoplay === 'true',
      autoplayMs:    parseInt(section.dataset.autoplayInterval, 10) || 4000,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    var index     = 0;
    var autoTimer = null;

    function visibleCols() {
      return window.innerWidth >= 768 ? opts.colsDesktop : opts.colsMobile;
    }
    function maxIndex() {
      return Math.max(0, slides.length - visibleCols());
    }
    function slideWidth() {
      var gap  = parseFloat(getComputedStyle(track).gap) || 16;
      var cols = visibleCols();
      var w    = wrapper.offsetWidth;
      if (!w) return 0;
      return (w - gap * (cols - 1)) / cols + gap;
    }
    function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

    function applyTranslate(offset, instant) {
      track.style.transition = (instant || opts.reducedMotion)
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

      prevBtns.forEach(function (btn) {
        btn.classList.remove('is-hidden');
        btn.toggleAttribute('disabled', atStart);
      });
      nextBtns.forEach(function (btn) {
        btn.classList.remove('is-hidden');
        btn.toggleAttribute('disabled', atEnd);
      });

      updateDots();
    }

    function buildDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      var total = maxIndex() + 1;
      if (total <= 1) { dotsEl.style.display = 'none'; return; }
      dotsEl.style.display = '';
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'pr-carousel__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.dataset.dotIndex = i;
        dotsEl.appendChild(dot);
      }
    }
    function updateDots() {
      if (!dotsEl) return;
      dotsEl.querySelectorAll('.pr-carousel__dot').forEach(function (d, i) {
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

    prevBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { goTo('prev'); resetAutoplay(); });
    });
    nextBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { goTo('next'); resetAutoplay(); });
    });

    track.setAttribute('tabindex', '0');
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { goTo('prev'); resetAutoplay(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { goTo('next'); resetAutoplay(); e.preventDefault(); }
    });

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
        if (delta < -threshold)     goTo('next');
        else if (delta > threshold) goTo('prev');
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

    function startAutoplay() {
      if (!opts.autoplay || opts.reducedMotion) return;
      stopAutoplay();
      autoTimer = setInterval(function () {
        goTo(index >= maxIndex() ? 0 : 'next');
      }, opts.autoplayMs);
    }
    function stopAutoplay()  { clearInterval(autoTimer); autoTimer = null; }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    section.addEventListener('mouseenter', stopAutoplay);
    section.addEventListener('mouseleave', startAutoplay);
    section.addEventListener('focusin',    stopAutoplay);
    section.addEventListener('focusout',   startAutoplay);

    buildDots();
    goTo(0, true);
    startAutoplay();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        buildDots();
        goTo(0, true);
      }, 150);
    });
  }

  function initSection(section) {
    var alreadyPerformed = section.getAttribute('data-performed') === 'true';

    if (alreadyPerformed) {
      initCarousel(section);
      return;
    }

    fetchRecommendations(section)
      .then(function (html) {
        var swapped = swapInRecommendations(section, html);
        if (swapped) initCarousel(section);
        // If not swapped (no recommendations came back), section
        // stays hidden — nothing further to do.
      })
      .catch(function () {
        // Silently fail — section stays hidden
      });
  }

  function init() {
    document.querySelectorAll('.pr-carousel').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var section = e.target.querySelector('.pr-carousel');
    if (section) initSection(section);
  });
})();