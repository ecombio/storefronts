# Recipe Header

A static, marker-based recipe info card for blog articles — image, prep/cook
time, servings, and category at a glance, with a one-click "Print recipe"
button that prints just the card, not the whole page. Editors write a
`data-recipe-header` marker directly in Shopify's blog HTML source view; the
loader normalizes it into the finished card at request time.

Like `TwoColumnContent`, this is purely static: no data fetch, no React
component, no portal. The one interactive piece — printing — is handled with
a few lines of vanilla JS rather than a hydrated component, because
`window.print()` needs nothing from the app's React tree (no Router context,
no fetcher). That's the deciding factor for whether a marker-based feature in
this codebase needs a portal or not — see `NewsletterForm.tsx` for the
opposite case, where `useFetcher()` *does* need that context.

## Files

| File | Purpose |
|---|---|
| `app/components/blogs/RecipeHeader.tsx` | `injectRecipeHeader()` — the loader-side transform |
| `app/assets/recipe-header.css` | Card layout + print-isolation styles |

## Wiring it up

**1. Import in `blogs.$blogHandle.$articleHandle.tsx`:**

```tsx
import {injectRecipeHeader} from '~/components/blogs/RecipeHeader';
import recipeHeaderStyles from '~/assets/recipe-header.css?url';
```

**2. Register the stylesheet** (route-scoped, same reasoning as
`article-toc.css` / `two-column-content.css` — this marker only ever appears
inside a blog article body):

```tsx
export function links() {
  return [
    {rel: 'stylesheet', href: articleStyles},
    {rel: 'stylesheet', href: authorSectionStyles},
    {rel: 'stylesheet', href: twoColumnContentStyles},
    {rel: 'stylesheet', href: recipeHeaderStyles},
  ];
}
```

**3. Run the transform in `loadCriticalData`.** Order doesn't matter relative
to the other static passes (two-col, FAQ, newsletter) — none of them touch
`data-recipe-header` markers or vice versa — but keeping it near the other
static injections keeps the loader readable:

```tsx
contentHtml = injectTwoColumnContent(contentHtml);
contentHtml = injectRecipeHeader(contentHtml);
contentHtml = injectFaqSections(contentHtml);
```

No change needed to the article template's `bodyRef` scan effect — this
component never creates a slot for React to find, since nothing here ever
needs to hydrate.

## Editor marker syntax

```html
<div
  data-recipe-header
  data-recipe-title="Recipe informations"
  data-recipe-image="https://cdn.shopify.com/.../frosted-cupcake.jpg"
  data-recipe-image-alt="Frosted cupcake on a plate"
  data-recipe-prep-time="10 minutes"
  data-recipe-cook-time="10 minutes"
  data-recipe-servings="8 persons"
  data-recipe-category="Desserts"
></div>
```

All attributes are optional except that **at least one** of the four stat
fields (`prep-time`, `cook-time`, `servings`, `category`) or the `image` must
be present — otherwise the marker is left untouched (see "Malformed markup"
below).

| Attribute | Required | Notes |
|---|---|---|
| `data-recipe-title` | No | Defaults to `"Recipe informations"` |
| `data-recipe-image` | No | Full image URL. Omit entirely to show a placeholder box instead of a broken image |
| `data-recipe-image-alt` | No | Alt text for the image, or the `aria-label` on the placeholder if no image |
| `data-recipe-prep-time` | No | Free text, e.g. `"10 minutes"` |
| `data-recipe-cook-time` | No | Free text, e.g. `"25 minutes"` |
| `data-recipe-servings` | No | Free text, e.g. `"8 persons"` or `"Serves 4–6"` |
| `data-recipe-category` | No | Free text, e.g. `"Desserts"` |

### Omitting a stat that doesn't apply

Only stats with a value render — no blank rows, no fabricated placeholders.
A no-bake recipe with no real "cooking time," for example, should simply
leave that attribute off:

```html
<div
  data-recipe-header
  data-recipe-prep-time="15 minutes"
  data-recipe-servings="12 bars"
  data-recipe-category="No-bake desserts"
></div>
```

This renders a 3-stat card (no image, no cooking time) — the grid doesn't
leave a gap or show "Cooking time: —".

## How printing works

The button calls a small global function registered once per article
(`window.__printRecipeHeader`), even if the article has more than one recipe
header:

1. Adds a `recipe-printing` class to `<body>`.
2. Calls `window.print()`.
3. On the browser's `afterprint` event, removes the class again.

`recipe-header.css` uses the classic **visibility-based** "print only this
element" trick under `@media print`: everything on the page gets
`visibility: hidden`, then the recipe card and its children get
`visibility: visible` again and the card is repositioned to the top of the
page. This works regardless of what the rest of the page's markup looks like
— no need to know about the header, nav, footer, or any other article
content to hide it. A `display: none` approach would need explicit knowledge
of every sibling to hide, which breaks the moment the surrounding page
layout changes.

The Print button itself is hidden in the print output
(`.recipe-header__print { display: none }` inside the print media query) —
no reason to print a button that does nothing on paper.

### Known limitation

`afterprint` is used instead of removing the class immediately after
`window.print()` returns, because some mobile browsers treat `print()` as
non-blocking — removing the class synchronously on those browsers could
revert the page before the print dialog has actually rendered. `afterprint`
fires once the dialog is dismissed on every browser that supports printing
at all, so it's the reliable signal regardless of blocking behavior.

## Malformed markup — what happens

If a `data-recipe-header` marker has none of the four stat attributes **and**
no `data-recipe-image`, the transform leaves it completely untouched — same
fail-safe philosophy as the rest of the marker-based components in this
codebase (shoppable slots with no product ids, two-col blocks without exactly
two children). An editor who adds the marker but forgets to fill in any
attributes sees their raw, empty `<div>` in the published article — a
visible signal something's missing, not a silently blank card.

## Testing

- All four stats + image present → full card renders
- Only some stats present → only those render, no blank rows
- No image, at least one stat present → placeholder box renders in its place
- No stats and no image → marker passed through untouched
- Two recipe headers in one article → print script registers once, both
  buttons work
- Print button click → only the recipe card is visible in the print preview,
  everything else on the page is hidden
