/* assets/main-collection.js
   Page-level shell script for sections/main-collection.liquid.

   Tab switching, sort, mobile sort sheet, and the sub-collections
   carousel have all moved out to collection-toolbar.js and
   collection-feed.js, which now own that behavior alongside the
   markup they control. All that's left here is the one truly
   page-level fixture: the single shared backdrop element used by
   both the mobile sort sheet (opened from collection-toolbar.js) and
   the filter sidebar (opened from collection-filter.js) — since only
   one overlay should ever exist in the DOM, it stays owned by the
   section shell rather than duplicated in either snippet.

   Exposed as window.CollectionBackdrop = { open(onClose), close(caller) }.
   Both callers pass their own close function so open() can call it if a
   *different* caller ends up closing the backdrop first (e.g. clicking
   the backdrop itself, or opening the filter panel while the sort sheet
   is still open). */

(function () {
  'use strict';

  var backdrop = document.querySelector('.collection-mobile-backdrop');
  if (!backdrop) return;

  function open(onClose) {
    backdrop.classList.add('is-visible');
    backdrop._onClose = onClose;
  }

  function close(caller) {
    backdrop.classList.remove('is-visible');
    if (typeof backdrop._onClose === 'function' && backdrop._onClose !== caller) {
      backdrop._onClose();
    }
    backdrop._onClose = null;
  }

  backdrop.addEventListener('click', function () {
    close(null);
  });

  window.CollectionBackdrop = { open: open, close: close };

})();
