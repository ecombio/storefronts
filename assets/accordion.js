/**
 * assets/accordion.js
 * Expand/collapse behavior for snippets/block-accordion.liquid.
 * Panels open independently by default. To switch to single-open
 * behavior, set data-accordion-mode="single" in the liquid and this
 * script will close sibling panels automatically.
 */
(function () {
  'use strict';

  function initAccordion(root) {
    var mode = root.getAttribute('data-accordion-mode') || 'independent';
    var triggers = root.querySelectorAll('.accordion-item__trigger');

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var expanded = trigger.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));

        if (mode === 'single' && !expanded) {
          triggers.forEach(function (other) {
            if (other !== trigger) {
              other.setAttribute('aria-expanded', 'false');
              var otherPanel = document.getElementById(other.getAttribute('aria-controls'));
              if (otherPanel) otherPanel.hidden = true;
            }
          });
        }

        trigger.setAttribute('aria-expanded', String(!expanded));
        if (panel) panel.hidden = expanded;
      });
    });
  }

  document.querySelectorAll('[data-accordion]').forEach(initAccordion);
})();
