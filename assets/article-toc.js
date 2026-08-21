(function () {
  'use strict';

  var CONTENT_SELECTOR = '.article-content';
  var TOC_ID           = 'ma-toc';
  var LIST_ID          = 'ma-toc-list';
  var TOGGLE_ID        = 'ma-toc-toggle';
  var ACTIVE_CLASS     = 'is-active';
  var OPEN_CLASS       = 'is-open';

  /* ─── Slugify ─────────────────────────────────────────────────
   * Converts heading text to a URL-safe ID.
   * "Hello World! It's great." → "hello-world-its-great"
  ────────────────────────────────────────────────────────────── */
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/['']/g, '')           // strip apostrophes before removing punctuation
      .replace(/[^a-z0-9\s-]/g, '')   // remove remaining non-alphanumeric chars
      .trim()
      .replace(/[\s-]+/g, '-');       // collapse whitespace + hyphens into one dash
  }

  /* Ensure an ID is unique within the document by appending -2, -3 etc. */
  function uniqueId(base) {
    var id   = base;
    var used = {};
    // pre-populate with all existing IDs
    Array.from(document.querySelectorAll('[id]')).forEach(function (el) {
      used[el.id] = true;
    });
    var counter = 2;
    while (used[id]) {
      id = base + '-' + counter++;
    }
    return id;
  }

  /* ─── Build TOC ───────────────────────────────────────────────
   * Finds all H2 + H3 inside CONTENT_SELECTOR, assigns clean
   * slugified IDs if missing, and renders the <ol> list.
  ────────────────────────────────────────────────────────────── */
  function buildTOC(content, list) {
    var headings = Array.from(content.querySelectorAll('h2, h3'));

    if (!headings.length) {
      list.innerHTML = '<li class="ma-toc__loading" style="color:#bbb">No headings found.</li>';
      return [];
    }

    /* Assign IDs */
    headings.forEach(function (h) {
      if (!h.id) {
        var base = slugify(h.textContent);
        if (!base) base = 'section';
        h.id = uniqueId(base);
      }
    });

    /* Build list items */
    var frag = document.createDocumentFragment();
    headings.forEach(function (h) {
      var isH3 = h.tagName === 'H3';
      var li   = document.createElement('li');
      li.className = 'ma-toc__item' + (isH3 ? ' ma-toc__item--h3' : '');

      var a  = document.createElement('a');
      a.href = '#' + h.id;
      a.className   = 'ma-toc__link';
      a.textContent = h.textContent;

      /* Smooth scroll + close accordion on mobile */
      a.addEventListener('click', function (e) {
        e.preventDefault();
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        /* Close accordion after tap on mobile */
        var toc = document.getElementById(TOC_ID);
        if (toc && window.innerWidth <= 680) {
          closeAccordion(toc);
        }
      });

      li.appendChild(a);
      frag.appendChild(li);
    });

    list.innerHTML = '';
    list.appendChild(frag);

    return headings;
  }

  /* ─── Active link via IntersectionObserver ────────────────────
   * Tracks which heading is nearest the top of the viewport.
   * Uses a "topmost visible" strategy: whichever heading has
   * entered the top quarter of the screen most recently wins.
   * Falls back to the last heading above the fold.
  ────────────────────────────────────────────────────────────── */
  function initObserver(headings, list) {
    /* Map heading id → anchor element in TOC */
    var linkMap = {};
    Array.from(list.querySelectorAll('.ma-toc__link')).forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      linkMap[id] = a;
    });

    var activeId = null;

    function setActive(id) {
      if (id === activeId) return;
      /* Deactivate previous */
      if (activeId && linkMap[activeId]) {
        linkMap[activeId].classList.remove(ACTIVE_CLASS);
      }
      activeId = id;
      if (id && linkMap[id]) {
        linkMap[id].classList.add(ACTIVE_CLASS);
        /* Scroll TOC to keep active link visible on desktop */
        scrollTocToActive(linkMap[id]);
      }
    }

    /*
     * Strategy: keep a sorted record of which headings are above the
     * midpoint. The active one is the last heading whose top edge has
     * crossed 40% of the viewport height.
     */
    var visible = new Set();

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visible.add(entry.target.id);
        } else {
          visible.delete(entry.target.id);
        }
      });

      /* Pick topmost visible heading */
      var best = null;
      var bestTop = Infinity;
      headings.forEach(function (h) {
        var rect = h.getBoundingClientRect();
        if (visible.has(h.id) && rect.top < bestTop) {
          bestTop = rect.top;
          best = h.id;
        }
      });

      /* If nothing visible, find the last heading above the fold */
      if (!best) {
        headings.forEach(function (h) {
          var rect = h.getBoundingClientRect();
          if (rect.top <= 80) {
            best = h.id;
          }
        });
      }

      if (best) setActive(best);
    }, {
      /* Trigger when heading enters or exits the top 60% of the viewport */
      rootMargin: '0px 0px -40% 0px',
      threshold: 0
    });

    headings.forEach(function (h) { observer.observe(h); });

    /* Also set first heading active before scrolling starts */
    if (headings.length) setActive(headings[0].id);
  }

  function scrollTocToActive(link) {
    var toc = document.getElementById(TOC_ID);
    if (!toc || window.innerWidth <= 680) return;
    var tocRect  = toc.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    var isAbove  = linkRect.top < tocRect.top + 20;
    var isBelow  = linkRect.bottom > tocRect.bottom - 20;
    if (isAbove || isBelow) {
      link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ─── Accordion (mobile) ──────────────────────────────────────
   * Toggles .is-open on the nav and flips aria-expanded.
  ────────────────────────────────────────────────────────────── */
  function closeAccordion(toc) {
    toc.classList.remove(OPEN_CLASS);
    var toggle = document.getElementById(TOGGLE_ID);
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function initAccordion(toc) {
    var toggle = document.getElementById(TOGGLE_ID);
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      var isOpen = toc.classList.toggle(OPEN_CLASS);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    /* Close accordion when clicking outside */
    document.addEventListener('click', function (e) {
      if (!toc.contains(e.target)) {
        closeAccordion(toc);
      }
    });

    /* Close on Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toc.classList.contains(OPEN_CLASS)) {
        closeAccordion(toc);
        toggle.focus();
      }
    });
  }

  /* ─── Init ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var toc     = document.getElementById(TOC_ID);
    var list    = document.getElementById(LIST_ID);
    var content = document.querySelector(CONTENT_SELECTOR);

    if (!toc || !list || !content) return;

    var headings = buildTOC(content, list);
    if (!headings.length) return;

    initObserver(headings, list);
    initAccordion(toc);
  });
})();
