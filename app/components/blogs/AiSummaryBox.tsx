// app/components/blogs/AiSummaryBox.tsx
//
// Wraps the loader's manually-authored summary (summaryHtml, resolved
// server-side from a data-summary-embed marker via
// extractSummarySection + renderSummary — see Summary.tsx) and adds a
// "Summarize with AI" button below it. Clicking the button posts to
// the api.blog-summary resource route and renders whatever comes back
// using the SAME renderSummary() layout logic the manual box uses —
// renderSummary is a pure string-builder with no server-only APIs, so
// it runs fine here in the browser too. This keeps the four layout
// renderers (list/numbered/grid/highlight) defined in exactly one
// place instead of duplicating them as JSX.
//
// This is additive, not a replacement: per-article, an editor's
// manual summary (if any) always renders first and stays put. The AI
// summary is a separate box a reader opts into, appended below it —
// never swaps out or hides the manual one.
//
// Gated by custom.enable_ai_summary (see isAiSummaryEnabled in
// Summary.tsx) at the call site in the route — same off-by-default
// pattern as every other optional block on this route. This
// component itself doesn't re-check the metafield; the route decides
// whether to render <AiSummaryBox> at all.

import {useFetcher} from 'react-router';
import {renderSummary, type SummaryData} from '~/components/blogs/Summary';

type AiSummaryResponse = {summary: SummaryData; cached?: boolean} | {error: string};

export function AiSummaryBox({
  articleId,
  contentHtml,
  manualSummaryHtml,
}: {
  articleId: string;
  contentHtml: string;
  manualSummaryHtml: string | null;
}) {
  const fetcher = useFetcher<AiSummaryResponse>();

  const isLoading = fetcher.state !== 'idle';
  const result = fetcher.data;
  const error = result && 'error' in result ? result.error : null;
  const summary = result && 'summary' in result ? result.summary : null;

  function handleClick() {
    fetcher.submit(
      {articleId, contentHtml},
      {
        method: 'POST',
        action: '/api/blog-summary',
        encType: 'application/json',
      },
    );
  }

  return (
    <div className="ai-summary-wrap">
      {manualSummaryHtml && (
        <div dangerouslySetInnerHTML={{__html: manualSummaryHtml}} />
      )}

      {/* Only offer the button while there's no generated summary yet
          — once one exists, the box itself is the result; re-running
          costs another (cached, but still round-tripped) request for
          no real benefit, since the output is stable per article. */}
      {!summary && (
        <button
          type="button"
          className="ai-summary-button"
          onClick={handleClick}
          disabled={isLoading}
        >
          {isLoading ? 'Summarizing…' : 'Summarize with AI'}
        </button>
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
