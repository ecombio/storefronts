/* assets/search-toolbar.js */

(function () {
  if (window.__searchToolbarLoaded) return;
  window.__searchToolbarLoaded = true;

  var toolbar = document.getElementById('search-toolbar');
  var ajaxEnabled = !!toolbar && toolbar.getAttribute('data-ajax-navigation') === 'true';

  var sortSelect = document.querySelector('[data-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      if (ajaxEnabled) {
        navigateAjax(url);
      } else {
        window.location.href = url.toString();
      }
    });
  }

  if (ajaxEnabled) {
    document.addEventListener('click', function (event) {
      var tab = event.target.closest('.tab-switcher__tab');
      if (!tab) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

      event.preventDefault();
      navigateAjax(new URL(tab.href));
    });

    window.addEventListener('popstate', function () {
      navigateAjax(new URL(window.location.href), { pushState: false });
    });
  }

  function navigateAjax(url, options) {
    options = options || {};
    var shouldPushState = options.pushState !== false;

    var current = document.getElementById('main-search');
    if (current) current.setAttribute('aria-busy', 'true');

    var fetchUrl = new URL(url.toString());
    fetchUrl.searchParams.set('section_id', 'main-search');

    fetch(fetchUrl.toString())
      .then(function (res) {
        if (!res.ok) throw new Error('Bad response: ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var next = new DOMParser().parseFromString(html, 'text/html');
        var nextMain = next.getElementById('main-search');
        var currentMain = document.getElementById('main-search');

        if (!nextMain || !currentMain) {
          throw new Error('main-search markup not found in response');
        }

        currentMain.replaceWith(nextMain);

        if (shouldPushState) {
          var cleanUrl = new URL(url.toString());
          cleanUrl.searchParams.delete('section_id');
          history.pushState({}, '', cleanUrl.toString());
        }
      })
      .catch(function () {
        window.location.href = url.toString();
      });
  }

  document.addEventListener('keydown', function (event) {
    var tab = event.target.closest('[role="tab"]');
    if (!tab) return;

    var tablist = tab.closest('[role="tablist"]');
    if (!tablist) return;

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var index = tabs.indexOf(tab);
    if (index === -1) return;

    var nextIndex = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    tabs.forEach(function (t, i) {
      t.tabIndex = i === nextIndex ? 0 : -1;
    });
    tabs[nextIndex].focus();
  });
})();