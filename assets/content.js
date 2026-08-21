/**
 * content.js — sections/content.liquid
 *
 * Only job: pause self-hosted <video> elements when they scroll out
 * of view and resume when they scroll back in, so autoplaying media
 * doesn't keep decoding frames off-screen. External embeds (YouTube/
 * Vimeo iframes) are left alone since we can't control them directly
 * without their respective JS APIs.
 */

(function () {
  'use strict';

  function initContentSectionVideos(root) {
    var scope = root || document;
    var videos = scope.querySelectorAll('[data-video-wrap] video');

    if (!videos.length) return;

    if (!('IntersectionObserver' in window)) {
      // No IO support: just let autoplay/controls behave natively.
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;

          if (entry.isIntersecting) {
            var playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(function () {
                /* Autoplay can be blocked by the browser; ignore. */
              });
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    videos.forEach(function (video) {
      observer.observe(video);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initContentSectionVideos(document);
  });

  // Theme editor support: re-init when a section instance is
  // added or re-rendered (e.g. after a settings change).
  document.addEventListener('shopify:section:load', function (event) {
    if (event.target && event.target.matches('[data-section-type="content"]')) {
      initContentSectionVideos(event.target);
    }
  });
})();
