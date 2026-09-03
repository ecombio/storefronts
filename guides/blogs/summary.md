# Summary

A static "Summary" / "Key takeaways" block for blog articles, with four
selectable layouts (list, numbered, grid, highlight). Editors write a
`data-summary-embed` marker directly in Shopify's blog HTML source view,
with their bullet points or paragraphs nested inside it; the loader
normalizes it into the finished box at request time.

Same family as `TwoColumnContent` and `RecipeHeader`: purely static, no data
fetch, no React component, no portal. A summary box is just styled text —
nothing in it needs client state, an event handler, or a fetcher, so there's
no reason to hydrate it at all.

## Files

| File | Purpose |
|---|---|
| `app/components/blogs/Summary.tsx` | `injectSummarySections()` — the loader-side transform |
| `app/assets/summary.css` | Styles for all four layout variants |

## Wiring it up

**1. Import in `blogs.$blogHandle.$articleHandle.tsx`:**

```tsx
import {injectSummarySections} from '~/components/blogs/Summary';
import summaryStyles from '~/assets/summary.css?url';
```

**2. Register the stylesheet** (route-scoped, same reasoning as
`article-toc.css` / `two-column-content.css` / `recipe-header.css` — this
marker only ever appears inside a blog article body):

```tsx
export function links() {
  return [
    {rel: 'stylesheet', href: articleStyles},
    {rel: 'stylesheet', href: authorSectionStyles},
    {rel: 'stylesheet', href: twoColumnContentStyles},
    {rel: 'stylesheet', href: recipeHeaderStyles},
    {rel: 'stylesheet', href: summaryStyles},
  ];
}
```

**3. Run the transform in `loadCriticalData`.** Order doesn't matter relative
to the other static passes — none of them touch `data-summary-embed` markers
or vice versa:

```tsx
contentHtml = injectTwoColumnContent(contentHtml);
contentHtml = injectRecipeHeader(contentHtml);
contentHtml = injectSummarySections(contentHtml);
contentHtml = injectFaqSections(contentHtml);
```

No change needed to the article template's `bodyRef` scan effect — like
`TwoColumnContent` and `RecipeHeader`, this component never creates a slot
for React to find.

## Editor marker syntax

```html
<div data-summary-embed data-summary-title="Key takeaways" data-summary-layout="grid">
  <ul>
    <li>Point one</li>
    <li>Point two</li>
    <li>Point three</li>
  </ul>
</div>
```

| Attribute | Required | Notes |
|---|---|---|
| `data-summary-title` | No | Renders as an `<h3>` above the items. Omit for no heading. |
| `data-summary-layout` | No | One of `list` (default), `numbered`, `grid`, `highlight`. An unrecognized value silently falls back to `list`. |

Items come from `<li>` tags if present inside the marker, or `<p>` tags
otherwise if there are no `<li>`s — useful for `highlight`, which reads best
as a sentence or two rather than a bulleted list.

## The four layouts

**`list`** (default) — a plain bulleted list. Best for 3–6 short takeaways.

```html
<div data-summary-embed data-summary-title="Key takeaways">
  <ul>
    <li>Mid-drive motors climb better than hub-drive.</li>
    <li>Range depends more on terrain and rider weight than the spec sheet.</li>
  </ul>
</div>
```

**`numbered`** — the same list with circular step numbers. Good for
sequential takeaways ("first check this, then this").

```html
<div data-summary-embed data-summary-title="Before you buy" data-summary-layout="numbered">
  <ul>
    <li>Decide your primary riding use.</li>
    <li>Check local e-bike class rules.</li>
    <li>Set a realistic range target.</li>
  </ul>
</div>
```

**`grid`** — items render as compact chips in a responsive grid. Good for
short, scannable tags rather than full sentences.

```html
<div data-summary-embed data-summary-title="At a glance" data-summary-layout="grid">
  <ul>
    <li>Class 1 only</li>
    <li>720 Wh battery</li>
    <li>~40 mile range</li>
    <li>Mid-drive motor</li>
  </ul>
</div>
```

**`highlight`** — a single emphasized block of text (multiple `<li>`/`<p>`
items are joined with a space into one block). Good for a single pull-quote
style takeaway rather than a list.

```html
<div data-summary-embed data-summary-layout="highlight">
  <p>The best electric bike is the one that fits your body, your routes, and your storage situation — not the one with the biggest spec sheet.</p>
</div>
```

## Malformed markup — what happens

If a `data-summary-embed` marker contains no `<li>` or `<p>` tags at all
(nothing for `extractItems` to find), the entire marker is **dropped
silently** — no empty box, no heading with nothing under it. This differs
slightly from `TwoColumnContent`/`RecipeHeader`, which leave malformed
markers untouched so editors see a visible signal something's wrong; here,
an empty summary box would look like a rendering bug on the live page, so
dropping it is the safer failure mode. Editors previewing the article should
still visually notice the missing block and can check their marker's
contents against the syntax above.

## Testing

- Each of the four layouts renders with its correct markup/classes
- `data-summary-title` omitted → no `<h3>` rendered
- `data-summary-layout` omitted or invalid → falls back to `list`
- Marker with `<li>` items → those are used, `<p>` tags (if also present)
  are ignored
- Marker with only `<p>` items, no `<li>` → paragraphs are used as items
- `highlight` layout with multiple items → joined into one text block, not
  rendered as separate paragraphs
- Marker with no usable items → dropped entirely, no empty box in the output
- Nested HTML inside an item (e.g. `<strong>`) → stripped to plain text via
  `stripTags`, not rendered as HTML (prevents malformed nested markup from
  breaking the summary box's structure)