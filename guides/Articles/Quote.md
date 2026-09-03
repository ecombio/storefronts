# Quote

Blog content block for emphasizing a single piece of information — a stat,
a customer line, a key takeaway — as a styled pull-quote card with optional
attribution.

- Component: `app/components/blogs/Quote.tsx`
- Styles: `app/assets/quote.css`
- Loader transform: `injectQuoteEmbeds` (exported from `Quote.tsx`)

## How it works

Quote is **fully static** — it has no click handler and no state that
changes after render. It follows the same pattern as `FaqSection` and
`TwoColumnContent`: the loader runs `injectQuoteEmbeds` over the article's
`contentHtml`, rewriting each marker directly into final markup *before*
the page ever reaches the client.

This is different from `Video`, `NewsletterForm`, and `ImagesGallery`,
which render an empty/static slot server-side and then hydrate a real
component into it via `createPortal` once mounted. Quote never needs that
second step — there's nothing to hydrate. Consequently:

- No `data-quote-slot` node type exists in `blogs.$blogHandle.$articleHandle.tsx`.
- Quote is never scanned for in the article template's slot-discovery effect.
- The `Quote` React component exported from `Quote.tsx` is not portaled
  anywhere in the current route. It's exported for typed reuse elsewhere
  (e.g. hand-placing a quote in a Liquid section later, or in a future
  non-blog surface) — `injectQuoteEmbeds` produces equivalent static HTML
  independently of that component.

## Marker syntax

Editors add a quote by dropping a custom-HTML block into the Shopify blog
editor with this shape:

```html
<div
  data-quote-embed
  data-text="Life is like a sandwich - the more you add to it, the better it gets."
  data-attribution="Max Crunch"
  data-role="Crunchly Co-founder"
  data-variant="card"
></div>
```

| Attribute          | Required | Notes                                                                 |
| ------------------ | -------- | ---------------------------------------------------------------------|
| `data-text`        | **Yes**  | The quote itself. Marker is dropped silently if this is missing.     |
| `data-attribution` | No       | Who said it. Rendered in a `<cite>`.                                 |
| `data-role`        | No       | Secondary detail (title/company). **Ignored unless `data-attribution` is also present.** |
| `data-variant`     | No       | `"card"` (default) or `"pull"`. Any other value falls back to `"card"`. |

A marker missing `data-text` renders nothing — same "skip malformed"
behavior as the other blocks (FAQ, newsletter, video, gallery).

## Variants

### `card` (default)

Bordered white card with a quote-mark icon. Use for a quote that should
read as a distinct, boxed-off callout — pulled stats, testimonials,
customer quotes.

```html
<div
  data-quote-embed
  data-text="We cut onboarding time in half within the first month."
  data-attribution="Dana Reyes"
  data-role="Head of Ops, Fieldnote"
  data-variant="card"
></div>
```

Renders:

```html
<figure class="quote quote--card">
  <svg class="quote__mark" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
    <path d="M0 16 4 0h5l-3 16H0Zm11 0 4-16h5l-3 16h-6Z" />
  </svg>
  <blockquote class="quote__text">&quot;We cut onboarding time in half within the first month.&quot;</blockquote>
  <figcaption class="quote__attribution">
    &mdash; <cite class="quote__name">Dana Reyes</cite><span class="quote__role">, Head of Ops, Fieldnote</span>
  </figcaption>
</figure>
```

### `pull`

Lighter-weight, no card chrome — just a left border accent. Use to drop a
quote inline within body copy without visually boxing it off (e.g.
emphasizing a line from within the same article rather than an external
testimonial).

```html
<div
  data-quote-embed
  data-text="The best interface is the one you forget you're using."
  data-variant="pull"
></div>
```

Renders:

```html
<figure class="quote quote--pull">
  <blockquote class="quote__text">&quot;The best interface is the one you forget you're using.&quot;</blockquote>
</figure>
```

No `data-mark` SVG is rendered for `pull`, and — as in this example —
attribution is entirely optional; a `pull` quote with no `data-attribution`
renders no `<figcaption>` at all.

## Attribution without a role

`data-role` is inert without `data-attribution`. Given:

```html
<div data-quote-embed data-text="Ship it." data-role="ignored"></div>
```

...the output has no `<figcaption>` — `data-role` alone never renders.

## Escaping

`injectQuoteEmbeds` HTML-escapes `data-text`, `data-attribution`, and
`data-role` before writing them into markup (`&`, `<`, `>`, `"`), so
editor-supplied values can't break out of the generated tags. Because the
marker's own attribute-parsing regex stops at the first unescaped `"`,
raw values can't contain a literal double quote — use `&quot;` or rephrase
if a quote needs one internally.

## Integration checklist

To enable Quote in a route (already wired into
`blogs.$blogHandle.$articleHandle.tsx`; use this list when adding it to a
new template):

1. **Loader** — import and call `injectQuoteEmbeds` alongside the other
   no-async-fetch, pure-string-transform passes (same group as
   `injectFaqSections`/`injectNewsletterForm`):

   ```ts
   import {injectQuoteEmbeds} from '~/components/blogs/Quote';
   // ...
   contentHtml = injectQuoteEmbeds(contentHtml);
   ```

   Order relative to the other injectors isn't load-bearing — Quote
   markers are self-contained `<div data-quote-embed ...></div>` leaves,
   not containers other transforms need to see inside of or nest within.

2. **Styles** — import `quote.css` as a route-scoped stylesheet (same
   reasoning as `two-column-content.css`/`video.css`/`gallery.css`: the
   `data-quote-embed` marker only ever appears inside a blog article body):

   ```ts
   import quoteStyles from '~/assets/quote.css?url';
   // ...
   export function links() {
     return [
       // ...
       {rel: 'stylesheet', href: quoteStyles},
     ];
   }
   ```

3. **No slot-scanning changes needed.** Quote is fully static — it does
   not participate in the template's `useEffect` slot-discovery pass, and
   needs no `useState`, no `createPortal` call, and no entry in the
   shoppable/newsletter/video/gallery slot-type list.

## Theming

All colors, radius, shadow, and padding are exposed as CSS custom
properties with sensible fallbacks, so a theme can override them globally
without touching `quote.css`:

| Property                    | Default                          | Used by        |
| ---------------------------- | --------------------------------| --------------- |
| `--quote-card-bg`            | `#ffffff`                        | `card`          |
| `--quote-card-border`        | `#eee2d8`                        | `card`          |
| `--quote-card-radius`        | `16px`                           | `card`          |
| `--quote-card-shadow`        | `0 10px 30px rgba(20,20,20,.06)` | `card`          |
| `--quote-card-padding`       | `24px`                           | `card`          |
| `--quote-accent-color`       | `#2f3bf0`                        | mark fill (`card`), left border (`pull`) |
| `--quote-text-color`         | `#1a1a1a`                        | both            |
| `--quote-attribution-color`  | `#4d4d4d` (`card`) / `#666` (`pull`) | both       |

## Testing a marker locally

Paste a marker into any article's custom-HTML block in the Shopify blog
editor, save, and load the article page — the transform runs at request
time in the loader, so no rebuild/deploy is needed to see a change to the
marker's attributes, only to `Quote.tsx`/`quote.css` themselves.