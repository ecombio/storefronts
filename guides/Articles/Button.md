# Button (CTA)

> **Note:** This doc is reconstructed from the comments in
> `blogs.$blogHandle.$articleHandle.tsx` describing `injectBlogButtons`,
> not from `button.tsx` itself (that file hasn't been reviewed directly).
> Attribute names below are inferred to match the conventions the rest of
> the blocks (`Quote`, `FaqSection`, etc.) already use. Verify against the
> real `button.tsx` / confirm with whoever owns that file before treating
> this as ground truth.

Blog content block for a clickable call-to-action — "Shop now," "See
pricing," "Read the full spec sheet" — rendered as a real `<a>` link
styled to match the site's button system.

- Component: `app/components/blogs/button.tsx`
- Styles: `app/assets/blog-button.css`
- Loader transform: `injectBlogButtons` (exported from `button.tsx`)

## How it works

Button is **fully static** — like `Quote` and unlike `Video`/
`NewsletterForm`/`ImagesGallery`, it has no slot and no client-side
hydration step. The loader runs `injectBlogButtons` over the article's
`contentHtml`, rewriting each marker directly into final `<a>` markup
*before* the page ever reaches the client. Consequently:

- No `data-cta-slot` node type exists in `blogs.$blogHandle.$articleHandle.tsx`.
- Button is never scanned for in the article template's slot-discovery effect.
- `<BlogButton>` (the typed component exported from `button.tsx`) can still
  be used directly in JSX elsewhere in the route tree (e.g. inside
  `AuthorSection`) — that's a separate usage from `injectBlogButtons`,
  which produces equivalent static HTML independently of the component.

`injectBlogButtons` runs early in the loader pipeline — immediately after
`injectShoppableProducts` and before `injectTwoColumnContent` — because
its output is a self-contained node. Resolving it first keeps
`injectTwoColumnContent`'s div-depth counting accurate if a button marker
is ever nested inside a two-column layout.

## Marker syntax

Editors add a button by dropping a custom-HTML block into the Shopify
blog editor with this shape:

```html
<div
  data-cta
  data-text="Shop the Aventon Level 4 REC"
  data-url="/products/aventon-level-4-rec"
  data-style="primary"
></div>
```

| Attribute     | Required | Notes                                                                 |
| ------------- | -------- | ---------------------------------------------------------------------|
| `data-cta`    | **Yes**  | Presence-only flag — no value needed, just the bare attribute.       |
| `data-text`   | **Yes**  | The button's visible label. Marker is dropped silently if missing.   |
| `data-url`    | **Yes**  | Destination href. Marker is dropped silently if missing.             |
| `data-style`  | No       | `"primary"` (default) or `"secondary"`. Any other value falls back to `"primary"`. |

A marker missing `data-text` or `data-url` renders nothing — same
"skip malformed" behavior as the other blocks (Quote, FAQ, newsletter,
video, gallery).

## Variants

### `primary` (default)

Solid, high-contrast button. Use for the main action you want the reader
to take right after a product recommendation — "Shop this bike," "Add to
cart," "Get the guide."

```html
<div
  data-cta
  data-text="Shop commuter e-bikes"
  data-url="/collections/commuter-e-bikes"
  data-style="primary"
></div>
```

Renders:

```html
<div class="blog-cta-row">
  <a class="blog-cta blog-cta--primary" href="/collections/commuter-e-bikes">
    Shop commuter e-bikes
  </a>
</div>
```

### `secondary`

Outlined/lower-contrast button. Use for a supporting action alongside a
primary one — "Compare models," "Read the full review" — or standalone
when the action isn't the main conversion point of the section.

```html
<div
  data-cta
  data-text="Compare all commuter models"
  data-url="/collections/commuter-e-bikes/compare"
  data-style="secondary"
></div>
```

Renders:

```html
<div class="blog-cta-row">
  <a class="blog-cta blog-cta--secondary" href="/collections/commuter-e-bikes/compare">
    Compare all commuter models
  </a>
</div>
```

## Pairing primary + secondary

Two adjacent markers land inside the same `blog-cta-row`, giving you a
two-button row without any extra markup:

```html
<div
  data-cta
  data-text="Shop the Current ADV"
  data-url="/products/aventon-current-adv"
  data-style="primary"
></div>
<div
  data-cta
  data-text="See trail specs"
  data-url="/pages/current-adv-specs"
  data-style="secondary"
></div>
```

## Escaping

Following the same pattern as `injectQuoteEmbeds`, `injectBlogButtons`
should HTML-escape `data-text` before writing it into the `<a>` label so
editor-supplied copy can't break the surrounding markup. `data-url` should
be used as-is for the `href` (no escaping needed beyond what's required
for a valid attribute value) — this repo does not currently validate that
`data-url` is a safe/internal path, so keep marker authorship limited to
trusted editors, the same trust boundary every other marker in this
pipeline already assumes.

## Integration checklist

To enable Button in a route (already wired into
`blogs.$blogHandle.$articleHandle.tsx`; use this list when adding it to a
new template):

1. **Loader** — import and call `injectBlogButtons` early, before
   `injectTwoColumnContent`, alongside `injectShoppableProducts`:

   ```ts
   import {injectBlogButtons} from '~/components/blogs/button';
   // ...
   contentHtml = injectBlogButtons(contentHtml);
   ```

2. **Styles** — import `blog-button.css` as a route-scoped stylesheet, and
   also link it explicitly in `links()` even if `button.tsx` already has a
   bare side-effect import of the same file — that side-effect import only
   covers `<BlogButton>` used directly in JSX; it does not guarantee the
   CSS ships when the only usage on the route is via `injectBlogButtons`'s
   string transform:

   ```ts
   import blogButtonStyles from '~/assets/blog-button.css?url';
   // ...
   export function links() {
     return [
       // ...
       {rel: 'stylesheet', href: blogButtonStyles},
     ];
   }
   ```

3. **No slot-scanning changes needed.** Button is fully static — it does
   not participate in the template's `useEffect` slot-discovery pass, and
   needs no `useState`, no `createPortal` call, and no entry in the
   shoppable/newsletter/video/gallery slot-type list.

## Testing a marker locally

Paste a marker into any article's custom-HTML block in the Shopify blog
editor, save, and load the article page — the transform runs at request
time in the loader, so no rebuild/deploy is needed to see a change to the
marker's attributes, only to `button.tsx`/`blog-button.css` themselves.

## Open questions to confirm against the real `button.tsx`

Since this doc wasn't written against the actual source, these are worth
double-checking before anyone treats it as canonical:

- Exact attribute names (`data-cta`/`data-text`/`data-url`/`data-style`
  are a best guess based on the `Quote` block's conventions).
- Whether `data-style` supports values beyond `primary`/`secondary`.
- Whether `data-url` supports external URLs or same-origin paths only.
- Whether there's a target/rel attribute option for opening in a new tab.
- The exact class names emitted (`blog-cta-row`, `blog-cta`,
  `blog-cta--primary`/`--secondary`, inferred from the route comment).

## See also

`guides/blogs/quote.md` — the same reference-doc shape for `Quote`.