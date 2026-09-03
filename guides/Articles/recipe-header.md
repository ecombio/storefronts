# Recipe Header

A printable recipe info card for blog articles. Authored by pasting a
marker `<div>` directly into Shopify's blog HTML source view — the
same editor-facing convention as `data-shoppable-product`,
`data-faq`, `data-newsletter-form`, `data-quote-embed`, and
`data-two-col`.

- **Component / transform:** `app/components/blogs/RecipeHeader.tsx`
  (`injectRecipeHeader`)
- **Styles:** `app/assets/recipe-header.css`
- **Wired into:** `app/templates/blogs.$blogHandle.$articleHandle.tsx`,
  in the loader pipeline right after `injectQuoteEmbeds` and before
  `injectTwoColumnContent`
- **Rendering shape:** fully static — no slot, no client-side portal.
  The only interactive piece (the print button) is a plain inline
  `onclick`, not a hydrated component.

---

## Marker syntax

```html
<div
  data-recipe-header
  data-recipe-title="Recipe informations"
  data-recipe-image="https://cdn.shopify.com/.../cupcake.jpg"
  data-recipe-image-alt="Frosted cupcake on a plate"
  data-recipe-prep-time="10 minutes"
  data-recipe-cook-time="10 minutes"
  data-recipe-servings="8 persons"
  data-recipe-category="Desserts"
></div>
```

The marker `<div>` **must be empty** (nothing between the open and
close tags) — the transform only matches `<div ...data-recipe-header...></div>`
with no inner content. If you paste the marker and Shopify's editor
adds a stray space, `<br>`, or placeholder text inside it, the marker
will silently fail to match and will be left in the article exactly
as pasted, unstyled. If a card doesn't appear after publishing, check
the raw HTML source for exactly this first.

### Attributes

| Attribute | Required | Default | Notes |
|---|---|---|---|
| `data-recipe-header` | yes | — | Presence-only marker; no value needed. |
| `data-recipe-title` | no | `Recipe informations` | Card heading. |
| `data-recipe-image` | no | — | Full image URL. See "Image behavior" below. |
| `data-recipe-image-alt` | no | `''` | Alt text for the image, or the placeholder's `aria-label` when no image is set. |
| `data-recipe-prep-time` | no | — | Free-text value, e.g. `"10 minutes"`. |
| `data-recipe-cook-time` | no | — | Free-text value, e.g. `"25 minutes"`. |
| `data-recipe-servings` | no | — | Free-text value, e.g. `"8 persons"` or `"4-6 servings"`. |
| `data-recipe-category` | no | — | Free-text value, e.g. `"Desserts"`, `"Sauces"`. |

Every stat attribute is free text, not a number — write it exactly
the way you want it displayed (`"10 minutes"`, not `10`).

### The one hard requirement

**At least one of the four stat fields, or an image, must be
present.** If a marker has none of `data-recipe-prep-time`,
`data-recipe-cook-time`, `data-recipe-servings`, `data-recipe-category`,
and no `data-recipe-image`, the transform treats it as nothing
meaningful to render and leaves the marker untouched (same fail-safe
behavior as an empty product-embed slot) — no empty card, no
placeholder box.

Everything else is optional and independently omittable. Leave out
any stat that doesn't apply to the recipe rather than filling it in
with a placeholder — for example, a sauce or drink recipe with no
meaningful "servings" value should simply omit
`data-recipe-servings`, not include it with a made-up number.

---

## Examples

### Full card — all fields set

```html
<div
  data-recipe-header
  data-recipe-title="Classic Vanilla Cupcakes"
  data-recipe-image="https://cdn.shopify.com/s/files/1/xxxx/cupcake.jpg"
  data-recipe-image-alt="Frosted vanilla cupcake on a white plate"
  data-recipe-prep-time="15 minutes"
  data-recipe-cook-time="20 minutes"
  data-recipe-servings="12 cupcakes"
  data-recipe-category="Desserts"
></div>
```

### No image — stats only

Fine to omit the image entirely. A placeholder block renders in its
place instead of leaving a gap in the layout.

