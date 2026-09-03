/**
 * Summary
 * -------
 * "Summary" / "Key takeaways" block for Shopify blog articles, with a
 * choice of layouts (list, numbered, grid, highlight).
 *
 * Unlike FAQ/two-column/CTA-button/quote — which render inline,
 * exactly where the editor drops the marker — a summary box is always
 * pinned to the TOP of the article, above the body, similar to how
 * TableOfContents/AuthorSection are gated by a metafield and rendered
 * directly rather than in-place. So this file does two things:
 *
 *   1. Defines the `data-summary-embed` marker syntax editors use in
 *      the Shopify blog editor's HTML/embed block to AUTHOR the box's
 *      content (title, layout, items) — same marker shape as before.
 *   2. Provides `extractSummarySection`, which finds that marker
 *      *wherever it appears* in the raw contentHtml, removes it from
 *      the body entirely, and returns its parsed data separately —
 *      so the route can render it as its own top-of-article block
 *      instead of leaving it inline.
 *
 * Visibility is controlled by the `custom.show_summary` boolean
 * metafield (see `isSummaryEnabled`) — same defaults-off pattern as
 * `isTocEnabled`/`getAuthorSectionData`. When the metafield is off,
 * the marker (if an editor left one in the body) is still stripped
 * out — never rendered inline, never left as raw unstyled markup.
 *
 * See Summary.md for the full marker syntax, metafield setup, and
 * editor-facing usage examples.
 */

export type SummaryLayout = 'list' | 'numbered' | 'grid' | 'highlight';

const VALID_LAYOUTS: SummaryLayout[] = ['list', 'numbered', 'grid', 'highlight'];

const SUMMARY_EMBED_RE = /<div[^>]*\bdata-summary-embed\b[^>]*>([\s\S]*?)<\/div>/gi;
const LI_TAG_RE = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const P_TAG_RE = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

function parseAttr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return match ? match[1] : undefined;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractItems(inner: string): string[] {
  const liItems = [...inner.matchAll(LI_TAG_RE)].map((match) => stripTags(match[1]));
  if (liItems.length > 0) return liItems.filter(Boolean);

  const pItems = [...inner.matchAll(P_TAG_RE)].map((match) => stripTags(match[1]));
  return pItems.filter(Boolean);
}

function renderList(items: string[]): string {
  const rows = items
    .map((item) => `<li class="sum-item">${escapeHtml(item)}</li>`)
    .join('');
  return `<ul class="sum-list">${rows}</ul>`;
}

function renderNumbered(items: string[]): string {
  const rows = items
    .map(
      (item, i) =>
        `<li class="sum-item sum-item--numbered">` +
        `<span class="sum-number">${i + 1}</span>` +
        `<span class="sum-item-text">${escapeHtml(item)}</span>` +
        `</li>`,
    )
    .join('');
  return `<ol class="sum-list sum-list--numbered">${rows}</ol>`;
}

function renderGrid(items: string[]): string {
  const cells = items
    .map((item) => `<li class="sum-chip">${escapeHtml(item)}</li>`)
    .join('');
  return `<ul class="sum-grid">${cells}</ul>`;
}

function renderHighlight(items: string[]): string {
  // Highlight reads best as one block of text; join multiple
  // paragraphs/items with a space rather than rendering them as a list.
  const text = items.join(' ');
  return `<p class="sum-highlight-text">${escapeHtml(text)}</p>`;
}

const RENDERERS: Record<SummaryLayout, (items: string[]) => string> = {
  list: renderList,
  numbered: renderNumbered,
  grid: renderGrid,
  highlight: renderHighlight,
};

// Parsed marker data, decoupled from rendering — extraction and
// rendering are separate steps now (unlike the old single-pass
// injectSummarySections) since the route needs the data to decide
// *whether* to render at all (isSummaryEnabled) before committing to
// producing markup.
export type SummaryData = {
  title?: string;
  layout: SummaryLayout;
  items: string[];
};

/**
 * isSummaryEnabled — reads the custom.show_summary boolean metafield
 * (aliased to `showSummary` in ARTICLE_QUERY — see Summary.md §2).
 * Defaults to false/off, same pattern as isTocEnabled: an article
 * with a perfectly valid data-summary-embed marker in its body still
 * renders nothing at the top until an editor explicitly flips this
 * on. Shopify metafields are stored as strings even for boolean type,
 * hence the === 'true' check rather than a truthy check on the
 * metafield object itself (an unset metafield and a metafield whose
 * value happens to be the string "false" both need to resolve to
 * false here).
 */
export function isSummaryEnabled(article: {
  showSummary?: {value: string} | null;
}): boolean {
  return article.showSummary?.value === 'true';
}

/**
 * extractSummarySection — finds the FIRST data-summary-embed marker
 * anywhere in contentHtml, removes it from the returned html, and
 * returns its parsed data separately. A summary box is a single
 * top-of-article element, not a repeatable inline block like FAQ/
 * quote/CTA, so a second marker (an editor accidentally pasting the
 * embed twice) is silently dropped rather than rendered twice or
 * merged — only the first one found "wins".
 *
 * A marker with no usable items (no `<li>` or `<p>` tags inside it)
 * is dropped the same way injectSummarySections used to drop it —
 * removed from the body, summary stays null.
 *
 * Always strips the marker from the returned html regardless of
 * whether it parsed to a usable summary — callers that don't want to
 * render anything (isSummaryEnabled() === false) should still call
 * this and use only the `.html` field, so a marker left in the body
 * by an editor never leaks into the page as raw unstyled HTML while
 * the feature is toggled off.
 */
export function extractSummarySection(contentHtml: string): {
  html: string;
  summary: SummaryData | null;
} {
  let summary: SummaryData | null = null;

  const html = contentHtml.replace(SUMMARY_EMBED_RE, (fullMatch, inner: string) => {
    if (summary) return ''; // already found one; drop any further marker

    const wrapperOpenTag = fullMatch.slice(0, fullMatch.indexOf('>') + 1);
    const title = parseAttr(wrapperOpenTag, 'data-summary-title');
    const layoutRaw = parseAttr(wrapperOpenTag, 'data-summary-layout');
    const layout: SummaryLayout = VALID_LAYOUTS.includes(
      layoutRaw as SummaryLayout,
    )
      ? (layoutRaw as SummaryLayout)
      : 'list';

    const items = extractItems(inner);
    if (items.length === 0) return '';

    summary = {title, layout, items};
    return '';
  });

  return {html, summary};
}

/**
 * renderSummary — turns parsed SummaryData into the final static
 * <div class="sum-root ...">...</div> markup. Split out from
 * extraction so the route can call extractSummarySection
 * unconditionally (to always strip the marker) while only calling
 * renderSummary when isSummaryEnabled(article) is true.
 */
export function renderSummary(summary: SummaryData): string {
  const heading = summary.title
    ? `<h3 class="sum-title">${escapeHtml(summary.title)}</h3>`
    : '';
  const body = RENDERERS[summary.layout](summary.items);
  return `<div class="sum-root sum-layout--${summary.layout}">${heading}${body}</div>`;
}