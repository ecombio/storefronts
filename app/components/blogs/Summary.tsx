/**
 * Summary
 * -------
 * "Summary" / "Key takeaways" block for Shopify blog articles, with a
 * choice of layouts (list, numbered, grid, highlight).
 *
 * This is fully static — same family as `injectFaqSections` /
 * `injectTwoColumnContent`, not the marker → slot → portal pattern
 * used by ProductGallery/NewsletterForm/video/ImagesGallery. A
 * summary box is just styled text: nothing in it needs client state,
 * an event handler, or a fetcher, so there's no reason to hydrate it
 * into a React component at all. `injectSummarySections` runs once in
 * the loader and the resulting HTML is the final markup — no
 * DOM-scanning effect or `createPortal` needed for this one.
 *
 * Marker syntax (inserted via the article's HTML/embed editor):
 *
 *   <div data-summary-embed data-summary-title="Key takeaways" data-summary-layout="grid">
 *     <ul>
 *       <li>Point one</li>
 *       <li>Point two</li>
 *       <li>Point three</li>
 *     </ul>
 *   </div>
 *
 * `data-summary-title` is optional. `data-summary-layout` is one of
 * `list` (default) | `numbered` | `grid` | `highlight`. Items come
 * from `<li>` tags if present, or `<p>` tags otherwise (useful for
 * `highlight`, which reads best as one or two sentences rather than a
 * bulleted list).
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

/**
 * injectSummarySections — finds every `data-summary-embed` marker in
 * the article body and replaces it with the rendered summary box.
 * Pure string transform, no data fetch needed — same reasoning as
 * injectFaqSections/injectTwoColumnContent, so it can run alongside
 * them in the loader.
 *
 * A marker with no usable items (no `<li>` or `<p>` tags inside it) is
 * dropped entirely rather than rendered as an empty box.
 */
export function injectSummarySections(contentHtml: string): string {
  return contentHtml.replace(SUMMARY_EMBED_RE, (fullMatch, inner: string) => {
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

    const heading = title ? `<h3 class="sum-title">${escapeHtml(title)}</h3>` : '';
    const body = RENDERERS[layout](items);

    return `<div class="sum-root sum-layout--${layout}">${heading}${body}</div>`;
  });
}