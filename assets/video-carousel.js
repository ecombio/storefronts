(function () {
  'use strict';

  function initCarousel(root) {
    var track = root.querySelector('[data-carousel-track]');
    var list = root.querySelector('[data-carousel-list]');
    var prevBtn = root.querySelector('[data-carousel-prev]');
    var nextBtn = root.querySelector('[data-carousel-next]');
    var dotsWrap = root.querySelector('[data-carousel-dots]');
    var cards = list ? Array.prototype.slice.call(list.children) : [];

    if (!track || !list || !cards.length) return;

    var perView = 1;
    var activeIndex = 0;

    function getPerView() {
      var width = window.innerWidth;
      var varName = width >= 990 ? '--vc-slides-desktop' : width >= 750 ? '--vc-slides-tablet' : '--vc-slides-mobile';
      return parseInt(getComputedStyle(root).getPropertyValue(varName), 10) || 1;
    }

    function scrollToIndex(index) {
      index = Math.max(0, Math.min(index, cards.length - 1));
      track.scrollTo({ left: cards[index].offsetLeft - list.offsetLeft, behavior: 'smooth' });
    }

    function updateArrows() {
      if (!prevBtn || !nextBtn) return;
      var maxScroll = track.scrollWidth - track.clientWidth - 1;
      prevBtn.disabled = track.scrollLeft <= 0;
      nextBtn.disabled = track.scrollLeft >= maxScroll;
    }

    function updateDots() {
      if (!dotsWrap) return;
      var pageCount = Math.max(1, Math.ceil(cards.length / perView));

      if (dotsWrap.children.length !== pageCount) {
        dotsWrap.innerHTML = '';
        for (var i = 0; i < pageCount; i++) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'video-carousel__dot';
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-label', 'Go to slide group ' + (i + 1));
          dot.addEventListener('click', (function (pageIndex) {
            return function () { scrollToIndex(pageIndex * perView); };
          })(i));
          dotsWrap.appendChild(dot);
        }
      }

      var activePage = Math.floor(activeIndex / perView);
      Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
        dot.setAttribute('aria-current', i === activePage ? 'true' : 'false');
      });
    }

    // Let the browser tell us which card is actually visible instead of
    // computing it from scrollLeft/card-width math.
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) activeIndex = cards.indexOf(entry.target);
        });
        updateArrows();
        updateDots();
      },
      { root: track, threshold: 0.6 }
    );
    cards.forEach(function (card) { observer.observe(card); });

    if (prevBtn) prevBtn.addEventListener('click', function () { scrollToIndex(activeIndex - perView); });
    if (nextBtn) nextBtn.addEventListener('click', function () { scrollToIndex(activeIndex + perView); });

    track.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') { event.preventDefault(); scrollToIndex(activeIndex + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); scrollToIndex(activeIndex - 1); }
    });

    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        perView = getPerView();
        updateDots();
        updateArrows();
      }, 150);
    });

    perView = getPerView();
    updateDots();
    updateArrows();
  }

  function initAll() {
    document.querySelectorAll('[data-video-carousel]').forEach(initCarousel);
  }

  document.addEventListener('DOMContentLoaded', initAll);

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-video-carousel]');
    if (root) initCarousel(root);
  });
})();
