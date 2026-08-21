// =============================================
// ECOMBIO FOOTER JAVASCRIPT
// =============================================

document.addEventListener('DOMContentLoaded', function () {

  // === Mobile Bottom Navigation - Active State ===
  const bottomNavLinks = document.querySelectorAll('.bottom-nav__link');

  bottomNavLinks.forEach(link => {
    link.addEventListener('click', function () {
      // Remove active class from all links
      bottomNavLinks.forEach(l => l.classList.remove('is-active'));
      // Add active class to clicked link
      this.classList.add('is-active');
    });
  });

  // === Search Trigger (from mobile bottom bar) ===
  const searchTriggers = document.querySelectorAll('.js-open-search');

  searchTriggers.forEach(trigger => {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();

      // Try to find common search modal elements
      const searchModal = document.querySelector('.search-modal') ||
                          document.querySelector('[data-search-modal]') ||
                          document.querySelector('#search-modal');

      if (searchModal) {
        searchModal.classList.add('active', 'open');
      } else {
        // Fallback: Try to focus on header search input
        const headerSearch = document.querySelector('input[type="search"], .search__input');
        if (headerSearch) {
          headerSearch.focus();
        } else {
          // Last resort: scroll to top (you can customize this)
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  });

});