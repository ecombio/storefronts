# Summary block ("Key takeaways")

A callout box summarizing an article's key points, shown once at the
top of a blog post, below the hero image. Supports four layouts:
plain bulleted list, numbered list, a grid of short chips, or a single
highlighted sentence/paragraph.

Unlike FAQ, quote, and CTA-button embeds, the summary box is NOT
rendered where you place the marker in the article body — it's always
pulled out and shown at the top of the page, above the article text.
Where you paste the embed block in the Shopify editor doesn't matter;
top of the post, bottom, middle — it always renders in the same place.

## 1. Turning it on

The summary box is off by default, even if an article has a marker in
its body. To show it:

1. Open the article in the Shopify admin.
2. Under **Metafields**, find **Show summary** (`custom.show_summary`,
   boolean).
3. Set it to **true**.
4. Make sure the article body also contains a summary embed block
   (see below) — the metafield alone has nothing to show.

If the metafield is off, any summary marker in the body is silently
removed before the page renders (no raw bullet list leaking into the
article) — nothing shows up, at the top or anywhere else.

## 2. Setup required (developers)

`ARTICLE_QUERY` needs a metafield field added and aliased as
`showSummary`, matching the pattern used for other feature toggles on
this route (e.g. `show_toc`, `show_author_section`):

```graphql
showSummary: metafield(namespace: "custom", key: "show_summary") {
  value
}
```

`isSummaryEnabled()` in `Summary.tsx` reads `article.showSummary?.value`
and expects the string `"true"` (Shopify stores boolean metafields as
strings) — an unset metafield, or one explicitly set to `"false"`, both
resolve to disabled.

## 3. Authoring the content

In the article's HTML/embed editor (the same place you'd add a quote
or FAQ block), add:

```html
<div data-summary-embed data-summary-title="Key takeaways" data-summary-layout="list">
  <ul>
    <li>Point one</li>
    <li>Point two</li>
    <li>Point three</li>
  </ul>
</div>
```

- `data-summary-title` — optional. Omit it and the box renders with no
  heading, just the items.
- `data-summary-layout` — optional, one of `list` (default), `numbered`,
  `grid`, `highlight`.
- Items come from `<li>` tags if present; if there are none, `<p>`
  tags are used instead — useful for `highlight`, which reads best as
  one or two sentences rather than a bulleted list.

Only **one** summary embed per article is used. If you paste it twice
by accident, only the first one (in document order) is kept — the
second is dropped, not rendered as a second box.

An embed with no usable `<li>` or `<p>` content inside it is dropped
entirely, the same as if you hadn't added it.

## 4. Layout reference

**`list` (default)** — a plain bulleted list. Best for 3–6 short
points.

```html
<div data-summary-embed data-summary-title="Key takeaways">
  <ul>
    <li>Why this matters for beginners</li>
    <li>The one tool you actually need</li>
    <li>A common mistake to avoid</li>
  </ul>
</div>
```

**`numbered`** — a numbered list with circular badges. Best when order
matters (steps, ranked points).

```html
<div data-summary-embed data-summary-title="At a glance" data-summary-layout="numbered">
  <ul>
    <li>Preheat the oven first</li>
    <li>Don't skip the resting step</li>
    <li>Store leftovers within two hours</li>
  </ul>
</div>
```

**`grid`** — short chips in a responsive grid. Best for terse
keyword-style takeaways (3–8 short phrases), not full sentences —
long text in a chip will look cramped.

```html
<div data-summary-embed data-summary-layout="grid">
  <ul>
    <li>Budget-friendly</li>
    <li>Beginner safe</li>
    <li>15-minute setup</li>
    <li>No special tools</li>
  </ul>
</div>
```

**`highlight`** — a single emphasized sentence or short paragraph, not
a list. Use `<p>` tags (any `<li>` tags present would only be ignored
in favor of them if there are no `<li>`s — don't mix the two).

```html
<div data-summary-embed data-summary-layout="highlight">
  <p>If you only take one thing from this guide: always test on a
  scrap piece before cutting your final material.</p>
</div>
```

## 5. What NOT to do

- Don't nest a summary embed inside a two-column block, FAQ, or
  another embed — it's pulled out of the body regardless of nesting,
  so nesting it just makes the source HTML harder to read for no
  visual benefit.
- Don't add more than one summary embed per article — only the first
  is used.
- Don't rely on it appearing "inline" near related text — it always
  renders at the very top of the article, under the hero image,
  regardless of where you paste the marker.
- Don't put more than roughly 6 items in `list`/`numbered`, or more
  than ~8 in `grid` — the box is meant to be a quick scan, not a
  second copy of the article.

## 6. Implementation notes (for developers)

- `Summary.tsx` exports:
  - `isSummaryEnabled(article)` — reads `custom.show_summary`
    (aliased as `showSummary` in `ARTICLE_QUERY`).
  - `extractSummarySection(contentHtml)` — pulls the first marker out
    of the body, returns `{html, summary}`. Always called, regardless
    of the metafield, so a leftover marker is stripped from the body
    either way.
  - `renderSummary(summary)` — turns parsed data into the final
    `<div class="sum-root ...">` markup. Only called when
    `isSummaryEnabled(article)` is true.
- The route (`blogs.$blogHandle.$articleHandle.tsx`) resolves
  `summaryHtml` once in the loader and returns it in the loader
  payload — no client-side scan, no slot, no `createPortal`. It's
  rendered directly in the component's JSX via
  `dangerouslySetInnerHTML`, right after the hero image and before the
  body/TOC grid.
- Styles live in `summary.css`, linked via this route's `links()` —
  see that file's header comment for why it's linked explicitly rather
  than riding along with a component import.
- Class names: `sum-root`, `sum-layout--<variant>` (only
  `sum-layout--highlight` currently has rules of its own — the other
  three layouts are styled through their inner list/item classes),
  `sum-title`, `sum-list`, `sum-list--numbered`, `sum-item`,
  `sum-item--numbered`, `sum-number`, `sum-item-text`, `sum-grid`,
  `sum-chip`, `sum-highlight-text`.

## 7. Known limitation

`extractSummarySection` only picks the **first** marker found in the
body, by design — the feature is "one summary box, always pinned to
the top." If a future need arises for multiple, section-scoped
summary boxes rendered inline (rather than one box at the top), that
is a different feature and would need separate inline-injection
logic, similar to the original `injectSummarySections` pass this file
replaced.