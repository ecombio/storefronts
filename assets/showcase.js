(function () {
  'use strict';

  var items = document.querySelectorAll('[data-showcase]');
  if (!items.length) return;

  var navBar = document.getElementById('main-header-menu-bar');
  var header = document.getElementById('main-header');
  var root = document.documentElement;
  var openItem = null;
  var rafId = null;

  var PIN_CLASS = 'main-header--menu-panel-open';

  var supportsFocusVisible = true;
  try {
    document.querySelector(':focus-visible');
  } catch (e) {
    supportsFocusVisible = false;
  }

  function isFocusVisible(target) {
    if (!supportsFocusVisible || !target || typeof target.matches !== 'function') return true;
    try {
      return target.matches(':focus-visible');
    } catch (e) {
      return true;
    }
  }

  var backdrop = document.querySelector('.showcase-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'showcase-backdrop';
    document.body.appendChild(backdrop);
  }

  function updateBottomVar() {
    if (!navBar) return;
    root.style.setProperty('--showcase-bottom', navBar.getBoundingClientRect().bottom + 'px');
  }

  function scheduleUpdate() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      updateBottomVar();
    });
  }

  function getPanel(item) {
    return item.querySelector('[data-showcase-panel]');
  }
  function getTrigger(item) {
    return item.querySelector('[data-showcase-trigger]');
  }

  function clearScrollLock(item) {
    var panel = getPanel(item);
    if (panel) panel.classList.remove('is-scroll-locked');
  }

  function pinHeaderAndShowBackdrop() {
    if (header) header.classList.add(PIN_CLASS);
    backdrop.classList.add('is-open');
  }

  function unpinHeaderAndHideBackdrop() {
    if (header) header.classList.remove(PIN_CLASS);
    backdrop.classList.remove('is-open');
  }

  function openMenu(item) {
    clearScrollLock(item);

    if (openItem === item) return;
    if (openItem) closeMenu(openItem);

    updateBottomVar();

    var panel = getPanel(item);
    var trigger = getTrigger(item);
    panel.classList.add('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    openItem = item;
    pinHeaderAndShowBackdrop();
  }

  function closeMenu(item) {
    var panel = getPanel(item);
    var trigger = getTrigger(item);
    if (panel) panel.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (openItem === item) {
      openItem = null;
      unpinHeaderAndHideBackdrop();
    }
  }

  function scrollCloseMenu(item) {
    var panel = getPanel(item);
    var trigger = getTrigger(item);
    if (panel) {
      panel.classList.remove('is-open');
      panel.classList.add('is-scroll-locked');
    }
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (openItem === item) {
      openItem = null;
      unpinHeaderAndHideBackdrop();
    }
  }

  var isHovered = false;

  items.forEach(function (item) {
    var trigger = getTrigger(item);
    var panel = getPanel(item);
    if (!trigger || !panel) return;

    item.addEventListener('mouseenter', function () {
      clearScrollLock(item);
      updateBottomVar();
      openItem = item;
      isHovered = true;
      pinHeaderAndShowBackdrop();
    });

    item.addEventListener('mouseleave', function () {
      clearScrollLock(item);
      isHovered = false;
      if (openItem === item) {
        openItem = null;
        unpinHeaderAndHideBackdrop();
      }
    });

    item.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' || event.key === 'Esc') {
        closeMenu(item);
        trigger.focus();
      }
    });

    trigger.addEventListener('click', function (event) {
      var isOpen = panel.classList.contains('is-open');
      if (!isOpen && window.matchMedia('(hover: none)').matches) {
        event.preventDefault();
        openMenu(item);
      }
    });

    trigger.addEventListener('focus', function (event) {
      if (!isFocusVisible(event.target)) return;
      clearScrollLock(item);
      updateBottomVar();
      openItem = item;
      isHovered = true;
      pinHeaderAndShowBackdrop();
    });

    item.addEventListener('focusout', function (event) {
      if (!item.contains(event.relatedTarget)) {
        isHovered = false;
        if (openItem === item) {
          openItem = null;
          unpinHeaderAndHideBackdrop();
        }
      }
    });
  });

  document.addEventListener('click', function (event) {
    if (openItem && !openItem.contains(event.target)) {
      closeMenu(openItem);
    }
  });

  backdrop.addEventListener('click', function () {
    if (openItem) closeMenu(openItem);
  });

  window.addEventListener('scroll', function () {
    if (openItem && !isHovered) scrollCloseMenu(openItem);
  }, { passive: true });

  window.addEventListener('resize', scheduleUpdate);

  if (navBar && 'ResizeObserver' in window) {
    new ResizeObserver(scheduleUpdate).observe(navBar);
  }

  updateBottomVar();
})();