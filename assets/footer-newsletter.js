/**
 * Footer Newsletter Controller
 * File: assets/footer-newsletter.js
 * Loaded by: sections/footer-newsletter.liquid (defer)
 *
 * Responsibilities:
 *   - Client-side email validation before submit
 *   - Honeypot check to quietly block obvious bot submissions
 *   - Optional consent-checkbox validation
 *   - Disables the button and shows a loading state while submitting
 *   - Moves focus to success/error messages rendered by Liquid after redirect
 * Works with Shopify's native {% form 'customer' %} (full page submit).
 *
 * STYLE NOTE: restyled to the var/IIFE pattern used by
 * main-header.js and header-hamburger.js (this file previously used
 * const/let) — no functional changes from the original version.
 */

(function () {
  'use strict';

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function initForm(form) {
    var emailInput = form.querySelector('[data-fn-email-input]');
    var submitBtn = form.querySelector('[data-fn-submit]');
    var submitText = form.querySelector('[data-fn-submit-text]');
    var inlineError = form.querySelector('[data-fn-inline-error]');
    var honeypot = form.querySelector('[data-fn-honeypot]');
    var consent = form.querySelector('[data-fn-consent]');

    if (!emailInput || !submitBtn) return;

    /* Without this, native constraint validation (required, type="email",
       the consent checkbox's required attribute) runs before our submit
       listener and can block the form with the browser's own default
       validation UI — which means the code below never executes. Turning
       it off hands all validation to this script, so our messaging and
       focus handling actually run every time. */
    form.noValidate = true;

    var originalLabel = submitText ? submitText.textContent : null;
    var resetTimer = null;

    function setInvalid(isInvalid, message) {
      if (isInvalid) {
        emailInput.setAttribute('aria-invalid', 'true');
        if (inlineError) {
          if (message) inlineError.textContent = message;
          inlineError.hidden = false;
          inlineError.setAttribute('role', 'alert');
        }
      } else {
        emailInput.removeAttribute('aria-invalid');
        if (inlineError) inlineError.hidden = true;
      }
    }

    emailInput.addEventListener('input', function () {
      if (emailInput.getAttribute('aria-invalid') === 'true' && isValidEmail(emailInput.value)) {
        setInvalid(false);
      }
    });

    if (consent) {
      consent.addEventListener('change', function () {
        consent.setCustomValidity('');
      });
    }

    form.addEventListener('submit', function (event) {
      /* Honeypot: real visitors never fill this hidden field. If it has
         a value, silently drop the submission instead of sending it on
         to Shopify (no error shown, so we don't tip off the bot). */
      if (honeypot && honeypot.value.trim() !== '') {
        event.preventDefault();
        return;
      }

      var value = emailInput.value || '';

      if (!isValidEmail(value)) {
        event.preventDefault();
        setInvalid(true);
        emailInput.focus();
        return;
      }

      if (consent && consent.hasAttribute('required') && !consent.checked) {
        event.preventDefault();
        consent.setCustomValidity('Please check this box to continue.');
        consent.reportValidity();
        consent.focus();
        return;
      }

      setInvalid(false);
      submitBtn.setAttribute('disabled', 'disabled');
      if (submitText) submitText.textContent = 'Subscribing…';

      /* Safety net: re-enable the button if navigation doesn't happen
         (e.g. Shopify renders validation errors back on the same page,
         or the request stalls on a slow connection). */
      resetTimer = window.setTimeout(function () {
        submitBtn.removeAttribute('disabled');
        if (submitText && originalLabel) submitText.textContent = originalLabel;
      }, 6000);
    });

    /* If the page is restored from bfcache (e.g. back button after a
       failed submit), make sure the button isn't stuck disabled. */
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) {
        window.clearTimeout(resetTimer);
        submitBtn.removeAttribute('disabled');
        if (submitText && originalLabel) submitText.textContent = originalLabel;
      }
    });
  }

  function moveFocusToMessage(root) {
    var successEl = root.querySelector('[data-fn-success]');
    var errorEl = root.querySelector('[data-fn-error]');
    var target = successEl || errorEl;
    if (target) target.focus();
  }

  var sections = document.querySelectorAll('.footer-newsletter');
  Array.prototype.forEach.call(sections, function (section) {
    var form = section.querySelector('.footer-newsletter-form');
    if (form) initForm(form);
    moveFocusToMessage(section);
  });

})();