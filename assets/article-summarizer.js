(function () {
  var AI_NAMES = {
    claude:      'Claude',
    chatgpt:     'ChatGPT',
    gemini:      'Gemini',
    grok:        'Grok',
    perplexity:  'Perplexity',
    mistral:     'Mistral',
    deepseek:    'DeepSeek'
  };

  // Max chars we'll put in a ?q= URL param.
  // Most browsers handle ~8 000 chars in a URL safely; we stay well under.
  var URL_PARAM_LIMIT = 3000;

  function buildDefaultPrompt(title, excerpt) {
    return [
      'Please summarize the following article for me.',
      '',
      'Article title: ' + title,
      '',
      'Article text:',
      excerpt,
      '',
      'In your summary:',
      '- Start with a 2–3 sentence overview of the main argument or finding.',
      '- List the 4–5 most important points or takeaways.',
      '- End with a one-sentence conclusion.',
      'Keep the tone neutral and factual.'
    ].join('\n');
  }

  // Returns the custom metafield prompt if set, otherwise the default.
  // The custom prompt may include [title] and [excerpt] placeholders —
  // we replace them so editors can reference article data in their prompt.
  function resolvePrompt(customPrompt, title, excerpt) {
    if (customPrompt && customPrompt.trim() !== '') {
      return customPrompt
        .replace(/\[title\]/g, title)
        .replace(/\[excerpt\]/g, excerpt);
    }
    return buildDefaultPrompt(title, excerpt);
  }

  // Build the destination URL. Append the prompt as ?q= when the prompt fits
  // within URL_PARAM_LIMIT; otherwise fall back to the bare base URL.
  function buildUrl(baseUrl, prompt) {
    if (prompt.length > URL_PARAM_LIMIT) return baseUrl;
    try {
      var url = new URL(baseUrl);
      url.searchParams.set('q', prompt);
      return url.toString();
    } catch (e) {
      return baseUrl;
    }
  }

  var toastTimer = null;

  function showToast(message, isError) {
    var toast = document.getElementById('ma-summarizer-toast');
    if (!toast) return;

    var textEl = toast.querySelector('.ma-summarizer-toast__text');
    if (textEl) textEl.textContent = message;

    toast.classList.toggle('is-error', !!isError);
    toast.classList.add('is-visible');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () {
        toast.classList.remove('is-error');
      }, 220);
    }, isError ? 5000 : 6000);
  }

  function handleClick(btn, title, excerpt, customPrompt) {
    var ai      = btn.getAttribute('data-ai');
    var baseUrl = btn.getAttribute('data-url');
    var prompt  = resolvePrompt(customPrompt, title, excerpt);
    var name    = AI_NAMES[ai] || ai;
    var destUrl = buildUrl(baseUrl, prompt);
    var usedParam = destUrl !== baseUrl;

    btn.setAttribute('disabled', 'disabled');
    var restore = function () { btn.removeAttribute('disabled'); };

    function openAndToast(clipboardOk) {
      window.open(destUrl, '_blank', 'noopener,noreferrer');

      var msg;
      if (usedParam && clipboardOk) {
        // Best case: prompt in URL and on clipboard
        msg = 'Opening ' + name + ' with your prompt. If it doesn\'t appear, paste from your clipboard.';
      } else if (usedParam && !clipboardOk) {
        // URL param set but clipboard failed — still likely to work
        msg = 'Opening ' + name + ' with your prompt pre-filled.';
      } else if (!usedParam && clipboardOk) {
        // Prompt too long for URL — clipboard is the main hand-off
        msg = 'Prompt copied — paste it into ' + name + ' to get your summary.';
      } else {
        // Neither worked well
        msg = name + ' opened. Your prompt was too long to pre-fill — try pasting if you copied it manually.';
      }

      showToast(msg, !clipboardOk && !usedParam);
    }

    // Always try to copy to clipboard as fallback, then open regardless
    navigator.clipboard.writeText(prompt).then(function () {
      restore();
      openAndToast(true);
    }).catch(function () {
      restore();
      openAndToast(false);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.querySelector('.ma-summarizer');
    if (!container) return;

    var title        = container.getAttribute('data-title')         || '';
    var excerpt      = container.getAttribute('data-excerpt')       || '';
    var customPrompt = container.getAttribute('data-custom-prompt') || '';
    var buttons      = container.querySelectorAll('.ma-summarizer__btn');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleClick(btn, title, excerpt, customPrompt);
      });
    });
  });
})();
