(function () {
  'use strict';

  /* ─── Config ─────────────────────────────────────────────────── */
  var CONTENT_SELECTOR = '.article-content-body';
  var WORD_CLASS       = 'ma-word';
  var ACTIVE_CLASS     = 'is-spoken';
  var DEFAULT_RATE     = 1.25;

  /* ─── State ──────────────────────────────────────────────────── */
  var utterance   = null;
  var words       = [];      // flat array of word <span> elements
  var wordTexts   = [];      // plain text of each word (for charIndex mapping)
  var fullText    = '';      // full plain-text string fed to SpeechSynthesisUtterance
  var charMap     = [];      // charMap[i] = word index that starts at char i
  var activeIndex = -1;
  var rate        = DEFAULT_RATE;
  var resumeIndex = 0;       // word index to resume from after pause
  var isPlaying   = false;
  var estDuration = 0;       // estimated total seconds
  var startTime   = null;    // Date.now() when current segment started
  var startOffset = 0;       // elapsed seconds already played before this segment
  var rafId       = null;

  /* ─── DOM refs (populated on DOMContentLoaded) ────────────────── */
  var playBtn, playIcon, pauseIcon;
  var fill, thumb, progressBar;
  var elapsed, remaining;
  var voiceSelect;
  var speedBtns;

  /* ─── Utilities ──────────────────────────────────────────────── */
  function fmtTime(secs) {
    secs = Math.max(0, Math.round(secs));
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ─── Word wrapping ──────────────────────────────────────────── */
  /*
   * Walk all text nodes inside CONTENT_SELECTOR, split each on
   * whitespace, and wrap every token in <span class="ma-word">.
   * Preserves surrounding punctuation attached to the word.
   */
  function wrapWords() {
    var content = document.querySelector(CONTENT_SELECTOR);
    if (!content) return;

    var walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          var tag = node.parentElement && node.parentElement.tagName;
          // Skip script/style/already-wrapped nodes
          if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
          if (node.parentElement.classList.contains(WORD_CLASS)) return NodeFilter.FILTER_REJECT;
          return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    var textNodes = [];
    var n;
    while ((n = walker.nextNode())) textNodes.push(n);

    textNodes.forEach(function (node) {
      var tokens = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      tokens.forEach(function (token) {
        if (/^\s+$/.test(token) || token === '') {
          frag.appendChild(document.createTextNode(token));
        } else {
          var span = document.createElement('span');
          span.className = WORD_CLASS;
          span.textContent = token;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });

    words = Array.from(content.querySelectorAll('.' + WORD_CLASS));

    /* Build flat text + char→word map */
    var pos = 0;
    var parts = [];
    words.forEach(function (span, i) {
      var t = span.textContent;
      wordTexts[i] = t;
      for (var c = 0; c < t.length; c++) {
        charMap[pos + c] = i;
      }
      parts.push(t);
      pos += t.length;
      if (i < words.length - 1) {
        charMap[pos] = i; // space between words maps to current word
        pos += 1;
      }
    });
    fullText = parts.join(' ');

    /* Click-to-seek */
    words.forEach(function (span, i) {
      span.addEventListener('click', function (e) {
        // Word spans can sit inside other clickable elements (e.g. an
        // in-article <a> link). Without this, clicking a word would
        // both seek AND trigger the ancestor's own click behavior
        // (e.g. navigating away from the page).
        e.preventDefault();
        e.stopPropagation();
        seekToWord(i);
      });
    });
  }

  /* ─── Highlight ──────────────────────────────────────────────── */
  function highlightWord(index) {
    if (index === activeIndex) return;
    if (activeIndex >= 0 && words[activeIndex]) {
      words[activeIndex].classList.remove(ACTIVE_CLASS);
    }
    activeIndex = index;
    if (index >= 0 && words[index]) {
      words[index].classList.add(ACTIVE_CLASS);
      scrollToWord(words[index]);
    }
  }

  function clearHighlight() {
    if (activeIndex >= 0 && words[activeIndex]) {
      words[activeIndex].classList.remove(ACTIVE_CLASS);
    }
    activeIndex = -1;
  }

  function scrollToWord(span) {
    /* Only auto-scroll on mobile / when word is out of view */
    var rect = span.getBoundingClientRect();
    var inView = rect.top >= 80 && rect.bottom <= (window.innerHeight - 40);
    if (!inView) {
      span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ─── Progress bar ───────────────────────────────────────────── */
  function updateProgress(pct) {
    pct = Math.min(100, Math.max(0, pct));
    fill.style.width  = pct + '%';
    thumb.style.left  = pct + '%';
    progressBar.setAttribute('aria-valuenow', Math.round(pct));
  }

  function tickProgress() {
    if (!isPlaying || !startTime) return;
    var played = startOffset + (Date.now() - startTime) / 1000;
    if (estDuration > 0) {
      updateProgress((played / estDuration) * 100);
    }
    elapsed.textContent   = fmtTime(played);
    remaining.textContent = '–' + fmtTime(Math.max(0, estDuration - played));
    rafId = requestAnimationFrame(tickProgress);
  }

  function estimateDuration(text, spd) {
    /* Average English TTS ~ 160 wpm at rate=1 */
    var wordCount = text.trim().split(/\s+/).length;
    return (wordCount / (160 * spd)) * 60;
  }

  /* ─── Click-to-seek on progress bar ─────────────────────────── */
  function seekByFraction(frac) {
    frac = Math.min(1, Math.max(0, frac));
    var targetIndex = Math.round(frac * (words.length - 1));
    seekToWord(targetIndex);
  }

  function seekToWord(index) {
    stopUtterance();
    resumeIndex = index;
    /* Calculate elapsed offset based on word position */
    startOffset = (index / words.length) * estDuration;
    startTime   = Date.now();
    speakFrom(index);
    setPlayingState(true);
  }

  /* ─── SpeechSynthesis ────────────────────────────────────────── */
  function buildTextFrom(index) {
    return wordTexts.slice(index).join(' ');
  }

  function buildLocalCharMap(startWordIndex) {
    var localMap = [];
    var pos = 0;
    for (var i = startWordIndex; i < wordTexts.length; i++) {
      for (var c = 0; c < wordTexts[i].length; c++) {
        localMap[pos + c] = i;
      }
      pos += wordTexts[i].length;
      if (i < wordTexts.length - 1) {
        localMap[pos] = i;
        pos += 1;
      }
    }
    return localMap;
  }

  function speakFrom(startIndex) {
    var synth = window.speechSynthesis;
    if (!synth) return;

    var text = buildTextFrom(startIndex);
    if (!text.trim()) return;

    utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;

    var voices = synth.getVoices();
    var selected = voiceSelect.value;
    var voice = voices.find(function (v) { return v.name === selected; });
    if (voice) utterance.voice = voice;

    var segStart = startIndex;
    /*
     * charIndex from onboundary is relative to the utterance text, which
     * starts at segStart. Build the lookup once per utterance (not per
     * boundary event — onboundary fires once per word, so rebuilding this
     * map every time was O(n) work per word, O(n^2) for the whole article).
     */
    var localCharMap = buildLocalCharMap(segStart);

    utterance.onboundary = function (e) {
      if (e.name !== 'word') return;
      var idx = localCharMap[e.charIndex] !== undefined ? localCharMap[e.charIndex] : segStart;
      highlightWord(idx);
      resumeIndex = idx;
    };

    utterance.onend = function () {
      stopKeepAlive();
      clearHighlight();
      setPlayingState(false);
      updateProgress(100);
      cancelAnimationFrame(rafId);
      elapsed.textContent   = fmtTime(estDuration);
      remaining.textContent = '–0:00';
      resumeIndex = 0;
      startOffset = 0;
    };

    utterance.onerror = function (e) {
      stopKeepAlive();
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      setPlayingState(false);
      clearHighlight();
    };

    synth.speak(utterance);
    startKeepAlive();
  }

  /* ─── Chrome keep-alive workaround ─────────────────────────────
   * Chrome has a long-standing bug where speechSynthesis silently
   * stops partway through long utterances (especially if the tab
   * loses focus). Periodically pausing/resuming nudges it to keep
   * going. Harmless no-op on browsers that don't have the bug.
  ────────────────────────────────────────────────────────────── */
  var keepAliveId = null;

  function startKeepAlive() {
    stopKeepAlive();
    keepAliveId = setInterval(function () {
      var synth = window.speechSynthesis;
      if (synth && synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 5000);
  }

  function stopKeepAlive() {
    if (keepAliveId) {
      clearInterval(keepAliveId);
      keepAliveId = null;
    }
  }

  function stopUtterance() {
    var synth = window.speechSynthesis;
    if (synth) synth.cancel();
    utterance = null;
    cancelAnimationFrame(rafId);
    stopKeepAlive();
  }

  /* ─── Play / Pause ───────────────────────────────────────────── */
  function play() {
    var synth = window.speechSynthesis;
    if (!synth) {
      alert('Your browser does not support text-to-speech.');
      return;
    }

    if (resumeIndex === 0) {
      estDuration = estimateDuration(fullText, rate);
      startOffset = 0;
    }

    startTime = Date.now();
    speakFrom(resumeIndex);
    setPlayingState(true);
    rafId = requestAnimationFrame(tickProgress);
  }

  function pause() {
    stopUtterance();
    /* startOffset accumulates what was played before this pause */
    startOffset = startOffset + (Date.now() - startTime) / 1000;
    setPlayingState(false);
  }

  function setPlayingState(playing) {
    isPlaying = playing;
    playIcon.style.display  = playing ? 'none' : '';
    pauseIcon.style.display = playing ? ''     : 'none';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if (playing) {
      rafId = requestAnimationFrame(tickProgress);
    } else {
      cancelAnimationFrame(rafId);
    }
  }

  /* ─── Voice population ───────────────────────────────────────── */
  function populateVoices() {
    var voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    /* Prefer English voices, put them first */
    var enVoices = voices.filter(function (v) { return /^en/.test(v.lang); });
    var otherVoices = voices.filter(function (v) { return !/^en/.test(v.lang); });
    var sorted = enVoices.concat(otherVoices);

    voiceSelect.innerHTML = '';
    sorted.forEach(function (v) {
      var opt = document.createElement('option');
      opt.value       = v.name;
      opt.textContent = v.name + (v.localService ? '' : ' ✦');
      /* Pre-select the default or first English voice */
      if (v.default || (!voiceSelect.value && /^en/.test(v.lang))) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });
  }

  /* ─── Init ───────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var player = document.getElementById('ma-player');
    if (!player) return;

    playBtn   = document.getElementById('ma-player-play');
    playIcon  = playBtn.querySelector('.ma-player__icon--play');
    pauseIcon = playBtn.querySelector('.ma-player__icon--pause');
    fill        = document.getElementById('ma-player-fill');
    thumb       = document.getElementById('ma-player-thumb');
    progressBar = document.getElementById('ma-player-progress');
    elapsed     = document.getElementById('ma-player-elapsed');
    remaining   = document.getElementById('ma-player-remaining');
    voiceSelect = document.getElementById('ma-player-voice');
    speedBtns   = Array.from(player.querySelectorAll('.ma-player__speed-btn'));

    /* Wrap article words */
    wrapWords();
    estDuration = estimateDuration(fullText, rate);
    remaining.textContent = '–' + fmtTime(estDuration);

    /* Play / Pause */
    playBtn.addEventListener('click', function () {
      if (isPlaying) { pause(); } else { play(); }
    });

    /* Progress bar scrubbing */
    progressBar.addEventListener('click', function (e) {
      var rect = progressBar.getBoundingClientRect();
      var frac = (e.clientX - rect.left) / rect.width;
      seekByFraction(frac);
    });

    /* Speed buttons */
    speedBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        speedBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        rate = parseFloat(btn.getAttribute('data-speed'));
        estDuration = estimateDuration(fullText, rate);
        /* Rescale elapsed offset to the new total duration, otherwise
           the progress bar and elapsed/remaining times jump out of sync
           with how many words are actually left to speak. */
        startOffset = (resumeIndex / words.length) * estDuration;
        remaining.textContent = '–' + fmtTime(Math.max(0, estDuration - startOffset));
        /* If playing, restart from current word at new rate */
        if (isPlaying) {
          stopUtterance();
          startTime   = Date.now();
          speakFrom(resumeIndex);
          rafId = requestAnimationFrame(tickProgress);
        }
      });
    });

    /* Voice selection */
    var synth = window.speechSynthesis;
    if (synth) {
      populateVoices();
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoices;
      }
    }

    voiceSelect.addEventListener('change', function () {
      if (isPlaying) {
        stopUtterance();
        startTime = Date.now();
        speakFrom(resumeIndex);
        rafId = requestAnimationFrame(tickProgress);
      }
    });

    /* Stop speech if user navigates away */
    window.addEventListener('beforeunload', function () {
      stopUtterance();
    });
  });
})();
