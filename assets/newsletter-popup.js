/* =============================================================
   Newsletter Popup
   File: assets/newsletter-popup.js
   Loaded by: sections/newsletter-popup.liquid

   NOTE: this used to be an inline <script> block that grabbed its
   root element via document.getElementById('newsletter-popup-{{
   section.id }}') — that only worked because Liquid was rendering
   the ID straight into the script tag. Now that this file is a
   static asset, Liquid can't run inside it, so each instance is
   found via document.querySelectorAll('.newsletter-popup') instead
   and initialized independently. This also means the section can
   safely be added more than once without any JS changes.
   ============================================================= */

(function () {
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/';
  }

  function initNewsletterPopup(root) {
    var cookieName = root.dataset.cookieName;
    var frequency = root.dataset.frequency; // "always" | "day" | "session"
    var delay = parseInt(root.dataset.delay, 10) * 1000;
    var exitIntent = root.dataset.exitIntent === 'true';
    var position = root.dataset.position; // "center" | "corner"

    function alreadyClosed() {
      if (frequency === 'always') return false;
      if (frequency === 'session') return sessionStorage.getItem(cookieName) === '1';
      if (frequency === 'day') return getCookie(cookieName) === '1';
      return false;
    }

    function markClosed() {
      if (frequency === 'session') sessionStorage.setItem(cookieName, '1');
      if (frequency === 'day') setCookie(cookieName, '1', 1);
    }

    function showPopup() {
      if (alreadyClosed()) return;
      root.style.display = 'block';
      if (position === 'center') {
        document.body.style.overflow = 'hidden';
      }
    }

    function hidePopup() {
      root.style.display = 'none';
      if (position === 'center') {
        document.body.style.overflow = '';
      }
      markClosed();
    }

    root.querySelectorAll('[data-newsletter-close]').forEach(function (el) {
      el.addEventListener('click', hidePopup);
    });

    // Success message showing means the form already posted - don't
    // re-trigger closing logic weirdly on the next page load.
    if (root.querySelector('.newsletter-popup__success')) {
      markClosed();
    }

    if (!alreadyClosed()) {
      if (delay >= 0) {
        setTimeout(showPopup, delay);
      }
      if (exitIntent) {
        document.addEventListener('mouseout', function (e) {
          if (!e.relatedTarget && e.clientY < 10) showPopup();
        });
      }
    }
  }

  document.querySelectorAll('.newsletter-popup').forEach(initNewsletterPopup);
})();
