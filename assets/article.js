/* ─────────────────────────────────────────
   article.js
───────────────────────────────────────── */

(function () {
  /* ── Table of Contents ── */
  function buildTOC() {
    const toc = document.getElementById('toc');
    if (!toc) return;

    const content = document.querySelector('.article-content');
    if (!content) return;

    const headings = content.querySelectorAll('h2');
    if (!headings.length) {
      toc.innerHTML = '<p class="sidebar-widget__text">No headings found.</p>';
      return;
    }

    const ol = document.createElement('ol');

    headings.forEach(function (heading, i) {
      if (!heading.id) {
        heading.id = 'heading-' + i;
      }

      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.href        = '#' + heading.id;
      a.textContent = heading.textContent;

      a.addEventListener('click', function (e) {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      li.appendChild(a);
      ol.appendChild(li);
    });

    toc.innerHTML = '';
    toc.appendChild(ol);
  }

  /* ── TOC Active State on Scroll ── */
  function initTOCObserver() {
    const toc = document.getElementById('toc');
    if (!toc) return;

    const content  = document.querySelector('.article-content');
    if (!content) return;

    const headings = content.querySelectorAll('h2');
    if (!headings.length) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const id = entry.target.id;
        const link = toc.querySelector('a[href="#' + id + '"]');
        if (!link) return;
        if (entry.isIntersecting) {
          toc.querySelectorAll('a').forEach(function (a) { a.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '0px 0px -70% 0px' });

    headings.forEach(function (h) { observer.observe(h); });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    buildTOC();
    initTOCObserver();
  });
})();