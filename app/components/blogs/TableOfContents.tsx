// app/components/blogs/TableOfContents.tsx
//
// Auto-generated table of contents for blog articles, built from
// whatever h2/h3 tags exist in the article body — no marker syntax,
// no metafield required for heading detection. Editors write normal
// headings in Shopify's blog HTML editor (as they already do);
// nothing extra to author for the TOC content itself.
//
// Whether the TOC renders AT ALL is a separate, explicit decision —
// see `isTocEnabled` below. It defaults OFF: an article only gets a
// TOC if an editor explicitly sets custom.show_toc = true, mirroring
// how AuthorSection.tsx gates on custom.show_author_section. This is
// intentionally decoupled from whether the article *has* headings —
// an article can have h2/h3s and still not show a TOC if the
// metafield isn't set.
//
// Two entry points, same split as FaqSection.tsx:
//
//   1. `withHeadingIds(html)` — a server-side HTML transform, run in
//      the loader. Scans contentHtml for <h2>/<h3> tags, assigns each
//      one a slugified id (skipping any that already have one), and
//      returns both the rewritten HTML and the flat heading list the
//      component needs to render its links.
//
//   2. `<TableOfContents headings={...} />` — a real component, fed
//      the heading list from the loader. Renders as plain jump links
//      even with zero JS (the ids from #1 already make in-page anchor
//      navigation work natively); the effect below layers on
//      active-section highlighting as progressive enhancement.
//
// Callers should gate rendering with `isTocEnabled(article)` BEFORE
// calling withHeadingIds/passing headings in — see the usage note
// above isTocEnabled for the exact call-site pattern. The component
// itself keeps its own `headings.length === 0` fallback as a second
// safety net, but that alone is not sufficient gating: an article
// can have headings and still need the TOC hidden by default.
//
// Unlike the shoppable-embed system in ProductGallery.tsx, this needs
// no portal/hydration-slot dance in Article's template: it doesn't
// call useNavigate(), useAside(), or any cart hook, so it can just
// render directly in the route tree with its own small useEffect for
// the scroll-spy — no context-provider requirements to route around.
//
// Desktop-sidebar / mobile-collapsible without two copies of the DOM:
// same trick as the accordion — a single native <details> wrapping the
// nav. CSS (app/assets/article-toc.css) hides the <summary> and forces
// the content open past the desktop breakpoint; below it, <details>
// behaves as an ordinary native collapsible with zero extra JS.

import {useEffect, useMemo, useRef, useState} from 'react';

export type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

// A heading plus whichever h3s fall under it in document order. Only
// one level deep — h2/h3 is all withHeadingIds scans for, so a node's
// children are always h3s, never grandchildren.
type TocNode = TocHeading & {children: TocHeading[]};

// Shape of the raw metafield data as read off the article object in
// the loader (see ARTICLE_QUERY's `showToc` field). Kept loose/
// optional the same way ArticleWithAuthorMetafields is in
// AuthorSection.tsx — metafields are optional by nature, so this can
// be null/undefined if unset in the admin.
export type ArticleWithTocMetafield = {
  showToc?: {value?: string | null} | null;
};

/**
 * Resolves whether the table of contents should render for this
 * article. Defaults to OFF: only an explicit "true" on the
 * custom.show_toc metafield enables it. An unset metafield (null,
 * the default for every article until an editor opts in) safely
 * resolves to false — matching the same off-by-default pattern
 * getAuthorSectionData uses for custom.show_author_section.
 *
 * Usage at the call site (loader or template):
 *
 *   const tocEnabled = isTocEnabled(article);
 *   const {html, headings} = tocEnabled
 *     ? withHeadingIds(article.contentHtml)
 *     : {html: article.contentHtml, headings: []};
 *
 *   // ...later in JSX...
 *   {tocEnabled && <TableOfContents headings={headings} />}
 */
