// app/components/blogs/AiSummaryMenu.tsx
//
// Replaces the plain "Summarize with AI" button with a small menu
// offering three ways to get an AI summary of this article:
//
//   1. "Summarize on this page" — unchanged from AiSummaryBox: posts
//      to api.blog-summary, renders the result in this page's own
//      sum-root styling via renderSummary().
//   2. "Open in ChatGPT" — opens chatgpt.com/?q=<prompt> in a new tab,
//      prefilled and auto-submitted. This is a documented, currently-
//      working ChatGPT URL param.
//   3. "Copy prompt for Claude" — claude.ai's equivalent prefill param
//      (claude.ai/new?q=) was removed, and has separately been
//      flagged as a prompt-injection vector (hidden instructions
//      embedded invisibly in the query string, executed when the
//      reader hits enter) — so this deliberately does NOT try to
//      auto-redirect-and-submit the way the ChatGPT option does. It
//      copies the prompt to the clipboard and opens claude.ai in a
//      new tab; the reader pastes it themselves. The same fallback
//      pattern extends to any other tool without a safe prefill URL
//      (Perplexity, Gemini, etc.) — just add another entry to
//      COPY_TARGETS below.
//
// Manual summary (if any) still always renders first and is
// untouched by any of this — same additive relationship as before.

import {useEffect, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {renderSummary, htmlToPlainText, type SummaryData} from '~/components/blogs/Summary';

type AiSummaryResponse = {summary: SummaryData; cached?: boolean} | {error: string};

// Tools with no safe/working auto-submit prefill URL — clicking these
// copies the prompt and opens the tool's homepage instead of trying
// to deep-link straight into a pre-filled, auto-submitted chat.
const COPY_TARGETS = [
  {label: 'Copy prompt for Claude', url: 'https://claude.ai/new'},
] as const;

const MAX_PROMPT_CHARS = 6000; // keeps the ChatGPT URL a sane length

function buildPrompt(title: string, contentHtml: string, articleUrl: string): string {
  const excerpt = htmlToPlainText(contentHtml).slice(0, MAX_PROMPT_CHARS);
  return `Summarize the key takeaways from this article in a short bulleted list.\n\nTitle: ${title}\nURL: ${articleUrl}\n\n${excerpt}`;
}

export function AiSummaryMenu({
  articleId,
  articleTitle,
  articleUrl,
  contentHtml,
  manualSummaryHtml,
}: {
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  contentHtml: string;
  manualSummaryHtml: string | null;
}) {
  const fetcher = useFetcher<AiSummaryResponse>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLoading = fetcher.state !== 'idle';
  const result = fetcher.data;
  const error = result && 'error' in result ? result.error : null;
  const summary = result && 'summary' in result ? result.summary : null;

  // Close the menu on outside click or Escape — standard menu
  // behavior, not something a reader should have to click the icon
  // again to dismiss.
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  function handleSummarizeOnPage() {
    setMenuOpen(false);
    fetcher.submit(
      {articleId, contentHtml},
      {method: 'POST', action: '/api/blog-summary', encType: 'application/json'},
    );
  }

  function handleOpenChatGpt() {
    setMenuOpen(false);
    const prompt = buildPrompt(articleTitle, contentHtml, articleUrl);
    window.open(
      `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function handleCopyFor(target: (typeof COPY_TARGETS)[number]) {
    setMenuOpen(false);
    const prompt = buildPrompt(articleTitle, contentHtml, articleUrl);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedLabel(target.label);
      setTimeout(() => setCopiedLabel(null), 3000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) —
      // still open the tool so the reader isn't stuck with nothing.
    }
    window.open(target.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="ai-summary-wrap" ref={menuRef}>
      {manualSummaryHtml && (
        <div dangerouslySetInnerHTML={{__html: manualSummaryHtml}} />
      )}

      {!summary && (
        <div className="ai-summary-menu">
          <button
            type="button"
            className="ai-summary-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            disabled={isLoading}
          >
            {isLoading ? 'Summarizing…' : 'Summarize with AI'}
          </button>

          {menuOpen && (
            <div className="ai-summary-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={handleSummarizeOnPage}>
                Summarize on this page
              </button>
              <button type="button" role="menuitem" onClick={handleOpenChatGpt}>
                Open in ChatGPT
              </button>
              {COPY_TARGETS.map((target) => (
                <button
                  type="button"
                  role="menuitem"
                  key={target.url}
                  onClick={() => handleCopyFor(target)}
                >
                  {target.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {copiedLabel && (
        <p className="ai-summary-copied" role="status">
          Prompt copied — paste it into the {copiedLabel.replace('Copy prompt for ', '')} tab that just opened.
        </p>
      )}

      {error && (
        <p className="ai-summary-error" role="alert">
          Couldn't generate a summary right now. {error}
        </p>
      )}

      {summary && (
        <div
          className="ai-summary-result"
          dangerouslySetInnerHTML={{__html: renderSummary(summary)}}
        />
      )}
    </div>
  );
}
