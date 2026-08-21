/* assets/header-group.js */

(function () {
  const header = document.getElementById('header-group-wrapper');
  if (!header) return;

  let lastScrollY = window.scrollY;
  let ticking = false;
  let isLocked = false;
  const SCROLL_THRESHOLD = 10;

  const mainHeaderEl = document.getElementById('main-header');
  const transparentEnabled = !!mainHeaderEl && mainHeaderEl.dataset.transparentHeader === 'true';
  const TRANSPARENT_THRESHOLD = 10;
  let isTransparent = false;

  const desktopMql = window.matchMedia('(min-width: 64rem)');

  function updateTransparency() {
    if (!transparentEnabled) return;
    const shouldBeTransparent = desktopMql.matches && !isLocked && window.scrollY <= TRANSPARENT_THRESHOLD;
    if (shouldBeTransparent === isTransparent) return;
    isTransparent = shouldBeTransparent;
    header.classList.toggle('is-transparent', shouldBeTransparent);
  }

  let revealZone = header.offsetHeight;

  const root = document.documentElement;

  function syncHeaderHeightVar() {
    const height = header.offsetHeight;
    revealZone = height;
    root.style.setProperty('--header-group-height', height + 'px');
  }

  syncHeaderHeightVar();

  updateTransparency();

  if (typeof desktopMql.addEventListener === 'function') {
    desktopMql.addEventListener('change', updateTransparency);
  } else if (typeof desktopMql.addListener === 'function') {
    desktopMql.addListener(updateTransparency);
  }

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(syncHeaderHeightVar);
    resizeObserver.observe(header);
  } else {
    window.addEventListener('resize', syncHeaderHeightVar, { passive: true });
  }

  let isHidden = false;

  function setHeaderHidden(hidden) {
    if (hidden === isHidden) return;
    isHidden = hidden;
    header.classList.toggle('header--hidden', hidden);
    root.classList.toggle('header-group-hidden', hidden);
  }

  function onScroll() {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;

    if (isLocked) {
      setHeaderHidden(false);
      updateTransparency();
      lastScrollY = currentScrollY;
      ticking = false;
      return;
    }

    if (currentScrollY <= revealZone) {
      setHeaderHidden(false);
    }
    else if (delta > SCROLL_THRESHOLD) {
      setHeaderHidden(true);
    }
    else if (delta < -SCROLL_THRESHOLD) {
      setHeaderHidden(false);
    }

    updateTransparency();

    lastScrollY = currentScrollY;
    ticking = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );

  header.addEventListener('mouseenter', () => {
    isLocked = true;
    setHeaderHidden(false);
    updateTransparency();
  });

  header.addEventListener('mouseleave', () => {
    isLocked = false;
    lastScrollY = window.scrollY;
    updateTransparency();
  });

  header.addEventListener('focusin', () => {
    isLocked = true;
    setHeaderHidden(false);
    updateTransparency();
  });

  header.addEventListener('focusout', (e) => {
    if (!header.contains(e.relatedTarget)) {
      isLocked = false;
      lastScrollY = window.scrollY;
      updateTransparency();
    }
  });
})();