```html
<div
  data-recipe-header
  data-recipe-title="Weeknight Tomato Sauce"
  data-recipe-prep-time="5 minutes"
  data-recipe-cook-time="30 minutes"
  data-recipe-category="Sauces"
></div>
```

### Image only — no stats

Also fine. The stats row (`<dl>`) simply doesn't render.

```html
<div
  data-recipe-header
  data-recipe-title="Homemade Focaccia"
  data-recipe-image="https://cdn.shopify.com/s/files/1/xxxx/focaccia.jpg"
  data-recipe-image-alt="Golden focaccia bread with rosemary"
></div>
```

### Recipe with no meaningful "servings" (drink/sauce pattern)

Just omit `data-recipe-servings` — don't write `"N/A"` or `"0"`.

```html
<div
  data-recipe-header
  data-recipe-title="Fresh Lemonade Concentrate"
  data-recipe-prep-time="10 minutes"
  data-recipe-category="Drinks"
></div>
```

### Title omitted (uses the default)

```html
<div
  data-recipe-header
  data-recipe-prep-time="10 minutes"
  data-recipe-cook-time="10 minutes"
  data-recipe-servings="8 persons"
></div>
```

Renders with the heading **"Recipe informations"**.

### Invalid — nothing will render

```html
<!-- No stats AND no image: marker is left untouched, no card appears -->
<div data-recipe-header data-recipe-title="Mystery Dish"></div>
```

```html
<!-- Marker has stray inner content: regex won't match, left as-is -->
<div data-recipe-header data-recipe-prep-time="10 minutes">
  <br>
</div>
```

---

## Multiple recipe headers in one article

You can paste more than one `data-recipe-header` marker in a single
article (e.g. a "roundup" post with several recipes). Each renders as
its own independent card. The shared print `<script>` is only ever
emitted once per article regardless of how many markers are present,
and is guarded (`window.__recipeHeaderPrintReady`) so it's safe even
if that ever changes.

> **Current limitation:** clicking "Print recipe" on any one card
> currently prints *every* recipe-header card in the article, since
> the print-isolation CSS targets the shared `.recipe-header` class
> rather than the specific card that was clicked. If your article has
> multiple recipes and someone clicks print on the first one, all of
> them will appear in the print output (and may visually overlap,
> since each is absolutely positioned to the top-left). If you're
> publishing a multi-recipe article, be aware of this before
> encouraging print use on those pages. Fixing this so each button
> only prints its own card is on the radar for `RecipeHeader.tsx` /
> `recipe-header.css`.

## Layout notes

- **Stats grid is fixed 2 columns.** With an odd number of stats (1
  or 3), the layout leaves visible empty space on one side rather
  than centering the last item. Worth a quick visual check for
  drink/sauce-style recipes that only set one or two stat fields.
- **Mobile (`≤640px`):** the card switches to a stacked column
  layout — image on top, full width, heading row wraps above the
  stats.
- **Print output:** only the `.recipe-header` card is visible when
  printed; the rest of the page (nav, header, footer, other article
  content) is hidden via a visibility-based print rule. The print
  button itself is hidden in the printed output.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Marker shows up as raw text/empty box on the live page | Marker `<div>` wasn't empty (stray whitespace/content inside it) — check raw HTML source |
| Nothing renders at all, marker just vanishes silently | Neither an image nor any of the four stat attributes was set |
| Title shows "Recipe informations" unexpectedly | `data-recipe-title` was omitted, or set to an empty string (`data-recipe-title=""`) — an empty string does **not** fall back cleanly the way an omitted attribute does |
| Clicking print prints more than one recipe | Known limitation with multiple recipe headers in one article — see above |
| Card has a gray placeholder box instead of a photo | No `data-recipe-image` was set — this is expected behavior, not a bug |

---

## For developers

See the header comment in `RecipeHeader.tsx` for the full technical
rationale (why this is a plain string transform and not a
hydrated/portaled component, why `afterprint` is used instead of a
synchronous class removal, and the print-isolation approach in
`recipe-header.css`). This file (`recipe-header.md`) is the
editor-facing counterpart, matching the `button.tsx`/`button.md` and
`Quote.tsx`/`quote.md` pattern used elsewhere in the blog article
pipeline.