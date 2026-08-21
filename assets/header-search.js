'use strict';

(function () {

  // FIX: idempotent load guard. main-header.liquid now hoists the <script
  // src="header-search.js"> tag so it's only emitted once per page — but
  // this makes a second, accidental inclusion (theme.liquid, an app block,
  // a future edit) harmless instead of throwing on duplicate class
  // declarations and registering a second set of global listeners.
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

  // FIX (root cause of "stuck on Trending term 1"): every settings-panel
  // change in the theme editor fires `shopify:section:load`, which used to
  // destroy the running AnimatedPlaceholder and build a brand new one from
  // termIndex 0 every single time. If you're actively editing the panel
  // faster than one full type+hold+delete cycle (~5-8s), it can never
  // advance past the first term. This map persists {termIndex, charIndex,
  // deleting, pauseUntil-offset} per typewriter "slot" (desktop / mobile /
  // overlay / drawer) across reloads, keyed off a stable slot id rather than
  // the DOM node (which gets replaced on every reload), so a freshly created
  // instance can resume from where the last one left off instead of
  // restarting.
  var _twState = new Map();


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


  function buildEmptyState(trending, recent, searchUrl) {
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


  // FIX: constructor now accepts a stable `slotId` (e.g. 'desktop-bar',
  // 'mobile', 'overlay') and, if _twState has a saved snapshot for that
  // slot, resumes from it instead of always starting at
  // termIndex/charIndex 0. On every meaningful state change the instance
  // writes its snapshot back to _twState so the NEXT reload (which will
  // destroy this instance) can pick up where this one left off.
  function AnimatedPlaceholder(input, terms, overlay, onVisibilityChange, opts, slotId) {
    if (!terms || !terms.length) return;

    this.input       = input;
    this.overlay     = overlay || null;
    this.onVisChange = typeof onVisibilityChange === 'function' ? onVisibilityChange : null;
    this.terms        = terms;
    this.slotId        = slotId || null;
    this.destroyed    = false;
    this.rafId        = null;
    this.staticText   = input.placeholder || 'What are you looking for?';
    this.opts         = opts || {};

    var saved = this.slotId ? _twState.get(this.slotId) : null;
    if (saved && saved.terms === terms.join('||')) {
      // Resume mid-cycle. Re-base pauseUntil relative to "now" using the
      // remaining time that had been left, so a mid-hold or mid-gap pause
      // doesn't just vanish or double up.
      var now0 = performance.now();
      this.termIndex  = saved.termIndex % terms.length;
      this.charIndex  = saved.charIndex;
      this.deleting   = saved.deleting;
      this.lastTick   = now0;
      this.pauseUntil = saved.remainingPause > 0 ? now0 + saved.remainingPause : 0;
    } else {
      this.termIndex    = 0;
      this.charIndex    = 0;
      this.deleting     = false;
      this.lastTick     = 0;
      this.pauseUntil   = 0;
    }

    var self = this;

    if (this.overlay) {
      this.overlay.innerHTML =
        '<span class="hs-tw-prefix">Search for </span>'
        + '<span class="hs-tw-chars"></span>';
      this.charsEl = this.overlay.querySelector('.hs-tw-chars');
      input.placeholder = '';

      // Repaint whatever partial word we resumed into, since charsEl
      // starts empty regardless of a resumed charIndex.
      if (this.charIndex > 0) {
        var term = this.terms[this.termIndex] || '';
        for (var i = 0; i < this.charIndex && i < term.length; i++) {
          var span = document.createElement('span');
          span.className = 'hs-tw-char';
          span.textContent = term[i];
          this.charsEl.appendChild(span);
        }
      }
    } else if (this.charIndex > 0) {
      var resumedTerm = this.terms[this.termIndex] || '';
      this.input.placeholder = 'Search for ' + resumedTerm.slice(0, this.charIndex);
    }

    this._onInput = function () {
      if (input.value) {
        if (!self.paused) self._pause();
      } else {
        if (self.paused) self.resume();
      }
    };

    this._onBlur = function () {
      if (!input.value && self.paused) self.resume();
    };

    input.addEventListener('input', this._onInput);
    input.addEventListener('blur', this._onBlur);

    this._syncOverlayVisibility();
    this._tick(performance.now());
  }

  AnimatedPlaceholder.prototype._syncOverlayVisibility = function () {
    var hasValue = !!this.input.value;
    if (this.overlay) this.overlay.style.display = hasValue ? 'none' : '';
    if (this.onVisChange) this.onVisChange(hasValue);
  };

  AnimatedPlaceholder.prototype._pause = function () {
    this.paused = true;
    this._syncOverlayVisibility();
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this._saveState();
  };

  AnimatedPlaceholder.prototype._appendChar = function (ch) {
    if (!this.charsEl) return;
    var span = document.createElement('span');
    span.className = 'hs-tw-char hs-tw-char--fresh';
    span.textContent = ch;
    this.charsEl.appendChild(span);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        span.classList.remove('hs-tw-char--fresh');
      });
    });
  };

  AnimatedPlaceholder.prototype._removeChar = function () {
    if (this.charsEl && this.charsEl.lastElementChild) {
      this.charsEl.removeChild(this.charsEl.lastElementChild);
    }
  };

  // FIX: persist a resumable snapshot every tick that changes state, so
  // a section reload arriving mid-cycle doesn't lose progress. Cheap
  // (a small object write to a Map) and only happens on state changes,
  // not every animation frame.
  AnimatedPlaceholder.prototype._saveState = function (now) {
    if (!this.slotId) return;
    var remainingPause = 0;
    if (this.pauseUntil && typeof now === 'number') {
      remainingPause = Math.max(0, this.pauseUntil - now);
    }
    _twState.set(this.slotId, {
      terms: this.terms.join('||'),
      termIndex: this.termIndex,
      charIndex: this.charIndex,
      deleting: this.deleting,
      remainingPause: remainingPause,
    });
  };

  AnimatedPlaceholder.prototype._tick = function (now) {
    var self     = this;
    var TYPING   = this.opts.typeSpeed || 70;
    var DELETING = Math.round(TYPING * 0.53);
    var HOLD     = this.opts.holdMs || 3200;
    var GAP      = 400;

    if (this.destroyed) return;
    if (!this.input.isConnected) { this._pause(); return; }

    if (this.paused || this.input.value) return;

    if (now < this.pauseUntil) {
      this.rafId = requestAnimationFrame(function (t) { self._tick(t); });
      return;
    }

    var term = this.terms[this.termIndex];

    if (!this.deleting) {
      if (now - this.lastTick < TYPING) {
        this.rafId = requestAnimationFrame(function (t) { self._tick(t); });
        return;
      }
      var nextChar = term[this.charIndex];
      this.charIndex++;
      if (this.overlay) {
        this._appendChar(nextChar);
      } else {
        this.input.placeholder = 'Search for ' + term.slice(0, this.charIndex);
      }
      this.lastTick = now;
      if (this.charIndex >= term.length) {
        this.deleting   = true;
        this.pauseUntil = now + HOLD;
      }
      this._saveState(now);
    } else {
      if (now - this.lastTick < DELETING) {
        this.rafId = requestAnimationFrame(function (t) { self._tick(t); });
        return;
      }
      this.charIndex--;
      if (this.overlay) {
        this._removeChar();
      } else {
        this.input.placeholder = this.charIndex > 0
          ? 'Search for ' + term.slice(0, this.charIndex)
          : this.staticText;
      }
      this.lastTick = now;
      if (this.charIndex <= 0) {
        this.deleting   = false;
        this.termIndex  = (this.termIndex + 1) % this.terms.length;
        this.pauseUntil = now + GAP;
      }
      this._saveState(now);
    }

    this.rafId = requestAnimationFrame(function (t) { self._tick(t); });
  };

  AnimatedPlaceholder.prototype.pause = function (overridePlaceholder) {
    this._pause();
    if (overridePlaceholder) {
      if (this.overlay) this.overlay.style.display = 'none';
      this.input.placeholder = overridePlaceholder;
    }
  };

  AnimatedPlaceholder.prototype.resume = function () {
    if (this.destroyed) return;
    if (this.input.value) return;
    this.paused    = false;
    this.charIndex = 0;
    this.deleting  = false;
    if (this.overlay) {
      this.input.placeholder = '';
      if (this.charsEl) this.charsEl.innerHTML = '';
      this._syncOverlayVisibility();
    } else {
      this.input.placeholder = this.staticText;
    }
    this._tick(performance.now());
  };

  AnimatedPlaceholder.prototype.destroy = function () {
    // FIX: save final state before tearing down so the *next* instance
    // for this slot (created right after by the section-reload handler)
    // can resume instead of restarting at term 1 / char 0.
    this._saveState(performance.now());
    this.destroyed = true;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    if (this._onInput) this.input.removeEventListener('input', this._onInput);
    if (this._onBlur) this.input.removeEventListener('blur', this._onBlur);
  };


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

    // FIX: previously guessed the variant by testing CSS classes
    // ('header-search--desktop' / 'header-search--mobile'), neither of
    // which matches the real variant strings this section ever renders
    // (desktop-bar / mobile / overlay / drawer variants) — both of those
    // checks failed and silently fell through to the 'search' fallback,
    // so any two variants that both missed (e.g. overlay + a drawer
    // instance mounted at the same time) collided on the same slot id.
    // header-search.liquid now emits data-search-variant="{{ sfx }}" with
    // the exact string Liquid already uses — read it directly instead.
    this.sfx = root.dataset.searchVariant || 'search';

    this.activeIndex   = -1;
    this.controller    = null;
    this._typewriter   = null;
    this._emptyVisible = false;
    this._recognition  = null;

    this._listeners = [];

    if (!this.input) return;

    this._syncClear();
    this._syncHasValue();

    this._bindClear();
    this._initTypewriter();

    if (!this.isPredictive) return;

    this._bindInput();
    this._bindEmptyStateDelegation();
    this._bindKeyboard();
    this._bindDismiss();
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

  HeaderSearch.prototype._syncHasValue = function () {
    this.root.classList.toggle('header-search--has-value', this.input.value.length > 0);
  };

  HeaderSearch.prototype._bindClear = function () {
    var self = this;

    this._on(this.input, 'input',  function () { self._syncClear(); self._syncHasValue(); });
    this._on(this.input, 'change', function () { self._syncClear(); self._syncHasValue(); });

    if (this.clearBtn) {
      this._on(this.clearBtn, 'click', function () {
        self.input.value = '';
        self._syncClear();
        self._syncHasValue();
        self.input.focus();
        if (self.isPredictive) {
          self._showEmpty();
        }
      });
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
    var html     = buildEmptyState(trending, recent, this.searchUrl);

    if (!html) {
      this.close();
      return;
    }

    this._emptyVisible = true;
    this.panel.innerHTML = html;
    this._open();
    this.activeIndex = -1;
    this._announce(this._buildEmptyAnnouncement(recent, trending));
  };

  HeaderSearch.prototype._buildEmptyAnnouncement = function (recent, trending) {
    var parts = [];
    if (recent.length)   parts.push(recent.length   + ' recent search'   + (recent.length   > 1 ? 'es' : ''));
    if (trending.length) parts.push(trending.length + ' trending search' + (trending.length > 1 ? 'es' : ''));
    return parts.length ? parts.join(' and ') + ' available' : '';
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


  HeaderSearch.prototype._open = function () {
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
      self._syncHasValue();
      if (transcript) self._fetch(transcript);
    });

    recognition.addEventListener('start', function () {
      self.voiceBtn.classList.add('header-search__voice--listening');
      self.root.classList.add('header-search--listening');
      self.voiceBtn.setAttribute('aria-label', 'Listening\u2026 tap to stop');
      if (self._typewriter) self._typewriter.pause('Listening\u2026');
    });

    recognition.addEventListener('end', function () {
      self.voiceBtn.classList.remove('header-search__voice--listening');
      self.root.classList.remove('header-search--listening');
      self.voiceBtn.setAttribute('aria-label', 'Search by voice');
      if (self._typewriter && !self.input.value) self._typewriter.resume();
    });

    recognition.addEventListener('error', function (e) {
      self.voiceBtn.classList.remove('header-search__voice--listening');
      self.root.classList.remove('header-search--listening');
      self.voiceBtn.setAttribute('aria-label', 'Search by voice');
      console.error('Voice search error:', e.error);
      if (e.error === 'not-allowed') self.voiceBtn.hidden = true;
      if (self._typewriter && !self.input.value) self._typewriter.resume();
    });

    this._on(this.voiceBtn, 'click', function () {
      try {
        recognition.start();
      } catch (err) {
        console.error('Voice search failed to start:', err);
      }
    });
  };


  HeaderSearch.prototype._initTypewriter = function () {
    if (!this.root.hasAttribute('data-typewriter-enabled')) return;

    var terms = window.HS_TRENDING;
    if (!terms || !terms.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.input.placeholder = 'Search for ' + terms[0];
      return;
    }

    var self    = this;
    var overlay = this.root.querySelector('[data-search-typewriter]');
    var opts    = window.HS_TYPEWRITER_OPTS || {};

    // Pass the stable slot id (now sourced from data-search-variant, see
    // the FIX note on this.sfx above) so AnimatedPlaceholder can look up
    // and resume its saved state across a section reload — and so two
    // simultaneously-mounted instances never share a slot.
    this._typewriter = new AnimatedPlaceholder(this.input, terms, overlay, function (hasValue) {
      self.root.classList.toggle('header-search--has-value', hasValue);
    }, opts, this.sfx);
  };

  HeaderSearch.prototype.destroy = function () {
    if (this._typewriter) { this._typewriter.destroy(); this._typewriter = null; }
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