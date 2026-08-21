/**
 * assets/section-newsletter.js
 *
 * UX enhancement for sections/newsletter.liquid:
 *   - honeypot check: if the hidden decoy field has a value on
 *     submit, the request is almost certainly a bot — silently
 *     prevent the submission rather than posting it to Shopify
 *   - aria-invalid toggling on the email field after first blur, so
 *     screen readers and the CSS error state only activate once the
 *     shopper has actually interacted with the field
 *   - disables the submit button and shows the spinner (via the
 *     [disabled] CSS rule) while a real submission is in flight, to
 *     prevent duplicate submissions
 *   - moves focus to the success/error message on load, for a11y
 *
 * Does NOT intercept, fetch, or prevent-default a legitimate
 * submission. Submission stays a normal POST handled by Shopify; the
 * success/error state is rendered server-side via
 * form.posted_successfully? / form.errors.
 */
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
        // Honeypot trip: a real visitor never fills this field.
        // Drop the submission silently — no error shown to the bot,
        // no request sent to Shopify.
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

        // No preventDefault here: let the normal POST proceed. If the
        // request never completes (e.g. offline), re-enable the
        // button after a timeout so the shopper isn't stuck.
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

  // Re-init when the theme editor re-renders this section instance.
  document.addEventListener('shopify:section:load', function (event) {
    if (event.target.matches('[data-section-type="newsletter"]')) {
      initNewsletterSection(event.target);
    }
  });
})();