export function isTocEnabled(article: ArticleWithTocMetafield): boolean {
  return article.showToc?.value === 'true';
}

// Groups the flat heading list into a tree: each h3 nests under
// whichever h2 preceded it in the article body. This mirrors the
// hierarchy the Shopify blog editor's HTML already implies (an h3
// "belongs" to the h2 above it) — nothing new to author, no marker
// needed, same "auto from the HTML" spirit as withHeadingIds itself.
// An h3 with no preceding h2 (unusual, but not invalid HTML) becomes
// its own top-level entry rather than being dropped.
function groupIntoTree(headings: TocHeading[]): TocNode[] {
  const tree: TocNode[] = [];
  let current: TocNode | null = null;

  for (const h of headings) {
    if (h.level === 2) {
      current = {...h, children: []};
      tree.push(current);
    } else if (current) {
      current.children.push(h);
    } else {
      tree.push({...h, children: []});
    }
  }

  return tree;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// CSS identifiers (and therefore unescaped "#id" selectors) can't
// start with a digit. slugify() alone would happily turn a heading
// like "2. Understand motor types" into the id "2-understand-motor-
// types" — a perfectly valid HTML id, but one that breaks the moment
// anything does document.querySelector('#' + id) instead of
// getElementById. Rather than relying on every future call site to
// remember that rule, make the ids safe by construction: prefix with
// a letter whenever the slug would otherwise start with a digit.
function toSafeId(base: string): string {
  return /^\d/.test(base) ? `s-${base}` : base;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

const HEADING_REGEX = /<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/g;
const ID_ATTR_REGEX = /\bid=["']([^"']+)["']/;

// Editor-facing escape hatches, authored directly in Shopify's blog
// HTML source view — same spirit as the data-shoppable-product /
// data-faq markers elsewhere in this pipeline, just attributes on an
// existing tag rather than a standalone marker div, since the tag
// (the heading itself) already exists in the author's content.
//
//   data-toc-skip           — omit this heading from the TOC entirely.
//                              The heading itself is left completely
//                              untouched: no id added, not rewritten.
//                              For headings that exist for visual/SEO
//                              structure but shouldn't clutter the
//                              sidebar (e.g. a lone "Frequently Asked
//                              Questions" heading right before an FAQ
//                              accordion that already makes its own
//                              section obvious).
//   data-toc-label="..."    — override the TOC link text without
//                              changing the heading itself. The id/
//                              slug is still derived from the real
//                              heading text, so anchors stay stable
//                              even if the label is edited later. For
//                              long, descriptive headings that read
//                              fine in the body but are too wide for a
//                              sidebar link.
const SKIP_ATTR_REGEX = /\bdata-toc-skip\b/;
const LABEL_ATTR_REGEX = /\bdata-toc-label=["']([^"']+)["']/;

/**
 * Scans article HTML for h2/h3 tags, assigns a slugified id to any
 * that don't already have one (deduped against collisions with a
 * `-2`, `-3`, ... suffix), and returns the rewritten HTML alongside
 * the flat list of headings for <TableOfContents> to render. Honors
 * data-toc-skip / data-toc-label if the editor added them — see
 * comment above.
 *
 * Callers should only invoke this when isTocEnabled(article) is true
 * — see the usage note on isTocEnabled. Calling it unconditionally is
 * harmless (it's a pure string transform) but wasteful, since its
 * output is discarded whenever the TOC is gated off.
 */
export function withHeadingIds(html: string): {
  html: string;
  headings: TocHeading[];
} {
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();

  const rewritten = html.replace(
    HEADING_REGEX,
    (full, levelStr: string, attrs: string, inner: string) => {
      const level = Number(levelStr) as 2 | 3;
      const rawText = stripTags(inner);

      // Skip headings that resolve to no visible text (rare, but a
      // heading built entirely from an embed/image would slugify to
      // an empty string) rather than emitting an empty TOC entry.
      if (!rawText) return full;

      // Editor opted this heading out of the TOC — leave it exactly
      // as authored, don't list it, don't touch its id (if it already
      // has one, e.g. for a manual deep link elsewhere, that stays).
      if (SKIP_ATTR_REGEX.test(attrs)) return full;

      const existingId = attrs.match(ID_ATTR_REGEX)?.[1];
      let id = existingId;

      if (!id) {
        const base = slugify(rawText) || `section-${headings.length + 1}`;
        const safeBase = toSafeId(base);
        const count = seen.get(safeBase) ?? 0;
        seen.set(safeBase, count + 1);
        id = count === 0 ? safeBase : `${safeBase}-${count + 1}`;
      }

      const labelOverride = attrs.match(LABEL_ATTR_REGEX)?.[1];
      const text = labelOverride ? stripTags(labelOverride) : rawText;

      headings.push({id, text, level});

      if (existingId) return full;

      return `<h${levelStr}${attrs} id="${id}">${inner}</h${levelStr}>`;
    },
  );

  return {html: rewritten, headings};
}

export function TableOfContents({headings}: {headings: TocHeading[]}) {
  const tree = useMemo(() => groupIntoTree(headings), [headings]);

  const [activeId, setActiveId] = useState<string | null>(
    headings[0]?.id ?? null,
  );
  // Tracks which heading elements are currently intersecting the
  // "reading zone" defined by rootMargin below, keyed by id — updated
  // in place by the observer callback rather than rebuilt each time.
  const intersecting = useRef<Map<string, boolean>>(new Map());

  // Which top-level (h2) sections are currently expanded to show their
  // h3 children. Purely manual — the button in each row is the only
  // thing that opens or closes a section; scrolling never expands one
  // on its own, so the sidebar's expanded state always matches exactly
  // what the reader chose to open.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersecting.current.set(entry.target.id, entry.isIntersecting);
        }

        // Walk headings in document order and keep the last one still
        // marked intersecting — with the top-biased rootMargin below,
        // that's the section whose start has scrolled past the top
        // zone but hasn't been fully passed yet, i.e. "what you're
        // currently reading."
        let current: string | null = null;
        for (const h of headings) {
          if (intersecting.current.get(h.id)) current = h.id;
        }
        if (current) setActiveId(current);
      },
      {
        // Biases the "active" zone toward the top of the viewport
        // (accounting for a sticky header) rather than the whole
        // screen, so highlighting doesn't jump to a heading that's
        // only barely visible at the very bottom.
        rootMargin: '-96px 0px -70% 0px',
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <details className="article-toc" open>
      <summary>On this page</summary>
      <nav aria-label="Table of contents">
        <ul>
          {tree.map((node) => {
            const hasChildren = node.children.length > 0;
            const isExpanded = expandedIds.has(node.id);
            const isActive = activeId === node.id;
            const hasActiveChild = node.children.some(
              (c) => c.id === activeId,
            );

            return (
              <li
                key={node.id}
                className={[
                  'article-toc__item',
                  isActive ? 'article-toc__item--active' : null,
                  hasActiveChild ? 'article-toc__item--active-child' : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="article-toc__row">
                  <a href={`#${node.id}`}>{node.text}</a>

                  {hasChildren && (
                    <button
                      type="button"
                      className={[
                        'article-toc__toggle',
                        isExpanded ? 'article-toc__toggle--expanded' : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} "${node.text}" subsections`}
                      onClick={() => toggle(node.id)}
                    >
                      <span className="article-toc__chevron" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {hasChildren && isExpanded && (
                  <ul className="article-toc__sublist">
                    {node.children.map((child) => (
                      <li
                        key={child.id}
                        className={[
                          'article-toc__item',
                          'article-toc__item--h3',
                          activeId === child.id
                            ? 'article-toc__item--active'
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <a href={`#${child.id}`}>{child.text}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </details>
  );
}