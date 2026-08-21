/**
 * Header Account
 * File: assets/header-account.js
 * Loaded by: sections/main-header.liquid
 *
 * The account icon is a plain anchor — no drawer, no AJAX.
 * This module's job is light: keep the aria-label in sync if the
 * customer session changes client-side (e.g. after a headless login),
 * and expose a small hook for themes that want to intercept the click
 * (e.g. to open an account flyout instead of navigating).
 *
 * If neither of those is needed for your theme, this module is optional —
 * header-account.liquid works standalone without it.
 *
 * Events dispatched:
 *   'account:link:click'  — bubbles from the anchor; detail: { loggedIn, href }
 *                           Intercept with e.preventDefault() to suppress navigation.
 *
 * No global variables. Wraps everything in an IIFE.
 */

(function () {
  'use strict';

  /* ── Selectors ──────────────────────────────────────────────────────────── */

  const ACCOUNT_SEL = '[data-account-link]';

  /* ── Init ───────────────────────────────────────────────────────────────── */

  function init() {
    var link = document.querySelector(ACCOUNT_SEL);
    if (!link) return; /* snippet not on this page */

    /* Dispatch a cancellable custom event on click so themes can intercept
       and open a flyout/modal without navigating. */
    link.addEventListener('click', function (e) {
      var loggedIn = link.href.indexOf('/account/login') === -1 &&
                     link.href.indexOf('/account/register') === -1;

      var dispatched = link.dispatchEvent(
        new CustomEvent('account:link:click', {
          bubbles:    true,
          cancelable: true,
          detail: {
            loggedIn: loggedIn,
            href:     link.href,
          },
        })
      );

      /* If a listener called e.preventDefault() on the custom event,
         suppress the anchor navigation too. */
      if (!dispatched) {
        e.preventDefault();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());