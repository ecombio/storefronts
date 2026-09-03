# Table of Contents — `TableOfContents.tsx`

An auto-generated, scroll-spy-highlighted table of contents for blog
articles, built from whatever `<h2>`/`<h3>` tags already exist in the
article body — no marker syntax, no extra authoring required for the TOC
content itself.

Files:
- `app/components/blogs/TableOfContents.tsx` — `withHeadingIds()` (loader-
  side transform), `isTocEnabled()` (gating), and `<TableOfContents>` (the
  component).
- `app/assets/article-toc.css` — loaded **globally** in `root.tsx` (not
  route-scoped like most blog-block CSS — see `article-toc.css` in the
  global `<link>` list).

## Architecture: rendered directly, no portal needed

Unlike the shoppable-embed system, this needs no slot/hydration dance in the
article template: it never calls `useNavigate()`, `useAside()`, or any cart
hook, so it can render directly in the route tree with its own small
`useEffect` for the scroll-spy — no context-provider requirements to route
around, no `createPortal`.

## Two entry points

1. **`withHeadingIds(html)`** — a server-side transform, run in the loader.
   Scans `contentHtml` for `<h2>`/`<h3>` tags, assigns each a slugified
   `id` (skipping any that already have one), and returns both the
   rewritten HTML and the flat heading list the component needs.
2. **`<TableOfContents headings={...} />`** — fed the heading list from the
   loader. Renders as plain jump links that work even with zero JS (the ids
   from step 1 already make in-page anchor navigation work natively); the
   scroll-spy active-section highlighting is a progressive enhancement
   layered on top via `useEffect`.

## Gating — off by default, decoupled from heading presence

`isTocEnabled(article)` gates whether the TOC renders **at all**, separate
from whether the article *has* headings:

```ts
export function isTocEnabled(article: ArticleWithTocMetafield): boolean {
  return article.showToc?.value === 'true';
}
```

Defaults **off** — mirrors `AuthorSection`'s off-by-default gating. An
article can have h2/h3 headings and still show no TOC if
`custom.show_toc` isn't explicitly set to `"true"`. Callers should gate
*before* calling `withHeadingIds` — calling it unconditionally is harmless
(pure string transform) but wasteful, since its output is discarded when the
TOC is disabled:

```ts
const tocEnabled = isTocEnabled(article);
const {html, headings} = tocEnabled
  ? withHeadingIds(article.contentHtml)
  : {html: article.contentHtml, headings: []};
```

The component itself also no-ops on an empty `headings` array as a second
safety net, but that alone isn't sufficient gating — see above.

## Wiring into the route

**1. Extend `ARTICLE_QUERY`** with the metafield:

```graphql
showToc: metafield(namespace: "custom", key: "show_toc") {
  value
}
```

**2. Import:**

```tsx
import {withHeadingIds, TableOfContents, isTocEnabled} from '~/components/blogs/TableOfContents';
```

**3. In `loadCriticalData`**, run this **last** among the content
transforms — after every other injector (shoppable, two-col, recipe header,
summary, FAQ, quote, newsletter, video, gallery, button) — since it scans
`contentHtml` for headings and needs to see the truly final HTML, not an
intermediate state:

```tsx
const tocEnabled = isTocEnabled(article);
const {html: finalHtml, headings: tocHeadings} = tocEnabled
  ? withHeadingIds(contentHtml)
  : {html: contentHtml, headings: []};
```

Add `tocEnabled` and `tocHeadings` to the loader's return object; use
`finalHtml` as the article's rendered `contentHtml` from this point on.

**4. Render** inside the body/TOC grid, alongside the article body:

```tsx
<div className={articleLayoutClassName /* collapses to 1-col via --no-toc when disabled */}>
  <div ref={bodyRef} dangerouslySetInnerHTML={{__html: contentHtml}} className="article-body" />
  {tocEnabled && <TableOfContents headings={tocHeadings} />}
</div>
```

No new scanning-effect entry needed — the article template's existing
`bodyRef` slot scan doesn't need to know about the TOC at all, since
`<TableOfContents>` is rendered as a sibling, not portaled into the body.

## Editor-facing escape hatches

Authored as extra attributes directly on an existing `<h2>`/`<h3>` tag (not
a standalone marker div, since the tag already exists in the author's
content):

