/**
 * Summary
 * -------
 * "Summary" / "Key takeaways" block for Shopify blog articles, with a
 * choice of layouts (list, numbered, grid, highlight).
 *
 * Unlike FAQ/two-column/CTA-button/quote — which render inline,
 * exactly where the editor drops the marker — a summary box is always
 * pinned to the TOP of the article, above the body. So this file does
 * two things:
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
 * No metafield gate: the marker is hand-authored (never
 * auto-generated), so its presence in the article body is itself the
 * editor's signal to render it. Whenever a valid data-summary-embed
 * marker is found, `renderSummary` produces the box; if the article
 * has no marker (or the marker has no usable items), nothing renders.
 * The marker is still always stripped out of the body during
 * extraction either way — never left inline, never left as raw
 * unstyled markup.
 *
 * SEO: the rendered box is wrapped in a <section aria-label="Key
 * takeaways"> rather than a bare <div>, and is accompanied by an
 * ItemList JSON-LD block — see renderSummary below. ItemList (not
 * FAQPage) is the correct schema.org type here since these are plain
 * takeaway bullets, not question/answer pairs. This gives search
 * engines and AI-answer engines (Google AI Overviews, etc.) an
 * explicit, structured signal for the article's key points, in
 * addition to the human-readable box.
 *
 * See Summary.md for the full marker syntax and editor-facing usage
 * examples.
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

// Escapes a string for safe embedding inside a <script type=
// "application/ld+json"> block. JSON.stringify already escapes
// quotes/backslashes/control characters correctly for JSON, but a
// literal "</script>" sequence inside a string value would still
// prematurely close the script tag in HTML — replacing "<" with its
// unicode escape sequence neutralizes that without touching the JSON
// validity of the output.
function escapeForJsonLd(value: string): string {
  return value.replace(/</g, '\\u003c');
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
// rendering are separate steps since the route needs the data to
// decide *whether* anything was found (summary !== null) before
// committing to producing markup.
export type SummaryData = {
  title?: string;
  layout: SummaryLayout;
  items: string[];
};

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
 * Always strips the marker from the returned html, whether or not it
 * parsed to a usable summary — callers should always use the `.html`
 * field regardless of what `.summary` comes back as, so a marker
 * with no usable items never leaks into the page as raw unstyled
 * HTML.
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
 * renderJsonLd — builds an ItemList JSON-LD <script> block from the
 * summary's items. ItemList (not FAQPage) is the correct schema.org
 * type for a plain set of takeaway bullets rather than question/
 * answer pairs. `position` is 1-indexed per the ItemList spec. This
 * is emitted purely for search engines/AI answer engines to pick up
 * — it has no visual presence, so it's safe to include regardless of
 * which visual layout (list/numbered/grid/highlight) is rendered.
 */
function renderJsonLd(summary: SummaryData): string {
  const itemListElement = summary.items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(summary.title ? {name: summary.title} : {}),
    itemListElement,
  };

  return `<script type="application/ld+json">${escapeForJsonLd(
    JSON.stringify(jsonLd),
  )}</script>`;
}

/**
 * renderSummary — turns parsed SummaryData into the final static
 * markup: a <section aria-label="Key takeaways"> (semantic, not a
 * bare <div>, for accessibility and crawler clarity) wrapping the
 * chosen layout's markup, plus an adjacent ItemList JSON-LD <script>
 * block for search/AI-answer engines (see renderJsonLd above). Split
 * out from extraction so the route can call extractSummarySection
 * unconditionally (to always strip the marker) while only calling
 * renderSummary when a summary was actually found (summary !== null).
 */
export function renderSummary(summary: SummaryData): string {
  const heading = summary.title
    ? `<h3 class="sum-title">${escapeHtml(summary.title)}</h3>`
    : '';
  const body = RENDERERS[summary.layout](summary.items);
  const jsonLd = renderJsonLd(summary);

  return (
    `<section class="sum-root sum-layout--${summary.layout}" aria-label="Key takeaways">` +
    `${heading}${body}` +
    `</section>` +
    jsonLd
  );
}