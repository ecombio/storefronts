/**
 * ECOMBIO Predictive Search
 * File: assets/ecombio-search.js
 *
 * Architecture: Class per search instance — supports desktop + mobile simultaneously
 * API: Shopify Ajax Predictive Search (/search/suggest.json)
 * Dependencies: None (vanilla JS, native Fetch, AbortController, Web Speech API)
 *
 * Usage: Auto-initializes on DOMContentLoaded for all [data-search-instance] elements.
 *
 * New in this version:
 *   - Voice search via Web Speech API (with graceful fallback)
 *   - Animated placeholder that cycles through trending terms
 *   - Staggered result row animations
 *   - ⌘K / Ctrl+K global shortcut to focus the desktop instance
 *
 * Fixes in this revision:
 *   - Query suggestions now reuse highlightMatch() (same as products /
 *     collections) instead of Shopify's raw styled_text, which was being
 *     HTML-escaped and showing literal <mark>/<span> tags to users.
 *   - Removed the category-pill open/close/select logic that duplicated
 *     (and fought with) assets/header.js's implementation on the same
 *     elements. header.js now owns that UI; this file just listens for
 *     the "ecombio:category_change" event it dispatches.
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const ECOMBIO_SEARCH_CONFIG = Object.assign(
  {
    MIN_QUERY_LENGTH:       2,
    DEBOUNCE_MS:            200,
    MAX_QUERIES:            3,
    MAX_PRODUCTS:           5,
    MAX_COLLECTIONS:        2,
    RECENT_SEARCHES_KEY:    'ecombio_recent_searches',
    RECENT_SEARCHES_LIMIT:  5,
    TRENDING_SEARCHES:      ['sofa', 'dining table', 'accent chair', 'floor lamp', 'bookshelf'],
    API_ENDPOINT:           '/search/suggest.json',
    CACHE_TTL_MS:           90000,
    // Voice
    VOICE_LANG:             'en-US',
    VOICE_ENABLED:          true,
    // Animated placeholder
    PLACEHOLDER_ANIMATE:    true,
    PLACEHOLDER_INTERVAL:   3200, // ms between terms
    PLACEHOLDER_STATIC:     'What are you looking for?',
  },
  window.ECOMBIO_SEARCH_SETTINGS || {}
);

// ─── In-memory request cache ──────────────────────────────────────────────────

const searchCache = new Map();

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ECOMBIO_SEARCH_CONFIG.CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  searchCache.set(key, { data, ts: Date.now() });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(cents, currency = 'USD') {
  const amount = parseFloat(cents);
  if (isNaN(amount)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark class="ecombio-search__highlight">$1</mark>');
}

function dispatchSearchEvent(name, detail) {
  document.dispatchEvent(new CustomEvent(`ecombio:${name}`, { detail, bubbles: true }));
}

// ─── Session storage helpers ──────────────────────────────────────────────────

function getRecentSearches() {
  try {
    return JSON.parse(sessionStorage.getItem(ECOMBIO_SEARCH_CONFIG.RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  if (!query || query.trim().length < 2) return;
  const clean = query.trim();
  let recent = getRecentSearches().filter(s => s.toLowerCase() !== clean.toLowerCase());
  recent.unshift(clean);
  recent = recent.slice(0, ECOMBIO_SEARCH_CONFIG.RECENT_SEARCHES_LIMIT);
  try {
    sessionStorage.setItem(ECOMBIO_SEARCH_CONFIG.RECENT_SEARCHES_KEY, JSON.stringify(recent));
  } catch { /* storage full — ignore */ }
}

function removeRecentSearch(query) {
  const recent = getRecentSearches().filter(s => s !== query);
  try {
    sessionStorage.setItem(ECOMBIO_SEARCH_CONFIG.RECENT_SEARCHES_KEY, JSON.stringify(recent));
  } catch { /* ignore */ }
}

function clearAllRecentSearches() {
  try {
    sessionStorage.removeItem(ECOMBIO_SEARCH_CONFIG.RECENT_SEARCHES_KEY);
  } catch { /* ignore */ }
}

// ─── Animated Placeholder ─────────────────────────────────────────────────────

