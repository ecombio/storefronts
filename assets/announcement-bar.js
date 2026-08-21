/* ==========================================================================
   Announcement Bar
   Handles: slide rotation (manual + auto), dismiss/close, and countdown
   timers (fixed date or evergreen/repeating).

   Loaded via: {{ 'announcement-bar.js' | asset_url }}, deferred — mirrors
   utility-bar.js / main-header.js / mega-menu.js in this theme.
   ========================================================================== */

(function () {
  var bar = document.querySelector('[data-announcement-bar]');
  if (!bar) return;

  var dismissKey = 'announcement_bar_dismissed';
  var dismissible = bar.dataset.dismissible === 'true';

  if (dismissible && sessionStorage.getItem(dismissKey) === 'true') {
    bar.style.display = 'none';
    return;
  }

  var slides     = bar.querySelectorAll('.announcement-bar__slide');
  var autorotate = bar.dataset.autorotate === 'true';
  var interval   = parseInt(bar.dataset.interval, 10) || 5000;
  var current    = 0;
  var timer;

  function show(index) {
    slides[current].classList.remove('is-active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('is-active');
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  function startAuto() {
    if (autorotate && slides.length > 1) timer = setInterval(next, interval);
  }
  function stopAuto() { clearInterval(timer); }

  var btnNext = bar.querySelector('.announcement-bar__arrow--next');
  var btnPrev = bar.querySelector('.announcement-bar__arrow--prev');
  if (btnNext) btnNext.addEventListener('click', function () { stopAuto(); next(); startAuto(); });
  if (btnPrev) btnPrev.addEventListener('click', function () { stopAuto(); prev(); startAuto(); });

  var closeBtn = bar.querySelector('[data-close]');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      stopAuto();
      bar.style.display = 'none';
      if (dismissible) sessionStorage.setItem(dismissKey, 'true');
    });
  }

  bar.querySelectorAll('[data-countdown]').forEach(function (el) {
    var type  = el.dataset.type;
    var endMs;

    if (type === 'fixed') {
      endMs = new Date(el.dataset.end.replace(/\//g, '-')).getTime();
    } else {
      var storageKey = 'ann_countdown_' + el.dataset.duration;
      var saved = sessionStorage.getItem(storageKey);
      endMs = saved ? parseInt(saved, 10) : Date.now() + parseInt(el.dataset.duration, 10) * 60000;
      sessionStorage.setItem(storageKey, endMs);
    }

    function tick() {
      var diff = endMs - Date.now();
      if (diff <= 0) { el.closest('.announcement-bar__slide').style.display = 'none'; return; }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      el.querySelector('[data-days]').textContent    = String(d).padStart(2, '0');
      el.querySelector('[data-hours]').textContent   = String(h).padStart(2, '0');
      el.querySelector('[data-minutes]').textContent = String(m).padStart(2, '0');
      el.querySelector('[data-seconds]').textContent = String(s).padStart(2, '0');
    }
    tick();
    setInterval(tick, 1000);
  });

  startAuto();
})();
