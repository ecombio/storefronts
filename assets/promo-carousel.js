(function () {
  function initPromoCarousel(root) {
    var track = root.querySelector('[data-pc-track]');
    if (!track) return;

    var prevBtn = root.querySelector('[data-pc-prev]');
    var nextBtn = root.querySelector('[data-pc-next]');
    var dotsWrap = root.querySelector('[data-pc-dots]');

    function pageCount() {
      if (!track.clientWidth) return 1;
      return Math.max(1, Math.round(track.scrollWidth / track.clientWidth));
    }

    function currentPage() {
      if (!track.clientWidth) return 0;
      return Math.round(track.scrollLeft / track.clientWidth);
    }

    function updateArrows() {
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 1;
      if (nextBtn) {
        var maxScroll = track.scrollWidth - track.clientWidth;
        nextBtn.disabled = track.scrollLeft >= maxScroll - 1;
      }
    }

    function updateOverflow() {
      var atStart = track.scrollLeft <= 1;
      var maxScroll = track.scrollWidth - track.clientWidth;
      var atEnd = track.scrollLeft >= maxScroll - 1;
      root.classList.toggle('has-overflow-start', !atStart);
      root.classList.toggle('has-overflow-end', !atEnd);
    }

    function updateDots() {
      if (!dotsWrap) return;
      var dots = dotsWrap.querySelectorAll('[data-pc-dot]');
      var page = currentPage();
      dots.forEach(function (dot, index) {
        dot.setAttribute('aria-current', index === page ? 'true' : 'false');
      });
    }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      var pages = pageCount();
      for (var i = 0; i < pages; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'promo-carousel__dot';
        dot.setAttribute('data-pc-dot', '');
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Go to page ' + (i + 1));
        (function (index) {
          dot.addEventListener('click', function () {
            track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
          });
        })(i);
        dotsWrap.appendChild(dot);
      }
      updateDots();
    }

    var scrollTimeout;
    function onScroll() {
      updateArrows();
      updateOverflow();
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateDots, 80);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
      });
    }

    track.addEventListener('scroll', onScroll, { passive: true });

    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        buildDots();
        updateArrows();
        updateOverflow();
      }, 150);
    });

    buildDots();
    updateArrows();
    updateOverflow();
  }

  document
    .querySelectorAll('[data-promo-carousel]')
    .forEach(initPromoCarousel);
})();