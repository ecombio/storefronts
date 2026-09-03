# Shoppable Product Sections

Documents the marker-based shoppable-product-embed system for blog articles,
authored by marketers via the Shopify Blog Editor's HTML view.

Supersedes the old `single | solo | duo | trio` system (`ProductGallery.tsx` +
`product-row.css`). That file/stylesheet pair is obsolete once this system is
wired in — see **Migration checklist** below.

## Layouts

| Layout  | Products | Copy? | Marker attribute        |
|---------|----------|-------|--------------------------|
| Focus   | 1        | No    | `data-shoppable-focus`   |
| Grid    | 2–4      | No    | `data-shoppable-grid`    |
| Gallery | 1–4      | Yes   | `data-shoppable-gallery` |
| Text    | 1        | Yes   | `data-shoppable-text`    |

## Marker syntax

```html
<!-- Focus: 1 product, big card -->
<div data-shoppable-focus="123"></div>

<!-- Grid: 2-4 products, 2x2 -->
<div data-shoppable-grid="123,456,789,012"></div>

<!-- Gallery: heading + body copy, row of 1-4 products -->
<div data-shoppable-gallery="123,456,789">
  <div data-shoppable-heading>Recommended</div>
  <div data-shoppable-body>A lightweight, foamy cleanser ideal for all skin types.</div>
</div>

<!-- Text: heading + body copy beside 1 product -->
<div data-shoppable-text="123">
  <div data-shoppable-heading>Recommended</div>
  <div data-shoppable-body>A lightweight, foamy cleanser ideal for all skin types.</div>
</div>
```

Matching is strict: exact attribute name, digits-only comma-separated IDs
within the layout's min/max count, no extra whitespace inside the id-list
attribute, and — for gallery/text — exactly one `data-shoppable-heading` div
followed by exactly one `data-shoppable-body` div as the marker's only
children.

### Legacy marker support

`extractShoppableProductIds`/`injectShoppableProducts` also recognize the old
attribute names for backward compatibility with already-published articles
that predate this migration:

| Legacy attribute | Maps to | Count  |
|-------------------|---------|--------|
| `data-single`     | `focus` | 1      |
| `data-solo`        | `focus` | 1      |
| `data-duo`         | `grid`  | 2      |
| `data-trio`        | `grid`  | 3      |

A legacy marker's rendered `[data-shoppable-slot]` wrapper always carries the
**new** kind string (`focus`/`grid`), never the original attribute name, so
it hydrates through the exact same client-side path as a native marker.

⚠️ This mapping was inferred from naming convention plus one confirmed
real-world example (`data-solo`) — `ProductGallery.tsx`'s original contract
wasn't available to verify against when it was written. Worth confirming
against version control history (or re-authoring the affected articles with
new markers) so this legacy block can eventually be deleted.

## Fail-silent contract

Same philosophy as the old system:

- A marker that doesn't match the strict pattern is never extracted, so it's
  never queried, and is left untouched in the final HTML (inert, not a
  broken card).
- An unresolved product ID is dropped. For focus/text (single-product
  layouts) this drops the whole marker. For grid/gallery (multi-product
  layouts) it renders with whichever IDs did resolve, and drops the whole
  marker only if none resolved.

## Server-side pipeline (`ProductSections.tsx`)

1. `extractShoppableProductIds(html)` — scans the raw article HTML for every
   recognized marker (current + legacy) and returns the deduped list of
   numeric product IDs, in first-seen order. Used by the loader to build the
   batched product query before rendering.
2. `injectShoppableProducts(html, productsById)` — replaces every recognized
   marker with server-rendered static markup (via `renderToStaticMarkup` and
   the hook-free `Static*` components), wrapped in a `[data-shoppable-slot]`
   container:
   ```html
   <div data-shoppable-slot="gallery" data-product-ids="123,456,789"
        data-heading="Recommended" data-body="A%20lightweight...">
     <!-- static rendered section markup -->
   </div>
   ```
   `data-heading`/`data-body` are stored **URI-encoded** on the wrapper so
   the client hydration step gets the verbatim original copy, rather than
   having to scrape it back out of rendered HTML.

## Client-side hydration (`blogs.$blogHandle.$articleHandle.tsx`)

The route component scans its rendered article body for
`[data-shoppable-slot]` nodes, reads `kind` / `data-product-ids` /
`data-heading` / `data-body` off each one, clears the static markup, and
`createPortal`s the real interactive component in:

- `focus` → `ProductFocus`
- `grid` → `ProductGrid`
- `gallery` → `ProductGallery` (heading + body)
- `text` → `ProductWithText` (heading + body)

Portaling (not `createRoot`) is required because the interactive components
depend on this tree's context providers (Router context for
`useNavigate()`, `Aside` context, cart context for `CartForm`'s fetcher).

> **Known dependency**: the hydration switch in the *older*
> `app/sections/Article.tsx` still keys off the legacy kind strings
> (`'single' | 'solo' | 'duo' | 'trio'`) rather than the new vocabulary. If
> that file is still in use anywhere, it needs updating to switch on
> `'focus' | 'grid' | 'gallery' | 'text'` and to read `data-heading`/
> `data-body` off the slot wrapper. This does **not** block legacy-marker
> support server-side (see above) — only client hydration on that
> particular route file.

## Components (`ProductSections.tsx`)

- **Interactive**: `ProductFocus`, `ProductGrid`, `ProductGallery`,
  `ProductWithText` — real hooks, used client-side, portaled into hydrated
  slots.
- **Static twins**: `StaticProductFocus`, `StaticProductGrid`,
  `StaticProductGallery`, `StaticProductWithText` — hook-free, used only by
  `injectShoppableProducts`'s `renderToStaticMarkup` pass.