class AnimatedPlaceholder {
  /**
   * Cycles the input placeholder through trending terms with a typewriter effect.
   * Pauses automatically while the input has focus or a value.
   *
   * @param {HTMLInputElement} input
   * @param {string[]} terms
   */
  constructor(input, terms) {
    this.input       = input;
    this.terms       = terms && terms.length ? terms : [ECOMBIO_SEARCH_CONFIG.PLACEHOLDER_STATIC];
    this.termIndex   = 0;
    this.charIndex   = 0;
    this.deleting    = false;
    this.paused      = false;
    this.rafId       = null;
    this.lastTick    = 0;
    this.pauseUntil  = 0;

    // Pause while focused or non-empty
    this.input.addEventListener('focus', () => { this.paused = true; });
    this.input.addEventListener('blur',  () => {
      if (!this.input.value) {
        this.paused = false;
        this._tick(performance.now());
      }
    });

    this._tick(performance.now());
  }

  _tick(now) {
    if (this.paused || this.input.value) return;

    const TYPING_SPEED  = 68;   // ms per character typed
    const DELETE_SPEED  = 36;   // ms per character deleted
    const PAUSE_AFTER   = ECOMBIO_SEARCH_CONFIG.PLACEHOLDER_INTERVAL;
    const PAUSE_BEFORE  = 400;

    if (now < this.pauseUntil) {
      this.rafId = requestAnimationFrame(t => this._tick(t));
      return;
    }

    const term = this.terms[this.termIndex];

    if (!this.deleting) {
      if (now - this.lastTick < TYPING_SPEED) {
        this.rafId = requestAnimationFrame(t => this._tick(t));
        return;
      }
      this.charIndex++;
      this.input.placeholder = 'Try "' + term.slice(0, this.charIndex) + '"';
      this.lastTick = now;

      if (this.charIndex >= term.length) {
        // Fully typed — pause before deleting
        this.deleting   = true;
        this.pauseUntil = now + PAUSE_AFTER;
      }
    } else {
      if (now - this.lastTick < DELETE_SPEED) {
        this.rafId = requestAnimationFrame(t => this._tick(t));
        return;
      }
      this.charIndex--;
      this.input.placeholder = this.charIndex > 0
        ? 'Try "' + term.slice(0, this.charIndex) + '"'
        : ECOMBIO_SEARCH_CONFIG.PLACEHOLDER_STATIC;
      this.lastTick = now;

      if (this.charIndex <= 0) {
        this.deleting  = false;
        this.termIndex = (this.termIndex + 1) % this.terms.length;
        this.pauseUntil = now + PAUSE_BEFORE;
      }
    }

    this.rafId = requestAnimationFrame(t => this._tick(t));
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

// ─── Voice Search ─────────────────────────────────────────────────────────────

class VoiceSearch {
  /**
   * Wraps the Web Speech API SpeechRecognition.
   * Emits callbacks rather than events to keep the coupling local.
   *
   * @param {object} opts
   * @param {function} opts.onStart      — called when mic opens
   * @param {function} opts.onResult     — called with (transcript: string)
   * @param {function} opts.onEnd        — called when mic closes
   * @param {function} opts.onError      — called with (errorCode: string)
   */
  constructor(opts = {}) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.supported = false;
      return;
    }

    this.supported  = true;
    this.listening  = false;
    this.onStart    = opts.onStart  || (() => {});
    this.onResult   = opts.onResult || (() => {});
    this.onEnd      = opts.onEnd    || (() => {});
    this.onError    = opts.onError  || (() => {});

    this._rec = new SpeechRecognition();
    this._rec.lang           = ECOMBIO_SEARCH_CONFIG.VOICE_LANG;
    this._rec.interimResults = true;   // stream partial results live
    this._rec.maxAlternatives = 1;
    this._rec.continuous     = false;  // stop automatically after a phrase

    this._rec.onstart = () => {
      this.listening = true;
      this.onStart();
    };

    this._rec.onresult = (e) => {
      let interim = '';
      let final   = '';
      for (const r of e.results) {
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      // Fire with interim text for live input feedback, then final
      this.onResult(final || interim, !!final);
    };

    this._rec.onend = () => {
      this.listening = false;
      this.onEnd();
    };

    this._rec.onerror = (e) => {
      this.listening = false;
      this.onError(e.error);
    };
  }

  toggle() {
    if (!this.supported) return;
    if (this.listening) {
      this._rec.stop();
    } else {
      try {
        this._rec.start();
      } catch (err) {
        // Catches "already started" in some browsers
        this._rec.stop();
      }
    }
  }

  stop() {
    if (this.supported && this.listening) this._rec.stop();
  }
}

// ─── Main Class ───────────────────────────────────────────────────────────────

class EcombioPredictiveSearch {
  constructor(rootEl) {
    this.root      = rootEl;
    this.sfx       = rootEl.dataset.searchInstance || 'desktop';
    this.input     = rootEl.querySelector('.ecombio-search__input');
    this.form      = rootEl.querySelector('.ecombio-search__form');
    this.dropdown  = rootEl.querySelector('.ecombio-search__dropdown');
    this.clearBtn  = rootEl.querySelector('.ecombio-search__clear');
    this.backdrop  = rootEl.querySelector('.ecombio-search__backdrop');
    // Category pill open/close/selection UI is owned by header.js (shared
    // with non-search dropdowns elsewhere in the header). We only need the
    // label/value elements to read the active category, plus catHidden to
    // listen for changes — see _bindEvents / _onCategoryChange.
    this.catLabel  = rootEl.querySelector(`#ecombio-cat-label-${this.sfx}`);
    this.catHidden = rootEl.querySelector(`#ecombio-cat-value-${this.sfx}`);

    this.activeCategory  = { value: '', label: 'All' };
    this.activeIndex     = -1;
    this.isOpen          = false;
    this.lastQuery       = '';
    this.abortController = null;
    this.debouncedFetch  = debounce(this._executeFetch.bind(this), ECOMBIO_SEARCH_CONFIG.DEBOUNCE_MS);

    if (!this.input || !this.dropdown) {
      console.warn('[EcombioPredictiveSearch] Missing required elements in instance:', this.sfx);
      return;
    }

    this._injectMicButton();
    this._bindEvents();
    this._initPlaceholder();
    this._initVoice();
  }

