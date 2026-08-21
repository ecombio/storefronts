document.addEventListener('DOMContentLoaded', function () {
  var directories = document.querySelectorAll('.blog-directory');

  directories.forEach(function (wrapper) {
    var nav = wrapper.querySelector('.blog-directory__alpha-nav');
    if (!nav) return;

    var sync = function () {
      wrapper.style.setProperty('--blog-nav-height', nav.offsetHeight + 'px');
    };

    sync();
    window.addEventListener('resize', sync);

    if ('ResizeObserver' in window) {
      new ResizeObserver(sync).observe(nav);
    }
  });
});
