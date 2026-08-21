(function () {
  'use strict';

  function initNewsletterSection(root) {
    var form = root.querySelector('.newsletter-form');
    var input = root.querySelector('[data-newsletter-input]');
    var honeypot = root.querySelector('[data-newsletter-honeypot]');
    var submitBtn = root.querySelector('[data-newsletter-submit]');
    var submitLabel = root.querySelector('[data-newsletter-submit-label]');
    var messageRegion = root.querySelector('[data-newsletter-message-region]');

    if (messageRegion) {
      var message = messageRegion.querySelector('[data-newsletter-success], [data-newsletter-error]');
      if (message) {
        message.focus();
      }
    }

    if (input) {
      input.addEventListener('blur', function () {
        input.setAttribute('aria-invalid', form && form.checkValidity() === false ? 'true' : String(!input.checkValidity()));
      });
    }

    if (form && submitBtn) {
      form.addEventListener('submit', function (event) {
        if (honeypot && honeypot.value !== '') {
          event.preventDefault();
          return;
        }

        if (!form.checkValidity()) {
          if (input) {
            input.setAttribute('aria-invalid', 'true');
          }
          return;
        }

        submitBtn.setAttribute('disabled', 'disabled');

        if (submitLabel) {
          submitBtn.dataset.originalLabel = submitLabel.textContent;
          submitLabel.textContent = 'Signing up…';
        }

        window.setTimeout(function () {
          submitBtn.removeAttribute('disabled');
          if (submitLabel && submitBtn.dataset.originalLabel) {
            submitLabel.textContent = submitBtn.dataset.originalLabel;
          }
        }, 8000);
      });
    }
  }

  function initAll() {
    document.querySelectorAll('[data-section-type="newsletter"]').forEach(initNewsletterSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    if (event.target.matches('[data-section-type="newsletter"]')) {
      initNewsletterSection(event.target);
    }
  });
})();