(function () {
  var gallery = document.getElementById('ProductGallery');
  if (!gallery) return;

  var featuredImg = document.getElementById('FeaturedImage');
  var thumbnails = gallery.querySelectorAll('.thumbnail-item');

  function selectThumbnail(thumb) {
    thumbnails.forEach(function (t) {
      t.classList.remove('active');
      t.setAttribute('aria-pressed', 'false');
    });
    thumb.classList.add('active');
    thumb.setAttribute('aria-pressed', 'true');
    if (featuredImg && thumb.dataset.imageSrc) {
      featuredImg.src = thumb.dataset.imageSrc;
      featuredImg.alt = thumb.dataset.imageAlt || '';
    }
  }

  thumbnails.forEach(function (thumb) {
    thumb.addEventListener('click', function () { selectThumbnail(this); });
    thumb.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectThumbnail(this);
      }
    });
  });

  document.addEventListener('variant:changed', function (e) {
    var variant = e.detail && e.detail.variant;
    if (!variant || !variant.featured_image) return;
    var matchIndex = variant.featured_image.position - 1;
    var target = thumbnails[matchIndex];
    if (target) selectThumbnail(target);
  });

  var viewer = document.getElementById('GalleryViewer');
  var thumbCol = gallery.querySelector('.product-thumbnails');

  if (viewer && thumbCol) {
    function syncHeight() {
      var h = viewer.getBoundingClientRect().height;
      if (h > 0) gallery.style.setProperty('--gallery-height', h + 'px');
    }
    syncHeight();
    new ResizeObserver(syncHeight).observe(viewer);
  }
})();