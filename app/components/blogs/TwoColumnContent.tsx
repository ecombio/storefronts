// app/components/blogs/TwoColumnContent.tsx
//
// Two-column rich text layout for blog articles, added via a
// `data-two-col` marker written directly in Shopify's blog HTML
// source view — same editor-facing convention as the shoppable-embed
// (data-shoppable-product), FAQ (data-faq), and newsletter-form
// (data-newsletter-form) markers, but unlike those, this one is
// PURELY STATIC: the columns are just rich text/HTML the editor
// already wrote, so there's no data to fetch and nothing to
// hydrate. No React component, no client-side scan/portal, no
// useEffect in the article template — injectTwoColumnContent() runs
// once in the loader and the resulting markup is inert HTML from
// then on.
//
// MIX FORMATS: each column can hold ANY HTML — paragraphs, headings,
// images, lists, or even another marker (e.g. a shoppable-embed).
// The scanner below counts raw <div>/</div> depth rather than
// pattern-matching specific attributes, so nested markup of any kind
// doesn't confuse where a column or the wrapper ends. See
// two-column-content.md for worked examples of every format
// combination.
//
// Editor-facing marker syntax:
//
//   <div data-two-col>
//     <div>First column — any rich text/HTML.</div>
//     <div>Second column — any rich text/HTML.</div>
//   </div>
//
// Optional ratio override (defaults to equal columns):
//
//   <div data-two-col data-two-col-ratio="2-1">
//     ...
//   </div>
//
//   Supported ratios: "1-1" (default), "2-1", "1-2".
//
// Malformed input (anything other than exactly two direct child
// <div> elements inside the marker) is left completely untouched —
// same fail-safe reasoning as the shoppable-slot scan skipping slots
// with a missing kind or empty product-ids list: better to render an
// editor's mistake as plain, ugly-but-visible HTML than to silently
// eat their content or half-transform it into broken markup.

const RATIO_CLASS: Record<string, string> = {
  '1-1': 'two-col-content--1-1',
  '2-1': 'two-col-content--2-1',
  '1-2': 'two-col-content--1-2',
};

const MARKER_OPEN_REGEX = /<div\b[^>]*\bdata-two-col\b[^>]*>/gi;
const RATIO_ATTR_REGEX = /\bdata-two-col-ratio=["']([^"']*)["']/i;

/**
 * Given the index just past an already-consumed `<div ...>` opening
 * tag, walks forward counting nested `<div` opens and `</div>`
 * closes to find the index of that div's matching `</div>`. Content-
 * agnostic — nested divs, images, or other embed markers inside
 * don't confuse the boundary. Returns null if the tags never balance
 * (truncated/malformed HTML).
 */
function findMatchingDivClose(html: string, openTagEnd: number): number | null {
  const tagRegex = /<div\b[^>]*>|<\/div>/gi;
  tagRegex.lastIndex = openTagEnd;

  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html))) {
    if (match[0].toLowerCase() === '</div>') {
      depth -= 1;
      if (depth === 0) return match.index;
    } else {
      depth += 1;
    }
  }

  return null;
}

/**
 * Given the inner HTML of a `data-two-col` block, returns the raw
 * inner HTML of its first two direct child <div> elements — or null
 * if there aren't exactly two direct-child divs (anything else
 * between/around them besides whitespace, only one child, or a third
 * child all count as malformed).
 */
function extractTwoColumns(innerHtml: string): [string, string] | null {
  const childOpenRegex = /<div\b[^>]*>/gi;
  const columns: string[] = [];
  let cursor = 0;

  while (columns.length < 3) {
    childOpenRegex.lastIndex = cursor;
    const openMatch = childOpenRegex.exec(innerHtml);

    // Anything but whitespace between the last column and the next
    // (or the end of the block) means this isn't a clean two-child
    // wrapper.
    const between = innerHtml.slice(cursor, openMatch?.index ?? innerHtml.length);
    if (between.trim().length > 0) return null;

    if (!openMatch) break;

    const closeIndex = findMatchingDivClose(innerHtml, childOpenRegex.lastIndex);
    if (closeIndex === null) return null;

    columns.push(innerHtml.slice(childOpenRegex.lastIndex, closeIndex));
    cursor = closeIndex + '</div>'.length;
  }

  if (columns.length !== 2) return null;
  return [columns[0], columns[1]];
}

/**
 * Scans article HTML for `data-two-col` markers and rewrites each
 * into normalized `.two-col-content` markup with exactly two
 * `.two-col-content__col` children, ready for the CSS grid layout in
 * two-column-content.css. Pure string transform, run once in the
 * loader — same shape as injectFaqSections/injectNewsletterForm.
 */
export function injectTwoColumnContent(html: string): string {
  let result = '';
  let cursor = 0;
  MARKER_OPEN_REGEX.lastIndex = 0;

  let openMatch: RegExpExecArray | null;
  while ((openMatch = MARKER_OPEN_REGEX.exec(html))) {
    const openStart = openMatch.index;
    const openEnd = openStart + openMatch[0].length;

    result += html.slice(cursor, openStart);

    const closeIndex = findMatchingDivClose(html, openEnd);

    if (closeIndex === null) {
      // Unclosed marker — pass the remainder through untouched
      // rather than guessing at a boundary.
      result += html.slice(openStart);
      cursor = html.length;
      break;
    }

    const innerHtml = html.slice(openEnd, closeIndex);
    const columns = extractTwoColumns(innerHtml);

    if (!columns) {
      // Malformed — pass the original marker and its contents
      // through unchanged (see file header for why).
      result += html.slice(openStart, closeIndex + '</div>'.length);
    } else {
      const ratioAttr = openMatch[0].match(RATIO_ATTR_REGEX)?.[1];
      const ratioClass = (ratioAttr && RATIO_CLASS[ratioAttr]) || null;
      const wrapperClass = ['two-col-content', ratioClass]
        .filter(Boolean)
        .join(' ');

      result +=
        `<div class="${wrapperClass}">` +
        `<div class="two-col-content__col">${columns[0]}</div>` +
        `<div class="two-col-content__col">${columns[1]}</div>` +
        `</div>`;
    }

    cursor = closeIndex + '</div>'.length;
    MARKER_OPEN_REGEX.lastIndex = cursor;
  }

  result += html.slice(cursor);
  return result;
}