(function () {
  'use strict';

  var menuBar = document.getElementById('main-header-menu-bar');
  if (!menuBar) return;

  var BUFFER = 1;

  var getScrollEl = function () {
    var container = menuBar.querySelector('.menu-bar__container');
    if (container && container.scrollWidth > container.clientWidth) return container;
    if (menuBar.scrollWidth > menuBar.clientWidth) return menuBar;
    return container || menuBar;
  };

  var update = function () {
    var el = getScrollEl();
    var maxScroll = el.scrollWidth - el.clientWidth;

    if (maxScroll <= BUFFER) {
      menuBar.classList.remove('has-scroll-left', 'has-scroll-right');
      return;
    }

    menuBar.classList.toggle('has-scroll-left', el.scrollLeft > BUFFER);
    menuBar.classList.toggle('has-scroll-right', el.scrollLeft < maxScroll - BUFFER);
  };

  var scrollTarget = menuBar.querySelector('.menu-bar__container') || menuBar;

  update();
  scrollTarget.addEventListener('scroll', update, { passive: true });
  menuBar.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  if ('ResizeObserver' in window) {
    new ResizeObserver(update).observe(menuBar);
  }
})();

(function () {
  'use strict';

  
  
  
  
  if (window.__hsInitialized) return;
  window.__hsInitialized = true;

  var MIN_QUERY_LENGTH = 2;
  var DEBOUNCE_MS      = 300;
  var CACHE_TTL_MS     = 60000;
  var MAX_RECENT       = 5;
  var MAX_RECENT_IN_RAIL = 3;

  var MAX_SUGGESTED_QUERIES      = 3;
  var MAX_SUGGESTED_COLLECTIONS  = 2;

  var _cache = new Map();

  var STORAGE_KEY = 'HS_RECENT_' + window.location.hostname;

  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function esc(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;');
  }

  var RecentSearches = {
    load: function () {
      try {
        var raw = sessionStorage.getItem(STORAGE_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (_) {
        return [];
      }
    },

    _save: function (list) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
    },

    add: function (term) {
      var t = (term || '').trim();
      if (!t) return;
      var list = this.load().filter(function (s) {
        return s.toLowerCase() !== t.toLowerCase();
      });
      list.unshift(t);
      this._save(list.slice(0, MAX_RECENT));
    },

    remove: function (term) {
      var t = (term || '').toLowerCase();
      this._save(this.load().filter(function (s) {
        return s.toLowerCase() !== t;
      }));
    },

    clear: function () { this._save([]); },
  };

  function buildFeaturedProductsGroup(products) {
    if (!products || !products.length) return '';

    var html = '<div class="predictive-search__group predictive-search__group--carousel">'
              + '<p class="predictive-search__group-label" id="HsFeaturedLabel">Popular products</p>'
              + '<div class="predictive-search__carousel" data-predictive-carousel>'

              + '<button type="button" '
              +         'class="predictive-search__carousel-btn predictive-search__carousel-btn--prev" '
              +         'data-predictive-carousel-prev '
              +         'aria-label="Scroll to previous products" '
              +         'tabindex="-1">'
              +   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
              +        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
              +     '<path d="M15 18l-6-6 6-6"/>'
              +   '</svg>'
              + '</button>'

              + '<ul class="predictive-search__carousel-track" '
              +     'data-predictive-carousel-track '
              +     'role="group" '
              +     'aria-labelledby="HsFeaturedLabel">';

    products.forEach(function (p) {
      var title = esc(p.title || '');
      var url   = esc(p.url || '#');

      var priceHtml = p.price_varies
        ? 'From ' + esc(p.price_min || '')
        : esc(p.price || '');

      var mediaHtml = p.image
        ? '<img src="' + esc(p.image) + '" alt="' + title + '" loading="lazy" width="200" height="200">'
        : '<span class="predictive-search__card-media--placeholder" aria-hidden="true"></span>';

      html += '<li role="option" class="predictive-search__carousel-item">'
            +   '<a href="' + url + '" class="predictive-search__card" tabindex="-1">'
            +     '<span class="predictive-search__card-media">' + mediaHtml + '</span>'
            +     '<span class="predictive-search__card-info">'
            +       '<span class="predictive-search__card-title">' + title + '</span>'
            +       '<span class="predictive-search__card-price">'
            +          priceHtml
            +          (p.available === false ? '<span class="predictive-search__card-badge">Sold out</span>' : '')
            +       '</span>'
            +     '</span>'
            +   '</a>'
            + '</li>';
    });

    html += '</ul>'

          + '<button type="button" '
          +         'class="predictive-search__carousel-btn predictive-search__carousel-btn--next" '
          +         'data-predictive-carousel-next '
          +         'aria-label="Scroll to more products" '
          +         'tabindex="-1">'
          +   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
          +        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          +     '<path d="M9 18l6-6-6-6"/>'
          +   '</svg>'
          + '</button>'

          + '</div>'
          + '</div>';

    return html;
  }

  function buildEmptyState(trending, recent, featured, searchUrl) {
    var html = '';

    if (recent.length) {
      html += '<div class="hs-empty__group">';

      html += '<div class="hs-empty__group-header">'
            + '<p class="hs-empty__label" id="HsRecentLabel">Recent searches</p>'
            + '<button type="button" class="hs-empty__clear-all" '
            +         'data-hs-clear-recent '
            +         'aria-label="Clear all recent searches">'
            +   'Clear all'
            + '</button>'
            + '</div>';

      html += '<ul class="predictive-search__list" '
            +      'role="group" aria-labelledby="HsRecentLabel">';

      recent.forEach(function (term) {
        var e    = esc(term);
        var href = searchUrl + '?q=' + encodeURIComponent(term) + '&type=product';

        html += '<li role="option" class="predictive-search__list-item">'
              +   '<a href="' + href + '" '
              +      'class="predictive-search__item hs-empty__recent-item" '
              +      'tabindex="-1" '
              +      'data-hs-recent-term="' + e + '">'

              +     '<span class="predictive-search__item-icon" aria-hidden="true">'
              +       '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" '
              +            'stroke="currentColor" stroke-width="2" '
              +            'stroke-linecap="round" stroke-linejoin="round">'
              +         '<circle cx="12" cy="12" r="10"/>'
              +         '<polyline points="12 6 12 12 16 14"/>'
              +       '</svg>'
              +     '</span>'

              +     '<span class="hs-empty__recent-text">' + e + '</span>'

              +     '<button type="button" '
              +             'class="hs-empty__remove" '
              +             'tabindex="-1" '
              +             'data-hs-remove-recent="' + e + '" '
              +             'aria-label="Remove \u201c' + e + '\u201d from recent searches">'
              +       '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" '
              +            'stroke="currentColor" stroke-width="2.5" '
              +            'stroke-linecap="round" aria-hidden="true">'
              +         '<line x1="18" y1="6" x2="6" y2="18"/>'
              +         '<line x1="6" y1="6" x2="18" y2="18"/>'
              +       '</svg>'
              +     '</button>'

              +   '</a>'
              + '</li>';
      });

      html += '</ul></div>';
    }

    html += buildFeaturedProductsGroup(featured);

    if (trending && trending.length) {
      html += '<div class="hs-empty__group">'
            + '<p class="hs-empty__label" id="HsTrendingLabel">Trending searches</p>'
            + '<ul class="hs-empty__pill-list" '
            +      'role="group" aria-labelledby="HsTrendingLabel">';

      trending.forEach(function (term) {
        var e    = esc(term);
        var href = searchUrl + '?q=' + encodeURIComponent(term) + '&type=product';

        html += '<li role="option" class="hs-empty__pill-item">'
              +   '<a href="' + href + '" '
              +      'class="hs-empty__pill" '
              +      'tabindex="-1" '
              +      'data-hs-trending-term="' + e + '">'
              +     e
              +   '</a>'
              + '</li>';
      });

      html += '</ul></div>';
    }

    return html;
  }

  
  
  
  
  
  
  
  
  function HSTypewriter(el, terms, opts) {
    opts = opts || {};
    this.el = el;
    this.terms = terms;
    
    
    
    
    this.typeMs = opts.typeMs || 22;
    this.deleteMs = opts.deleteMs || 12;
    this.holdMs = opts.holdMs || 1400;
    this.gapMs = opts.gapMs || 200;
    this.destroyed = false;
    this.paused = false;
    this.run();
  }

  HSTypewriter.prototype.sleep = function (ms) {
    var self = this;
    return new Promise(function (resolve) {
      self._timeoutId = setTimeout(resolve, ms);
    });
  };

  HSTypewriter.prototype.waitWhilePaused = function () {
    var self = this;
    return (async function () {
      while (self.paused && !self.destroyed) {
        await self.sleep(150);
      }
    })();
  };

  HSTypewriter.prototype.run = async function () {
    var i = 0;
    while (!this.destroyed) {
      await this.waitWhilePaused();
      if (this.destroyed) return;

      var term = this.terms[i % this.terms.length];

      
      
      
      
      await this.typeTerm(term);
      if (this.destroyed) return;
      await this.waitWhilePaused();
      if (this.destroyed) return;
      await this.sleep(this.holdMs);
      if (this.destroyed) return;
      await this.deleteTerm();
      if (this.destroyed) return;
      await this.sleep(this.gapMs);

      i++;
    }
  };

  HSTypewriter.prototype.typeTerm = async function (term) {
    for (var idx = 0; idx < term.length; idx++) {
      if (this.destroyed || this.paused) { this.clearChars(); return; }
      var span = document.createElement('span');
      span.className = 'hs-tw-char';
      span.textContent = term[idx];
      this.el.appendChild(span);
      await this.sleep(this.typeMs);
    }
  };

  HSTypewriter.prototype.deleteTerm = async function () {
    
    
    
    
    
    
    
    
    
    
    
    
    
    var chars = Array.prototype.slice.call(this.el.children);

    for (var idx = chars.length - 1; idx >= 0; idx--) {
      if (this.destroyed) return;
      var charEl = chars[idx];
      charEl.classList.add('hs-tw-char--vanish');
      (function (el) {
        setTimeout(function () {
          if (el.parentNode) el.remove();
        }, 260);
      })(charEl);
      await this.sleep(this.deleteMs);
    }

    
    
    
    this.el.textContent = '';
  };

  HSTypewriter.prototype.clearChars = function () {
    this.el.textContent = '';
  };

  HSTypewriter.prototype.pause = function () {
    this.paused = true;
  };

  HSTypewriter.prototype.resume = function () {
    if (!this.paused) return;
    this.paused = false;
    this.clearChars();
  };

  HSTypewriter.prototype.destroy = function () {
    this.destroyed = true;
    clearTimeout(this._timeoutId);
  };

  function buildRailRecentGroup(recent, searchUrl) {
    if (!recent.length) return '';

    var html = '<div class="predictive-search__group">'
              + '<p class="predictive-search__group-label" id="PredictiveSearchRecent">Recent</p>'
              + '<ul class="predictive-search__list" role="group" aria-labelledby="PredictiveSearchRecent">';

    recent.forEach(function (term) {
      var e    = esc(term);
      var href = searchUrl + '?q=' + encodeURIComponent(term) + '&type=product';

      html += '<li role="option" class="predictive-search__list-item">'
            +   '<a href="' + href + '" '
            +      'class="predictive-search__item predictive-search__item--query" '
            +      'tabindex="-1" '
            +      'data-hs-recent-term="' + e + '">'
            +     e
            +   '</a>'
            + '</li>';
    });

    html += '</ul></div>';
    return html;
  }

  function HeaderSearch(root) {
    this.root    = root;
    this.input   = root.querySelector('[data-search-input]');
    this.panel   = root.querySelector('[data-search-results]');
    this.clearBtn = root.querySelector('[data-search-clear]');
    this.voiceBtn = root.querySelector('[data-search-voice]');
    this.statusEl = root.querySelector('[data-search-status]');
    this.form     = root.querySelector('form');

    this.predictiveUrl = root.dataset.predictiveSearchUrl || '';
    this.searchUrl     = root.dataset.searchUrl || '/search';

    this.isPredictive = root.hasAttribute('data-predictive')
                        && !!this.predictiveUrl
                        && !!this.panel;

    
    
    
    
    this.sfx = root.dataset.searchVariant || 'search';

    this.activeIndex   = -1;
    this.controller    = null;
    this._emptyVisible = false;
    this._recognition  = null;
    this._typewriter   = null;
    
    
    
    this._inputPlaceholder = null;

    this._listeners = [];

    if (!this.input) return;

    this._syncClear();

    this._bindClear();
    this._initTypewriter();

    if (!this.isPredictive) return;

    this._bindInput();
    this._bindEmptyStateDelegation();
    this._bindKeyboard();
    this._bindDismiss();
    this._bindReposition();
    this._bindVoice();
  }

  HeaderSearch.prototype._on = function (target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    this._listeners.push([target, type, handler, opts]);
  };

  HeaderSearch.prototype._syncClear = function () {
    if (!this.clearBtn) return;
    this.clearBtn.hidden = this.input.value.length === 0;
  };

  HeaderSearch.prototype._bindClear = function () {
    var self = this;

    this._on(this.input, 'input',  function () { self._syncClear(); });
    this._on(this.input, 'change', function () { self._syncClear(); });

    if (this.clearBtn) {
      this._on(this.clearBtn, 'click', function () {
        self.input.value = '';
        self._syncClear();
        self.input.focus();
        if (self.isPredictive) {
          self._showEmpty();
        }
      });
    }
  };

  HeaderSearch.prototype._initTypewriter = function () {
    if (!this.root.hasAttribute('data-typewriter-enabled')) return;

    var overlay = this.root.querySelector('[data-search-typewriter]');
    
    
    
    var termEl  = this.root.querySelector('[data-search-typewriter-term]');
    var terms   = window.HS_TRENDING || [];
    if (!overlay || !termEl || !terms.length) return;

    
    
    
    
    
    this._inputPlaceholder = this.input.getAttribute('placeholder');
    this.input.removeAttribute('placeholder');

    this._typewriter = new HSTypewriter(termEl, terms);

    var self = this;
    this._on(this.input, 'input', function () { self._syncTypewriterVisibility(); });
    this._syncTypewriterVisibility();
  };

  HeaderSearch.prototype._syncTypewriterVisibility = function () {
    if (!this._typewriter) return;
    var overlay  = this.root.querySelector('[data-search-typewriter]');
    var hasValue = this.input.value.length > 0;
    if (overlay) overlay.hidden = hasValue;
    if (hasValue) {
      this._typewriter.pause();
    } else {
      this._typewriter.resume();
    }
  };

  HeaderSearch.prototype._bindInput = function () {
    var self = this;
    var debouncedFetch = debounce(function (q) { self._fetch(q); }, DEBOUNCE_MS);

    this._on(this.input, 'input', function () {
      var q = self.input.value.trim();

      if (q.length >= MIN_QUERY_LENGTH) {
        self._emptyVisible = false;
        debouncedFetch(q);
      } else if (q.length === 0) {
        self._showEmpty();
      } else {
        self.close();
      }
    });

    this._on(this.input, 'focus', function () {
      var q = self.input.value.trim();
      if (q.length >= MIN_QUERY_LENGTH) {
        self._fetch(q);
      } else {
        self._showEmpty();
      }
    });

    if (this.form) {
      this._on(this.form, 'submit', function () {
        var q = self.input.value.trim();
        if (q) RecentSearches.add(q);
        self.close();
      });
    }
  };

  HeaderSearch.prototype._bindEmptyStateDelegation = function () {
    var self = this;

    this._on(this.panel, 'click', function (e) {
      var removeBtn = e.target.closest('[data-hs-remove-recent]');
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        RecentSearches.remove(removeBtn.dataset.hsRemoveRecent);
        self._showEmpty();
        self.input.focus();
        return;
      }

      var clearAllBtn = e.target.closest('[data-hs-clear-recent]');
      if (clearAllBtn) {
        e.preventDefault();
        RecentSearches.clear();
        self._showEmpty();
        self.input.focus();
        return;
      }

      var recentLink = e.target.closest('[data-hs-recent-term]');
      if (recentLink) {
        RecentSearches.add(recentLink.dataset.hsRecentTerm);
        return;
      }

      var trendingLink = e.target.closest('[data-hs-trending-term]');
      if (trendingLink) {
        RecentSearches.add(trendingLink.dataset.hsTrendingTerm);
        return;
      }
    });
  };

  HeaderSearch.prototype._showEmpty = function () {
    var trending = window.HS_TRENDING || [];
    var recent   = RecentSearches.load();
    var featured = window.HS_FEATURED_PRODUCTS || [];
    var html     = buildEmptyState(trending, recent, featured, this.searchUrl);

    if (!html) {
      this.close();
      return;
    }

    this._emptyVisible = true;
    this.panel.innerHTML = html;
    this._open();
    this._initCarousel();
    this.activeIndex = -1;
    this._announce(this._buildEmptyAnnouncement(recent, trending, featured));
  };

  HeaderSearch.prototype._buildEmptyAnnouncement = function (recent, trending, featured) {
    var parts = [];
    if (recent.length)   parts.push(recent.length   + ' recent search'   + (recent.length   > 1 ? 'es' : ''));
    if (featured.length) parts.push(featured.length + ' suggested product' + (featured.length > 1 ? 's' : ''));
    if (trending.length) parts.push(trending.length + ' trending search' + (trending.length > 1 ? 'es' : ''));
    return parts.length ? parts.join(', ') + ' available' : '';
  };

  HeaderSearch.prototype._fetch = function (query) {
    var self     = this;
    var key      = query.toLowerCase().trim();
    var cached   = _cache.get(key);

    if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
      this._renderResults(cached.html);
      return;
    }

    if (this.controller) this.controller.abort();
    this.controller = new AbortController();

    this._showLoading();

    var params = new URLSearchParams({
      q: query,
      section_id: 'predictive-search',
      'resources[type]': 'product,collection,query',
      'resources[limit]': '8',
      'resources[limit_scope]': 'each',
      'resources[options][unavailable_products]': 'last',
    });

    fetch(this.predictiveUrl + '?' + params.toString(), {
      signal: this.controller.signal,
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var doc     = new DOMParser().parseFromString(text, 'text/html');
        var section = doc.querySelector('#shopify-section-predictive-search');
        var html    = section ? section.innerHTML : '';
        _cache.set(key, { html: html, ts: Date.now() });
        self._renderResults(html);
      })
      .catch(function (err) {
        if (err.name === 'AbortError') return;
        self._showError();
      });
  };

  HeaderSearch.prototype._showLoading = function () {
    this._emptyVisible = false;
    this.panel.innerHTML =
      '<p class="header-search__state">Searching\u2026</p>';
    this._open();
  };

  HeaderSearch.prototype._showError = function () {
    this._emptyVisible = false;
    this.panel.innerHTML =
      '<p class="header-search__state header-search__state--error">'
      + 'Search unavailable \u2014 press Enter to see full results.'
      + '</p>';
    this._open();
  };

  HeaderSearch.prototype._renderResults = function (html) {
    this._emptyVisible = false;
    this.panel.innerHTML = html;

    this._trimSuggestions();

    var optionCount = this.panel.querySelectorAll('[role="option"]').length;

    if (!optionCount) {
      this.panel.innerHTML =
        '<p class="header-search__state">No results found.</p>';
    } else {
      this._injectRecentIntoRail();
      this._initCarousel();
    }

    this._open();
    this.activeIndex = -1;
    this._announce(
      optionCount
        ? optionCount + ' result' + (optionCount === 1 ? '' : 's') + ' available'
        : 'No results found'
    );
  };

  HeaderSearch.prototype._trimSuggestions = function () {
    var rail = this.panel.querySelector('[data-predictive-rail]');
    if (!rail) return;

    this._trimSuggestionType(rail, '.predictive-search__item--query', MAX_SUGGESTED_QUERIES);
    this._trimSuggestionType(rail, '.predictive-search__item--collection', MAX_SUGGESTED_COLLECTIONS);
  };

  HeaderSearch.prototype._trimSuggestionType = function (rail, selector, max) {
    var items = rail.querySelectorAll(selector);
    for (var i = max; i < items.length; i++) {
      var li = items[i].closest('[role="option"]') || items[i].parentElement;
      if (li && li.parentElement) li.parentElement.removeChild(li);
    }

    var remaining = rail.querySelectorAll(selector);
    if (remaining.length) return;

    var lists = rail.querySelectorAll('.predictive-search__list');
    lists.forEach(function (list) {
      if (list.children.length === 0) {
        var group = list.closest('.predictive-search__group');
        if (group && group.parentElement) group.parentElement.removeChild(group);
      }
    });
  };

  HeaderSearch.prototype._injectRecentIntoRail = function () {
    var rail = this.panel.querySelector('[data-predictive-rail]');
    if (!rail) return;

    var recent = RecentSearches.load().slice(0, MAX_RECENT_IN_RAIL);
    var html   = buildRailRecentGroup(recent, this.searchUrl);
    if (!html) return;

    rail.insertAdjacentHTML('beforeend', html);
  };

  HeaderSearch.prototype._initCarousel = function () {
    var carousel = this.panel.querySelector('[data-predictive-carousel]');
    if (!carousel) return;

    var track   = carousel.querySelector('[data-predictive-carousel-track]');
    var prevBtn = carousel.querySelector('[data-predictive-carousel-prev]');
    var nextBtn = carousel.querySelector('[data-predictive-carousel-next]');
    if (!track) return;

    var BUFFER = 1;

    function updateEdges() {
      var maxScroll = track.scrollWidth - track.clientWidth;

      if (maxScroll <= BUFFER) {
        carousel.classList.remove('has-scroll-left', 'has-scroll-right');
        return;
      }

      carousel.classList.toggle('has-scroll-left', track.scrollLeft > BUFFER);
      carousel.classList.toggle('has-scroll-right', track.scrollLeft < maxScroll - BUFFER);
    }

    function scrollByPage(dir) {
      var amount = Math.round(track.clientWidth * 0.9) * dir;
      track.scrollBy({ left: amount, behavior: 'smooth' });
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { scrollByPage(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { scrollByPage(1); });

    track.addEventListener('scroll', updateEdges, { passive: true });
    this._on(window, 'resize', updateEdges);

    updateEdges();
  };

  HeaderSearch.prototype._announce = function (text) {
    if (this.statusEl) this.statusEl.textContent = text;
  };

  HeaderSearch.prototype._positionPanel = function () {
    // Anchor to the row this instance's search bar actually lives in
    // (the top bar for the desktop-bar variant, the mobile search row
    // for the mobile variant) rather than the bottom of the whole
    // header — so the panel drops right from the search field itself
    // and sits on top of the nav-links row underneath it, instead of
    // appearing below that row.
    var row = this.root.closest('.main-header__bar, .main-header__search-row')
              || document.getElementById('main-header');
    var bottom = row ? row.getBoundingClientRect().bottom : 0;
    this.panel.style.top = Math.max(bottom, 0) + 'px';
  };

  HeaderSearch.prototype._open = function () {
    this._positionPanel();
    this.panel.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this.root.classList.add('header-search--open');
    document.dispatchEvent(new CustomEvent('header-search:open'));
  };

  HeaderSearch.prototype.close = function () {
    this._emptyVisible = false;
    this.panel.hidden  = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.root.classList.remove('header-search--open');
    this.activeIndex = -1;
    document.dispatchEvent(new CustomEvent('header-search:close'));
  };

  HeaderSearch.prototype._bindDismiss = function () {
    var self = this;
    this._on(document, 'click', function (e) {
      if (!self.root.contains(e.target)) self.close();
    });
  };

  HeaderSearch.prototype._bindReposition = function () {
    var self = this;
    // The panel is fixed and full-viewport-width now, so it no longer
    // tracks the header via normal document flow: keep its top edge in
    // sync with the header on resize, and just dismiss it on scroll
    // (the header itself isn't sticky, so a scrolled-away header would
    // otherwise leave the panel floating disconnected from it).
    this._on(window, 'resize', function () {
      if (!self.panel.hidden) self._positionPanel();
    });
    this._on(window, 'scroll', function () {
      if (!self.panel.hidden) self.close();
    }, { passive: true });
  };

  HeaderSearch.prototype._bindKeyboard = function () {
    var self = this;

    this._on(this.input, 'keydown', function (e) {
      if (self.panel.hidden) return;

      var items = Array.prototype.slice.call(
        self.panel.querySelectorAll(
          '[role="option"] a, [role="option"] button, a[role="option"]'
        )
      );

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          self.activeIndex = Math.min(self.activeIndex + 1, items.length - 1);
          self._focusItem(items);
          break;

        case 'ArrowUp':
          e.preventDefault();
          self.activeIndex = Math.max(self.activeIndex - 1, -1);
          if (self.activeIndex === -1) {
            self.input.focus();
          } else {
            self._focusItem(items);
          }
          break;

        case 'Escape':
          self.close();
          self.input.focus();
          break;
      }
    });
  };

  HeaderSearch.prototype._focusItem = function (items) {
    var el = items[this.activeIndex];
    if (!el) return;

    var option = el.closest('[role="option"]') || el;
    if (option) {
      var stableId = 'HsOption-' + this.sfx + '-' + this.activeIndex;
      if (option.id !== stableId) option.id = stableId;
      this.input.setAttribute('aria-activedescendant', stableId);
    }

    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest' });
  };

  HeaderSearch.prototype._bindVoice = function () {
    var self = this;
    var SR   = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !this.voiceBtn) return;

    this.voiceBtn.hidden = false;

    var recognition             = new SR();
    this._recognition           = recognition;
    recognition.lang            = document.documentElement.lang || 'en-US';
    recognition.interimResults  = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener('result', function (e) {
      var transcript = (e.results[0][0].transcript || '').trim();
      self.input.value = transcript;
      self._syncClear();
      if (transcript) self._fetch(transcript);
    });

    recognition.addEventListener('start', function () {
      self.voiceBtn.classList.add('header-search__voice--listening');
      self.root.classList.add('header-search--listening');
      self.voiceBtn.setAttribute('aria-label', 'Listening\u2026 tap to stop');
      if (self._typewriter) {
        self._typewriter.pause();
        var overlay = self.root.querySelector('[data-search-typewriter]');
        if (overlay) overlay.hidden = true;
      }
    });

    recognition.addEventListener('end', function () {
      self.voiceBtn.classList.remove('header-search__voice--listening');
      self.root.classList.remove('header-search--listening');
      self.voiceBtn.setAttribute('aria-label', 'Search by voice');
      self._syncTypewriterVisibility();
    });

    recognition.addEventListener('error', function (e) {
      self.voiceBtn.classList.remove('header-search__voice--listening');
      self.root.classList.remove('header-search--listening');
      self.voiceBtn.setAttribute('aria-label', 'Search by voice');
      console.error('Voice search error:', e.error);
      if (e.error === 'not-allowed') self.voiceBtn.hidden = true;
      self._syncTypewriterVisibility();
    });

    this._on(this.voiceBtn, 'click', function () {
      try {
        recognition.start();
      } catch (err) {
        console.error('Voice search failed to start:', err);
      }
    });
  };

  HeaderSearch.prototype.destroy = function () {
    if (this._typewriter) { this._typewriter.destroy(); this._typewriter = null; }
    
    
    
    if (this._inputPlaceholder != null) {
      this.input.setAttribute('placeholder', this._inputPlaceholder);
      this._inputPlaceholder = null;
    }
    if (this.controller) { this.controller.abort(); this.controller = null; }
    if (this._recognition) {
      try { this._recognition.abort(); } catch (_) {}
      this._recognition = null;
    }
    this._listeners.forEach(function (l) {
      l[0].removeEventListener(l[1], l[2], l[3]);
    });
    this._listeners.length = 0;
  };

  function init() {
    document.querySelectorAll('[data-search-root]').forEach(function (el) {
      if (!el._hsInstance) {
        el._hsInstance = new HeaderSearch(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function () {
    document.querySelectorAll('[data-search-root]').forEach(function (el) {
      if (el._hsInstance) el._hsInstance.destroy();
      el._hsInstance = null;
    });
    init();
  });

})();