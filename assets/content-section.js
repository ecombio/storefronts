/**
 * assets/content-section.js
 * ---------------------------------------------------------
 * Lazy media loader for sections/content-section.liquid.
 *
 * Native <video> elements and embedded YouTube/Vimeo facades
 * are only given a real src once they scroll near the viewport
 * (or, for facades without autoplay, on click) so a page with
 * several content sections doesn't fetch every video on load.
 *
 * Native videos carry two candidate sources — data-video-mobile-src
 * and data-video-desktop-src, picked in liquid to be "big enough"
 * for each breakpoint rather than always the largest file Shopify
 * has — and we choose between them once, at load time, based on
 * viewport width. This avoids shipping a desktop-resolution mp4 to
 * a phone (or vice versa) just because it happened to be the only
 * source the section ever requested.
 *
 * Guarded with window.__contentSectionMediaInit so it only sets
 * up one IntersectionObserver for the whole page, no matter how
 * many content-section instances are rendered.
 * ---------------------------------------------------------
 */
(function () {
  if (window.__contentSectionMediaInit) return;
  window.__contentSectionMediaInit = true;

  var MOBILE_QUERY = '(max-width: 749px)';

  function playNativeVideo(el) {
    if (el.dataset.videoLoaded) return;

    var isMobile = window.matchMedia(MOBILE_QUERY).matches;
    var src =
      (isMobile ? el.dataset.videoMobileSrc : el.dataset.videoDesktopSrc) ||
      el.dataset.videoDesktopSrc ||
      el.dataset.videoMobileSrc;
    if (!src) return;

    el.dataset.videoLoaded = 'true';
    el.src = src;
    el.load();
    if (el.dataset.videoAutoplay === 'true') {
      var playPromise = el.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});
    }
  }

  function buildEmbedUrl(host, id, autoplay) {
    if (host === 'youtube') {
      return (
        'https://www.youtube.com/embed/' + id +
        '?rel=0&playsinline=1' + (autoplay ? '&autoplay=1&mute=1' : '')
      );
    }
    if (host === 'vimeo') {
      return (
        'https://player.vimeo.com/video/' + id +
        '?dnt=1' + (autoplay ? '&autoplay=1&muted=1' : '')
      );
    }
    return '';
  }

  function loadFacade(el) {
    if (el.dataset.videoLoaded) return;
    el.dataset.videoLoaded = 'true';

    var host = el.dataset.videoHost;
    var id = el.dataset.videoId;
    var autoplay = el.dataset.videoAutoplay === 'true';

    var iframe = document.createElement('iframe');
    iframe.src = buildEmbedUrl(host, id, autoplay);
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    iframe.className = 'content-section__video';
    el.replaceWith(iframe);
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;

        if (el.tagName === 'VIDEO') {
          playNativeVideo(el);
        } else if (el.dataset.videoFacade !== undefined) {
          // Only auto-load on scroll-into-view if autoplay was requested;
          // otherwise wait for a click so we don't spend bandwidth on a
          // video the visitor may never press play on.
          if (el.dataset.videoAutoplay === 'true') loadFacade(el);
        }

        observer.unobserve(el);
      });
    },
    { rootMargin: '200px 0px' }
  );

  function bindFacadeClicks() {
    document
      .querySelectorAll('[data-video-facade]:not([data-bound])')
      .forEach(function (el) {
        el.setAttribute('data-bound', 'true');
        el.addEventListener('click', function () {
          loadFacade(el);
        });
      });
  }

  function observeAll() {
    document
      .querySelectorAll('[data-video-desktop-src], [data-video-facade]')
      .forEach(function (el) {
        observer.observe(el);
      });
    bindFacadeClicks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeAll);
  } else {
    observeAll();
  }

  // Theme editor: re-observe newly injected markup when this section
  // (or a page containing it) is reloaded in the customizer.
  if (window.Shopify && Shopify.designMode) {
    document.addEventListener('shopify:section:load', observeAll);
  }
})();