# Two-Column Content (`data-two-col`)

Lays out rich text into two side-by-side columns on a blog article.
Authored directly in Shopify's blog HTML source view — same
editor-facing convention as the shoppable-embed
(`data-shoppable-product`), FAQ (`data-faq`), and newsletter-form
(`data-newsletter-form`) markers.

Unlike those, this marker is **purely static**: the columns are just
rich text/HTML the editor already wrote, so there's no data to fetch
and nothing to hydrate. The loader normalizes the marker into final
grid markup once, server-side (`injectTwoColumnContent`,
`TwoColumnContent.tsx`), and the result is inert HTML from then on —
no React component, no client-side scan/portal step, no slot.

---

## Basic syntax

```html
<div data-two-col>
  <div>First column — any rich text/HTML.</div>
  <div>Second column — any rich text/HTML.</div>
</div>
```

Renders as a two-column CSS grid (see `TwoColumnContent.css`),
collapsing to a single stacked column below 700px viewport width.

## Ratio override

Equal-width columns are the default. To weight one column over the
other, add `data-two-col-ratio` to the wrapper:

```html
<div data-two-col data-two-col-ratio="2-1">
  <div>Wider column — twice the width of the second.</div>
  <div>Narrower column.</div>
</div>
```

| Value   | Effect                          |
|---------|----------------------------------|
| `1-1`   | Equal columns (default, same as omitting the attribute) |
| `2-1`   | First column is 2× the width of the second |
| `1-2`   | Second column is 2× the width of the first |

Any other value (typo, unsupported ratio) is silently ignored and
falls back to equal columns — it does **not** make the block
malformed. Only the two-child-div structure below affects that.

## What can go inside a column

Anything. Each column is scanned by raw `<div>`/`</div>` depth, not by
pattern-matching specific tags or attributes, so nested markup of any
kind doesn't confuse where a column or the wrapper ends. Columns can
hold, in any combination:

- Plain rich text — paragraphs, headings, lists
- Images
- Another editor marker — e.g. a shoppable-embed, CTA button, quote,
  or recipe header
- A mix of the above within a single column

**Order note:** the loader resolves shoppable-embed, CTA button,
quote, and recipe-header markers *before* `data-two-col`, so by the
time this pass runs, any of those nested inside a column have already
been turned into their final markup. Nesting doesn't break the
column-boundary scan either way (it's content-agnostic), but this is
why the transform order in the route loader matters for those other
marker types, not for this one.

### Example: image + text

```html
<div data-two-col>
  <div>
    <img src="https://cdn.shopify.com/.../example.jpg" alt="Descriptive alt text">
  </div>
  <div>
    <h3>About this image</h3>
    <p>Explanatory copy goes here.</p>
  </div>
</div>
```

### Example: nested marker inside a column

```html
<div data-two-col data-two-col-ratio="1-1">
  <div>
    <h3>Why we love this</h3>
    <p>Editorial copy explaining the product in more depth.</p>
  </div>
  <div>
    <div data-shoppable-product data-product-ids="1234567890"></div>
  </div>
</div>
```

---

## Malformed input

The wrapper must contain **exactly two direct-child `<div>` elements**
and nothing else (whitespace between/around them is fine; anything
else isn't). If that structure isn't met — one child, three or more
children, stray text or comments alongside the children, or an
unclosed marker — the entire block is left **completely untouched** in
the published HTML.

This is deliberate: it's better to render an editor's mistake as
plain, ugly-but-visible HTML (with the literal `data-two-col`
attribute and unstyled `<div>`s showing) than to silently drop content
or half-transform it into broken markup. Same fail-safe reasoning used
elsewhere in this pipeline (e.g. the shoppable-embed scan skipping
slots with a missing kind or empty product-ids list).

If a two-column block isn't rendering correctly on the live article,
check for:

- More or fewer than two direct-child `<div>`s inside the marker
- Text, whitespace-only exceptions aside, or comments sitting between
  the two column divs or between a column div and the closing tag of
  the marker
- An unclosed `<div>` somewhere inside a column that throws off the
  depth count
- A missing closing `</div>` on the marker itself

---

## Files

| File | Purpose |
|---|---|
| `app/components/blogs/TwoColumnContent.tsx` | Marker-to-markup transform (`injectTwoColumnContent`), run once in the article route loader |
| `app/components/blogs/TwoColumnContent.css` | Grid layout styles, linked route-scoped in `blogs.$blogHandle.$articleHandle.tsx` via `links()` |

Loaded alongside `article.css`, not merged into it — same convention
as `article-toc.css`, `article-author.css`, `newsletter-form.css`, and
every other feature stylesheet on the article route.