  // ── Inject mic button into the DOM ────────────────────────────────────────

  _injectMicButton() {
    // Insert between clear button and submit button
    const submit = this.form.querySelector('.ecombio-search__submit');
    if (!submit) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ecombio-search__mic';
    btn.setAttribute('aria-label', 'Search by voice');
    btn.setAttribute('title', 'Search by voice');
    btn.innerHTML = `
      <svg class="ecombio-search__mic-icon ecombio-search__mic-icon--idle"
           width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8"  y1="23" x2="16" y2="23"/>
      </svg>
      <svg class="ecombio-search__mic-icon ecombio-search__mic-icon--listening"
           width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
           aria-hidden="true" style="display:none">
        <rect x="9" y="2" width="6" height="12" rx="3"/>
        <path fill="none" stroke="currentColor" stroke-width="2"
              d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line stroke="currentColor" stroke-width="2" x1="12" y1="19" x2="12" y2="23"/>
        <line stroke="currentColor" stroke-width="2" x1="8"  y1="23" x2="16" y2="23"/>
      </svg>`;

    this.micBtn = btn;
    submit.before(btn);
  }

  // ── Animated placeholder ──────────────────────────────────────────────────

  _initPlaceholder() {
    if (!ECOMBIO_SEARCH_CONFIG.PLACEHOLDER_ANIMATE) return;
    const terms = ECOMBIO_SEARCH_CONFIG.TRENDING_SEARCHES;
    if (!terms || terms.length === 0) return;

    // Only animate on desktop to avoid distraction on mobile
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this._placeholder = new AnimatedPlaceholder(this.input, terms);
  }

  // ── Voice ─────────────────────────────────────────────────────────────────