- **`StaticProductCard`** — folded in from the now-obsolete
  `ProductGallery.tsx`. Hook-free twin of `ProductCard`. Omits
  wishlist/quick-view/compare/add-to-cart (all need JS); the add-to-cart
  slot becomes a plain link to the product page, and always renders (a
  "View product" link) even when no variant has resolved yet — "Sold out"
  only appears once a variant is confirmed unavailable. Reviews block is an
  empty placeholder to avoid layout shift when hydration mounts the real
  `StarRating`.

  ⚠️ Both anchor tags in this component (`product-card__image-wrapper` and
  `product-card__atc-btn`) require an explicit `<a ...>` opening tag — a
  copy/paste that drops just the `<a` (leaving the `href`/`className`/etc.
  attributes dangling before a bare `>`) will pass a casual read but fails
  the JSX/oxc parser with a cryptic `Unexpected token` pointing at the lone
  `>`, not at the missing tag. Worth double-checking both anchors any time
  this file is hand-edited.

## CSS (`product-sections.css`)

Scoped purely to layout/spacing/copy — does not redeclare anything from
`product-card.css`. Layout is driven by the `data-columns` attribute the
component sets at render time. Handles `data-columns` 1/2/3/4 explicitly for
grid and gallery (grid's base rule is `repeat(2, 1fr)`, with an override for
the `data-columns='3'` odd-count case — see the file's own changelog comment
for why that override exists).

Classes: `product-section`, `product-section--focus/grid/gallery/text`,
`product-section__copy`, `product-section__heading`, `product-section__body`,
`product-section__row`.

**Must be imported and linked in `app/root.tsx`** (this app links stylesheets
globally there rather than per-route or via an `app.css` barrel import,
despite what this file's own header comment used to say — see the note
below). It should sit directly after `productCardStyles`:

```tsx
import productCardStyles from '~/assets/product-card.css?url';
import productSectionsStyles from '~/assets/product-sections.css?url';
import productCarouselStyles from '~/assets/product-carousel.css?url';
```

```tsx
<link rel="stylesheet" href={productCardStyles}></link>
<link rel="stylesheet" href={productSectionsStyles}></link>
<link rel="stylesheet" href={productCarouselStyles}></link>
```

⚠️ **Debugging note**: if shoppable sections render with correct classes/DOM
structure but appear as unstyled stacked blocks, the near-certain cause is
that `product-sections.css` isn't actually linked in `root.tsx` — either
never added, or the import line got corrupted (e.g. a trailing `//` comment
on the same line swallowing the *next* import statement entirely, which
throws a `ReferenceError: ... is not defined` for whatever import got eaten,
not a CSS symptom at all). Confirm via devtools: inspect a card, check
whether `.product-section--grid`/`.product-card` have *any* matching CSS
rules in the Styles panel, or none. "No matching rules" on correct class
names = stylesheet not loading; matching rules losing visually = a
specificity/override problem elsewhere instead.

## Migration checklist

- [ ] Update `blogs.$blogHandle.$articleHandle.tsx`: import, `ShoppableSlot`
      type, scan effect, render switch (see patch notes).
- [ ] Update `app/sections/Article.tsx`'s hydration switch to the new kind
      vocabulary (`'focus' | 'grid' | 'gallery' | 'text'`) and to read
      `data-heading`/`data-body` off the slot wrapper — if that file is
      still in active use (see "Known dependency" note above).
- [ ] Confirm no other file imports from `~/components/blogs/ProductGallery`
      (`Select-String -Pattern "from '~/components/blogs/ProductGallery'"`
      across `app/`).
- [ ] Delete `app/components/blogs/ProductGallery.tsx`.
- [x] Add `app/assets/product-sections.css` and link it in `root.tsx`
      immediately after `productCardStyles`.
- [ ] Confirm nothing else references `.product-row`
      (`Select-String -Pattern "product-row"` across `app/`).
- [ ] Delete `app/assets/product-row.css` once confirmed unused, and remove
      its now-orphaned import/link from `root.tsx`.
- [ ] Separately (unrelated cleanup): delete the dead `.shoppable-embed*`
      block at the bottom of `article.css` — pre-consolidation system,
      already obsolete before this migration, rendered by the old
      `app/lib/shoppable-embeds.ts` from a single
      `data-shoppable-product="{id}"` marker. Confirm nothing references
      `.shoppable-embed` in markup first.

## Post-migration debugging log

Issues hit and fixed while wiring this system in, kept here in case similar
symptoms show up again:

1. **`Unexpected token` parse error at a lone `>`** — `StaticProductCard`
   had two anchors where the opening `<a ...>` tag was missing (attributes
   and closing `</a>` still present). Fix: restore both `<a` openings. See
   the ⚠️ note under **Components** above.
2. **Shoppable sections rendered correctly but completely unstyled** —
   `root.tsx` was still linking the old `product-row.css` (written for the
   `single/solo/duo/trio` class vocabulary, e.g. `.product-row[data-columns]`),
   which shares no selectors with `ProductSections.tsx`'s actual output
   (`.product-section--grid`, `.product-section__row`, etc.). Fix: swap the
   import/link to the real `product-sections.css`.
3. **`ReferenceError: productCarouselStyles is not defined` (SSR crash)** —
   introduced while making fix #2: the new import line's trailing comment
   ran onto the same line as the *next* import statement with no line break,
   so `import productCarouselStyles from ...` got swallowed into the comment
   and never executed. Fix: make sure a same-line trailing comment on an
   import never runs into the next import — keep each `import` on its own
   line.