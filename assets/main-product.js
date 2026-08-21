(function () {
  'use strict';

  const SECTION_ID = 'ProductSection';

  function init(root) {
    var section = root.querySelector
      ? (root.id === SECTION_ID ? root : root.querySelector('#' + SECTION_ID))
      : document.getElementById(SECTION_ID);

    if (!section) return;

    document.dispatchEvent(new CustomEvent('section:product-loaded', {
      bubbles: true,
      detail: { section: section }
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }

  document.addEventListener('shopify:section:load', function (e) {
    init(e.target);
  });

})();