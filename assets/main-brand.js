document.addEventListener('DOMContentLoaded', function () {
  var directories = document.querySelectorAll('.brand-directory');

  directories.forEach(function (wrapper) {
    var nav = wrapper.querySelector('.brand-directory__alpha-nav');
    if (!nav) return;

    var sync = function () {
      wrapper.style.setProperty('--brand-nav-height', nav.offsetHeight + 'px');
    };

    sync();
    window.addEventListener('resize', sync);

    if ('ResizeObserver' in window) {
      new ResizeObserver(sync).observe(nav);
    }
  });
});
