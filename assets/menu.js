/**
 * Header Menu Bar — menu.js
 *
 * Dropdowns and mega menus are pure CSS hover (no JS needed for those).
 * This file handles keyboard accessibility only.
 */

document.addEventListener('DOMContentLoaded', function () {
  const menuItems = document.querySelectorAll(
    '.menu-bar__item--has-dropdown, .menu-bar__item--has-mega'
  );

  menuItems.forEach(function (item) {
    const topLink = item.querySelector(':scope > .menu-bar__link');
    const panel = item.querySelector(':scope > .dropdown, :scope > .mega-menu');

    if (!topLink || !panel) return;

    // Keyboard: open on Enter/Space, close on Escape
    topLink.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const isOpen = item.classList.contains('is-open');
        closeAll();
        if (!isOpen) item.classList.add('is-open');
      }
      if (e.key === 'Escape') closeAll();
    });

    // Close when focus leaves the whole item
    item.addEventListener('focusout', function (e) {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove('is-open');
      }
    });
  });

  // Close all keyboard-opened menus when clicking elsewhere
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu-bar__item')) closeAll();
  });

  function closeAll() {
    menuItems.forEach(function (item) {
      item.classList.remove('is-open');
    });
  }
});