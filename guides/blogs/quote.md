# Quote

`app/components/blogs/Quote.tsx`

A blog content block for emphasizing a single piece of information — a
stat, a customer line, a key takeaway — as a styled pull-quote, with
optional attribution.

## Architecture: static, not hydrated

Unlike `Video`, a quote has no interactivity — no click handler, no state
that changes after render. So it skips the marker-injection →
portal-hydration pattern `Video`/`NewsletterForm` use, and instead follows
the simpler pattern `FaqSection`/`TwoColumnContent` already use:
`injectQuoteEmbeds(html)` rewrites the marker directly into final,
semantic markup server-side in the loader. Nothing ships to the client for
this block beyond the CSS — no slot, no scan, no `createPortal`.

`Quote` (the component) is exported for typed reuse elsewhere, but it is
never portaled into anything in the article pipeline — `injectQuoteEmbeds`
writes equivalent static HTML directly.

## Usage (as a component)

```tsx
import Quote from "app/components/blogs/Quote";

<Quote
  text="Life is like a sandwich - the more you add to it, the messier it gets, but also the more interesting it becomes. Just try not to drop the avocado side down."
  attribution="Max Crunch"
  role="Crunchly Co-founder"
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | `string` | — | **Required.** Rendered wrapped in straight double quotes. |
| `attribution` | `string` | — | Who said it, rendered in `<cite>`. |
| `role` | `string` | — | Secondary detail (title/company). Only rendered alongside `attribution`. |
| `variant` | `"card" \| "pull"` | `"card"` | `card`: bordered white card with a quote-mark icon (matches the reference design). `pull`: lighter-weight, no card chrome — just a left border accent, for an inline quote that shouldn't be visually boxed off. |
| `className` | `string` | — | Extra class on the root `<figure>`. |

## Embedding in article HTML

Editor-authored marker in the article's custom-HTML block:

```html
<div
  data-quote-embed
  data-text="Life is like a sandwich - the more you add to it, the messier it gets, but also the more interesting it becomes. Just try not to drop the avocado side down."
  data-attribution="Max Crunch"
  data-role="Crunchly Co-founder"
  data-variant="card"
></div>
```

Only `data-text` is required. `data-role` is ignored unless
`data-attribution` is also present. A marker missing `data-text` is
dropped silently — same "skip malformed" behavior as the other blocks.

In the loader, `injectQuoteEmbeds(contentHtml)` runs alongside
`injectFaqSections`/`injectTwoColumnContent` (same pure-string-transform,
no-hydration category). In `links()`, `quote.css` is registered
route-scoped via `?url`, same as `video.css` — the marker is
article-body-only, so it doesn't belong in `root.tsx`. See
`app/templates/blogs.$blogHandle.$articleHandle.tsx` for the full wiring
— it's just an import, one loader line, and a `links()` entry; no new
state, effect, or portal.

## Markup

```html
<figure class="quote quote--card">
  <svg class="quote__mark" ...></svg>
  <blockquote class="quote__text">"Life is like a sandwich..."</blockquote>
  <figcaption class="quote__attribution">
    &mdash; <cite class="quote__name">Max Crunch</cite>
    <span class="quote__role">, Crunchly Co-founder</span>
  </figcaption>
</figure>
```

`<blockquote>`/`<cite>` are used for real semantic value, not just
styling hooks. If there's no attribution, the `<figcaption>` is omitted
entirely rather than rendered empty.

## Styling

BEM classes in `app/assets/quote.css`, themeable via CSS custom
properties: `--quote-accent-color` (icon + `pull` border), `--quote-card-bg`,
`--quote-card-border`, `--quote-card-shadow`, `--quote-card-radius`,
`--quote-text-color`, `--quote-attribution-color`.

## Files

- `app/components/blogs/Quote.tsx` — the component, plus `injectQuoteEmbeds` (server-side marker injection)
- `app/assets/quote.css` — styles, registered via the route's `links()` export (`?url` import)