  _initVoice() {
    if (!ECOMBIO_SEARCH_CONFIG.VOICE_ENABLED) {
      this.micBtn && (this.micBtn.hidden = true);
      return;
    }

    this._voice = new VoiceSearch({
      onStart: () => {
        this.micBtn.classList.add('ecombio-search__mic--listening');
        this.micBtn.setAttribute('aria-label', 'Listening… tap to stop');
        this.micBtn.querySelector('.ecombio-search__mic-icon--idle').style.display = 'none';
        this.micBtn.querySelector('.ecombio-search__mic-icon--listening').style.display = '';
        // Pause placeholder while listening
        if (this._placeholder) this._placeholder.paused = true;
        this.input.placeholder = 'Listening…';
      },

      onResult: (transcript, isFinal) => {
        this.input.value = transcript;
        if (this.clearBtn) this.clearBtn.hidden = false;

        if (isFinal) {
          // Final result — fire search immediately (no debounce)
          if (transcript.trim().length >= ECOMBIO_SEARCH_CONFIG.MIN_QUERY_LENGTH) {
            this._showLoading();
            this._executeFetch(transcript.trim());
          }
        } else {
          // Interim — debounced so we don't hammer the API on every word
          if (transcript.trim().length >= ECOMBIO_SEARCH_CONFIG.MIN_QUERY_LENGTH) {
            this._showLoading();
            this.debouncedFetch(transcript.trim());
          }
        }

        dispatchSearchEvent('voice_result', {
          transcript,
          isFinal,
          instance: this.sfx,
        });
      },

      onEnd: () => {
        this.micBtn.classList.remove('ecombio-search__mic--listening');
        this.micBtn.setAttribute('aria-label', 'Search by voice');
        this.micBtn.querySelector('.ecombio-search__mic-icon--idle').style.display = '';
        this.micBtn.querySelector('.ecombio-search__mic-icon--listening').style.display = 'none';
        // Resume placeholder if input is still empty
        if (!this.input.value && this._placeholder) {
          this._placeholder.paused = false;
          this._placeholder._tick(performance.now());
        }
      },

      onError: (code) => {
        // 'not-allowed'   — user denied mic permission
        // 'no-speech'     — silence timeout
        // 'network'       — network error
        if (code === 'not-allowed') {
          this.micBtn.hidden = true; // hide permanently if permission denied
        }
        this._voice.onEnd(); // resets UI
        dispatchSearchEvent('voice_error', { code, instance: this.sfx });
      },
    });

    if (!this._voice.supported) {
      // Browser doesn't support SpeechRecognition — hide the button cleanly
      if (this.micBtn) this.micBtn.hidden = true;
      return;
    }

    this.micBtn.addEventListener('click', () => this._voice.toggle());
  }

  // ── Event Binding ─────────────────────────────────────────────────────────

  _bindEvents() {
    this.input.addEventListener('input',   this._onInput.bind(this));
    this.input.addEventListener('focus',   this._onFocus.bind(this));
    this.input.addEventListener('keydown', this._onKeydown.bind(this));

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', this._onClear.bind(this));
    }

    this.form.addEventListener('submit', this._onFormSubmit.bind(this));

    // header.js owns opening/closing/selecting the category pill (it wires
    // up the same elements for the non-search dropdowns too). We just
    // listen for the change it announces so our AJAX requests stay
    // filtered by whichever category is currently selected.
    if (this.catHidden) {
      this.catHidden.addEventListener('ecombio:category_change', this._onCategoryChange.bind(this));
    }