| Attribute | Effect |
|---|---|
| `data-toc-skip` | Omits this heading from the TOC entirely. The heading itself is left completely untouched — no id added, not rewritten. For headings that exist for visual/SEO structure but shouldn't clutter the sidebar (e.g. a lone "Frequently Asked Questions" heading right before an FAQ accordion that already makes its own section obvious). |
| `data-toc-label="..."` | Overrides the TOC link text without changing the heading itself. The id/slug is still derived from the real heading text, so anchors stay stable even if the label is edited later. For long, descriptive headings that read fine in the body but are too wide for a sidebar link. |

```html
<h2 data-toc-skip>Frequently Asked Questions</h2>

<h2 data-toc-label="Motors">Understanding hub-drive vs. mid-drive motors</h2>
```

## Heading tree structure

Headings are grouped into a two-level tree at render time
(`groupIntoTree`): each `<h3>` nests under whichever `<h2>` preceded it in
document order — mirroring the hierarchy the article's own HTML already
implies, no separate authoring needed. An `<h3>` with no preceding `<h2>`
(unusual, but not invalid HTML) becomes its own top-level entry rather than
being silently dropped.

## The digit-leading-id bug this works around

`slugify()` alone would happily turn a heading like `"2. Understand motor
types"` into the id `2-understand-motor-types` — a perfectly valid HTML
`id`, but CSS identifiers (and therefore unescaped `#id` selectors) can't
start with a digit. `document.querySelector('#' + id)` throws a
`SyntaxError` on an id like that.

`toSafeId()` fixes this at the source: any slug that would start with a
digit gets prefixed with `s-` (e.g. `2-understand-...` →
`s-2-understand-...`), making the id safe by construction rather than
relying on every future call site to remember the rule. (The article
template's separate hash-deep-link effect sidesteps the same class of bug a
different way — by using `getElementById` instead of `querySelector`.)

## Desktop sidebar / mobile collapsible — one DOM, no duplication

Rather than rendering two copies of the nav for desktop vs. mobile, the
whole component is wrapped in a single native `<details open>`:

```html
<details class="article-toc" open>
  <summary>On this page</summary>
  <nav aria-label="Table of contents">...</nav>
</details>
```

`article-toc.css` hides the `<summary>` and forces the content open past the
desktop breakpoint; below that breakpoint, `<details>` behaves as an
ordinary native collapsible with zero extra JS.

## Scroll-spy behavior

An `IntersectionObserver` tracks which heading elements are currently
intersecting a "reading zone" defined by:

```ts
{rootMargin: '-96px 0px -70% 0px', threshold: 0}
```

This biases the active zone toward the top of the viewport (accounting for
a sticky header) rather than the whole screen — walks headings in document
order and keeps the *last* one still marked intersecting, which (with this
top-biased margin) is "the section whose start has scrolled past the top
zone but hasn't been fully passed yet" — i.e., what the reader is currently
reading, not whatever's merely visible at the very bottom of the viewport.

Sub-section (`<h3>`) expansion is **entirely manual** — a toggle button on
each `<h2>` row with children, tracked in a `Set<string>` of expanded ids.
Scrolling never auto-expands a section on its own; the sidebar's expanded
state always matches exactly what the reader chose to open by clicking.

## Props (`<TableOfContents>`)

| Prop | Type | Notes |
|---|---|---|
| `headings` | `TocHeading[]` | Required. Flat list; grouped into a tree internally via `useMemo`. |

### `TocHeading`

```ts
type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};
```

## Notes / limits

- A heading that resolves to no visible text (e.g. built entirely from an
  embedded image with no text content) is skipped — no empty TOC entry
  rendered for it.
- If `IntersectionObserver` isn't available in the runtime, the scroll-spy
  effect simply doesn't run — the TOC still renders as functional jump
  links, just without active-section highlighting.
- Duplicate heading text produces deduped ids via a numeric suffix (`-2`,
  `-3`, ...), not a collision.

## Testing

- `show_toc` unset or `false` → no TOC renders, regardless of heading count
- `show_toc = true`, article has h2/h3 headings → TOC renders, ids assigned
- `show_toc = true`, article has zero headings → TOC component no-ops
  (second safety net)
- Heading starting with a digit (e.g. "2. ...") → id gets `s-` prefix, no
  `querySelector` crash
- `data-toc-skip` on a heading → heading renders normally in the body, does
  NOT appear in the TOC, id is not added
- `data-toc-label` on a heading → TOC shows the override text; anchor still
  points to the real heading's (derived-from-real-text) id
- Two headings with identical text → second gets a `-2` suffix, no id
  collision
- Scrolling through the article → active heading highlight updates and
  matches the section actually in the "reading zone," not just whatever's
  onscreen
- Clicking an `<h2>`'s expand toggle → its `<h3>` children show/hide;
  scrolling past that section does not auto-expand or auto-collapse it