    document.addEventListener('click', this._onDocumentClick.bind(this));

    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.closeDropdown());
    }

    this.dropdown.addEventListener('click', this._onDropdownClick.bind(this));
  }

  // ── Input handlers ────────────────────────────────────────────────────────

  _onInput(e) {
    const query = e.target.value.trim();
    if (this.clearBtn) this.clearBtn.hidden = query.length === 0;

    if (query.length < ECOMBIO_SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      if (query.length === 0) this._showEmptyFocus();
      else this.closeDropdown();
      return;
    }

    this._showLoading();
    this.debouncedFetch(query);
  }

  _onFocus() {
    const query = this.input.value.trim();
    if (query.length >= ECOMBIO_SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      if (query === this.lastQuery && this.isOpen) return;
      this._showLoading();
      this.debouncedFetch(query);
    } else {
      this._showEmptyFocus();
    }
  }

  _onClear() {
    this.input.value = '';
    this.input.focus();
    if (this.clearBtn) this.clearBtn.hidden = true;
    this._voice && this._voice.stop();
    this._showEmptyFocus();
    dispatchSearchEvent('search_cleared', { instance: this.sfx });
  }

  _onFormSubmit() {
    const query = this.input.value.trim();
    if (query.length > 0) {
      saveRecentSearch(query);
      dispatchSearchEvent('search_started', {
        query,
        category: this.activeCategory.value,
        instance: this.sfx,
      });
    }
    this.closeDropdown();
  }

  // ── Fetch & render ────────────────────────────────────────────────────────

  async _executeFetch(query) {
    const cacheKey = `${query}|${this.activeCategory.value}`;
    const cached = getCached(cacheKey);

    if (cached) {
      this._renderResults(cached, query);
      return;
    }

    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    const params = new URLSearchParams({
      q: this.activeCategory.value ? `${query} tag:${this.activeCategory.value}` : query,
      'resources[type]': 'product,collection,query',
      'resources[limit]': '6',
      'resources[options][unavailable_products]': 'hide',
      'resources[options][fields]': 'title,product_type,variants.title,vendor,tag',
    });

    try {
      const root = window.Shopify?.routes?.root || '/';
      const res  = await fetch(`${root}search/suggest.json?${params}`, {
        signal:  this.abortController.signal,
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setCache(cacheKey, data);
      this._renderResults(data, query);

      dispatchSearchEvent('search_results_loaded', {
        query,
        category:        this.activeCategory.value,
        productCount:    data?.resources?.results?.products?.length    || 0,
        collectionCount: data?.resources?.results?.collections?.length || 0,
        suggestionCount: data?.resources?.results?.queries?.length     || 0,
        instance: this.sfx,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[EcombioPredictiveSearch] Fetch error:', err);
      this._renderNetworkError();
    }
  }

  _renderResults(data, query) {
    const results     = data?.resources?.results || {};
    const queries     = (results.queries     || []).slice(0, ECOMBIO_SEARCH_CONFIG.MAX_QUERIES);
    const products    = (results.products    || []).slice(0, ECOMBIO_SEARCH_CONFIG.MAX_PRODUCTS);
    const collections = (results.collections || []).slice(0, ECOMBIO_SEARCH_CONFIG.MAX_COLLECTIONS);
    const hasResults  = queries.length > 0 || products.length > 0 || collections.length > 0;

    if (!hasResults) {
      this._renderEmpty(query);
      dispatchSearchEvent('search_zero_results', {
        query,
        category: this.activeCategory.value,
        instance: this.sfx,
      });
      return;
    }

    let html = `<div class="ecombio-search__results-header" aria-live="polite">
      <span class="ecombio-search__sr-announce" role="status">
        ${products.length + queries.length + collections.length} results available
      </span>
    </div>`;

    // Query suggestions
    if (queries.length > 0) {
      html += `<div class="ecombio-search__section ecombio-search__section--queries">`;
      queries.forEach((item, i) => {
        const label = highlightMatch(item.text, query);
        html += `
          <a href="/search?q=${encodeURIComponent(item.text)}&type=product"
             class="ecombio-search__item ecombio-search__item--query ecombio-search__item--animate"
             style="--es-row-index:${i}"
             role="option" data-type="query" data-query="${escapeHtml(item.text)}" data-position="${i}">
            <span class="ecombio-search__item-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <span class="ecombio-search__item-text">${label}</span>
            <span class="ecombio-search__item-arrow" aria-hidden="true">↗</span>
          </a>`;
      });
      html += `</div>`;
    }

    // Products
    if (products.length > 0) {
      const sectionLabel = this.activeCategory.value
        ? `Products in ${this.activeCategory.label}`
        : 'Products';

      html += `<div class="ecombio-search__section ecombio-search__section--products">
        <p class="ecombio-search__section-label">${escapeHtml(sectionLabel)}</p>`;

      const queryOffset = queries.length;
      products.forEach((product, i) => {
        const price = product.price
          ? formatMoney(product.price)
          : (product.variants?.[0]?.price ? formatMoney(product.variants[0].price) : '');

        const imgSrc = product.featured_image?.url
          ? product.featured_image.url.replace(/(\.\w+)(\?|$)/, '_80x80$1$2')
          : null;

        const imgHtml = imgSrc
          ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(product.title)}"
                  width="48" height="48" loading="lazy" class="ecombio-search__product-img">`
          : `<span class="ecombio-search__product-img ecombio-search__product-img--placeholder" aria-hidden="true">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                 <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9l4-4 4 4 4-4 4 4"/>
               </svg>
             </span>`;

        const availBadge = product.available === false
          ? `<span class="ecombio-search__product-badge ecombio-search__product-badge--oos">Out of stock</span>`
          : '';

        html += `
          <a href="/products/${escapeHtml(product.handle)}"
             class="ecombio-search__item ecombio-search__item--product ecombio-search__item--animate"
             style="--es-row-index:${queryOffset + i}"
             role="option" data-type="product" data-id="${escapeHtml(product.id)}" data-position="${i}">
            <span class="ecombio-search__product-media">${imgHtml}</span>
            <span class="ecombio-search__product-info">
              <span class="ecombio-search__product-title">${highlightMatch(product.title, query)}</span>
              <span class="ecombio-search__product-meta">
                ${price ? `<span class="ecombio-search__product-price">${escapeHtml(price)}</span>` : ''}
                ${availBadge}
              </span>
            </span>
          </a>`;
      });

      html += `</div>`;
    }

    // Collections (hidden when category filter is active)
    if (collections.length > 0 && !this.activeCategory.value) {
      const collOffset = queries.length + products.length;
      html += `<div class="ecombio-search__section ecombio-search__section--collections">
        <p class="ecombio-search__section-label">Collections</p>`;

      collections.forEach((col, i) => {
        html += `
          <a href="/collections/${escapeHtml(col.handle)}"
             class="ecombio-search__item ecombio-search__item--collection ecombio-search__item--animate"
             style="--es-row-index:${collOffset + i}"
             role="option" data-type="collection" data-id="${escapeHtml(col.id)}" data-position="${i}">
            <span class="ecombio-search__item-icon ecombio-search__item-icon--folder" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span class="ecombio-search__item-text">${highlightMatch(col.title, query)}</span>
            <span class="ecombio-search__item-count" aria-label="${col.products_count || ''} products">
              ${col.products_count ? `${col.products_count} items` : ''}
            </span>
          </a>`;
      });

      html += `</div>`;
    }

    // View all
    const viewAllHref = `/search?q=${encodeURIComponent(query)}&type=product${
      this.activeCategory.value ? `&tag=${encodeURIComponent(this.activeCategory.value)}` : ''}`;

    html += `
      <div class="ecombio-search__section ecombio-search__section--footer">
        <a href="${viewAllHref}"
           class="ecombio-search__view-all"
           role="option" data-type="view_all">
          View all results for <strong>"${escapeHtml(query)}"</strong>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>`;

    this.dropdown.innerHTML = html;
    this.openDropdown();
    this.activeIndex = -1;
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  _showLoading() {
    const skeletonRow = (delay = 0) => `
      <div class="ecombio-search__skeleton-row" aria-hidden="true" style="animation-delay:${delay}ms">
        <div class="ecombio-search__skeleton ecombio-search__skeleton--icon"></div>
        <div class="ecombio-search__skeleton-content">
          <div class="ecombio-search__skeleton ecombio-search__skeleton--title"></div>
          <div class="ecombio-search__skeleton ecombio-search__skeleton--subtitle"></div>
        </div>
      </div>`;

    this.dropdown.innerHTML = `
      <div class="ecombio-search__loading" aria-label="Loading results" role="status">
        ${skeletonRow(0)}${skeletonRow(80)}${skeletonRow(160)}
      </div>`;

    this.openDropdown();
  }

  // ── Empty focus (recent + trending) ──────────────────────────────────────

  _showEmptyFocus() {
    const recent   = getRecentSearches();
    const trending = ECOMBIO_SEARCH_CONFIG.TRENDING_SEARCHES;
    let html = '';

    if (recent.length > 0) {
      html += `
        <div class="ecombio-search__section ecombio-search__section--recent">
          <div class="ecombio-search__section-header">
            <p class="ecombio-search__section-label">Recent</p>
            <button type="button" class="ecombio-search__clear-recent" data-action="clear-all">
              Clear all
            </button>
          </div>`;

      recent.forEach((term, i) => {
        html += `
          <div class="ecombio-search__item ecombio-search__item--recent ecombio-search__item--animate"
               style="--es-row-index:${i}"
               role="option" data-type="recent" data-query="${escapeHtml(term)}" data-position="${i}">
            <span class="ecombio-search__item-icon" aria-hidden="true">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
              </svg>
            </span>
            <span class="ecombio-search__item-text">${escapeHtml(term)}</span>
            <button type="button" class="ecombio-search__remove-recent"
                    data-action="remove-recent" data-term="${escapeHtml(term)}"
                    aria-label="Remove ${escapeHtml(term)} from recent searches">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>`;
      });

      html += `</div>`;
    }

    if (trending.length > 0) {
      html += `
        <div class="ecombio-search__section ecombio-search__section--trending">
          <p class="ecombio-search__section-label">Trending</p>
          <div class="ecombio-search__trending-pills">`;

      trending.forEach(term => {
        html += `
          <button type="button" class="ecombio-search__trending-pill"
                  data-action="trending" data-query="${escapeHtml(term)}">
            ${escapeHtml(term)}
          </button>`;
      });

      html += `</div></div>`;
    }

    if (html) {
      this.dropdown.innerHTML = html;
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  }

  // ── Empty / error states ──────────────────────────────────────────────────

  _renderEmpty(query) {
    const suggestions = ECOMBIO_SEARCH_CONFIG.TRENDING_SEARCHES.slice(0, 3);
    this.dropdown.innerHTML = `
      <div class="ecombio-search__empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <p class="ecombio-search__empty-title">No results for <em>"${escapeHtml(query)}"</em></p>
        <p class="ecombio-search__empty-hint">Try:</p>
        <div class="ecombio-search__trending-pills">
          ${suggestions.map(s => `
            <button type="button" class="ecombio-search__trending-pill"
                    data-action="trending" data-query="${escapeHtml(s)}">
              ${escapeHtml(s)}
            </button>`).join('')}
        </div>
      </div>`;
    this.openDropdown();
  }

  _renderNetworkError() {
    this.dropdown.innerHTML = `
      <div class="ecombio-search__empty ecombio-search__empty--error">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="ecombio-search__empty-title">Search unavailable</p>
        <p class="ecombio-search__empty-hint">Please try again in a moment.</p>
      </div>`;
    this.openDropdown();
  }

  // ── Dropdown open/close ───────────────────────────────────────────────────

  openDropdown() {
    this.dropdown.hidden = false;
    this.isOpen          = true;
    this.input.setAttribute('aria-expanded', 'true');
    this.root.classList.add('ecombio-search--open');

    if (this.backdrop && window.innerWidth < 768) {
      this.backdrop.hidden = false;
      document.body.classList.add('ecombio-search-lock');
    }
  }

  closeDropdown() {
    this.dropdown.hidden = true;
    this.isOpen          = false;
    this.activeIndex     = -1;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.root.classList.remove('ecombio-search--open');

    if (this.backdrop) this.backdrop.hidden = true;
    document.body.classList.remove('ecombio-search-lock');
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────

  _onKeydown(e) {
    if (!this.isOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this._onFocus(); }
      return;
    }

    const items = Array.from(
      this.dropdown.querySelectorAll('.ecombio-search__item, .ecombio-search__view-all')
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
        this._updateActiveItem(items);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (this.activeIndex <= 0) {
          this.activeIndex = -1;
          this.input.removeAttribute('aria-activedescendant');
          items.forEach(el => el.classList.remove('ecombio-search__item--active'));
        } else {
          this.activeIndex--;
          this._updateActiveItem(items);
        }
        break;
      case 'Enter':
        if (this.activeIndex >= 0 && items[this.activeIndex]) {
          e.preventDefault();
          items[this.activeIndex].click();
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        this.input.blur();
        break;
      case 'Tab':
        this.closeDropdown();
        break;
    }
  }

  _updateActiveItem(items) {
    items.forEach((el, i) => {
      const active = i === this.activeIndex;
      el.classList.toggle('ecombio-search__item--active', active);
      el.id = el.id || `ecombio-option-${this.sfx}-${i}`;
      if (active) {
        this.input.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // ── Dropdown click delegation ─────────────────────────────────────────────

  _onDropdownClick(e) {
    const recentItem = e.target.closest('[data-type="recent"]');
    if (recentItem) {
      const removeBtn = e.target.closest('[data-action="remove-recent"]');
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        removeRecentSearch(removeBtn.dataset.term);
        this._showEmptyFocus();
        return;
      }
      const term = recentItem.dataset.query;
      if (term) {
        this.input.value = term;
        this._showLoading();
        this._executeFetch(term);
      }
      return;
    }

    const clearAll = e.target.closest('[data-action="clear-all"]');
    if (clearAll) { clearAllRecentSearches(); this._showEmptyFocus(); return; }

    const trendingBtn = e.target.closest('[data-action="trending"]');
    if (trendingBtn) {
      const term = trendingBtn.dataset.query;
      this.input.value = term;
      if (this.clearBtn) this.clearBtn.hidden = false;
      this._showLoading();
      this._executeFetch(term);
      return;
    }

    const queryItem = e.target.closest('[data-type="query"]');
    if (queryItem) {
      const q = queryItem.dataset.query;
      if (q) { this.input.value = q; saveRecentSearch(q); }
      dispatchSearchEvent('search_result_clicked', {
        query: this.input.value, resultType: 'query',
        position: parseInt(queryItem.dataset.position || '0', 10), instance: this.sfx,
      });
    }

    const productItem = e.target.closest('[data-type="product"]');
    if (productItem) {
      dispatchSearchEvent('search_result_clicked', {
        query: this.input.value, resultType: 'product',
        productId: productItem.dataset.id,
        position: parseInt(productItem.dataset.position || '0', 10), instance: this.sfx,
      });
      saveRecentSearch(this.input.value);
    }

    const colItem = e.target.closest('[data-type="collection"]');
    if (colItem) {
      dispatchSearchEvent('search_result_clicked', {
        query: this.input.value, resultType: 'collection',
        collectionId: colItem.dataset.id,
        position: parseInt(colItem.dataset.position || '0', 10), instance: this.sfx,
      });
      saveRecentSearch(this.input.value);
    }
  }

  // ── Category pill ─────────────────────────────────────────────────────────
  // Open/close, keyboard nav, and ARIA state for the pill live in header.js.
  // This just keeps our local state + AJAX requests in sync with it.

  _onCategoryChange(e) {
    this.activeCategory = {
      value: (e.detail && e.detail.value) || '',
      label: (e.detail && e.detail.label) || 'All',
    };

    const query = this.input.value.trim();
    if (query.length >= ECOMBIO_SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      this._showLoading();
      this._executeFetch(query);
    }
  }

  // ── Outside click ─────────────────────────────────────────────────────────

  _onDocumentClick(e) {
    if (!this.root.contains(e.target)) {
      this.closeDropdown();
    }
  }
}

// ─── Global keyboard shortcut (⌘K / Ctrl+K) ──────────────────────────────────

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    // Target desktop instance first, fall back to whichever is visible
    const desktopInput = document.querySelector(
      '[data-search-instance="desktop"] .ecombio-search__input'
    );
    const anyInput = document.querySelector('.ecombio-search__input');
    const target   = desktopInput || anyInput;
    if (target) target.focus();
  }
});

// ─── Auto-init ────────────────────────────────────────────────────────────────

function initEcombioPredictiveSearch() {
  document.querySelectorAll('[data-search-instance]').forEach(el => {
    if (!el._ecombioSearch) {
      el._ecombioSearch = new EcombioPredictiveSearch(el);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEcombioPredictiveSearch);
} else {
  initEcombioPredictiveSearch();
}

document.addEventListener('shopify:section:load', initEcombioPredictiveSearch);

// ─── Analytics bridge ─────────────────────────────────────────────────────────
// document.addEventListener('ecombio:search_result_clicked', (e) => {
//   gtag('event', 'select_content', { content_type: e.detail.resultType, item_id: e.detail.productId });
// });
// document.addEventListener('ecombio:voice_result', (e) => {
//   gtag('event', 'voice_search', { search_term: e.detail.transcript });
// });