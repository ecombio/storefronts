# Two Column Content

A static, marker-based two-column layout block for blog articles. Editors write
a `data-two-col` marker directly in Shopify's blog HTML source view; the loader
normalizes it into a responsive CSS grid at request time. No client-side JS,
no hydration, no portal — it's inert HTML from the moment it leaves the loader.

This is the same editor-facing pattern as the existing shoppable-embed
(`data-shoppable-product`), FAQ (`data-faq`), and newsletter-form
(`data-newsletter-form`) markers, but simpler: there's no data to fetch and
nothing needs to become interactive, so it stays a pure string transform.

## Why it's static

Every other marker in this codebase needs *something* live: shoppable embeds
fetch product data, the newsletter form needs a fetcher for submission. Two
Column Content has neither requirement — the columns are content the editor
already typed. Keeping it static means:

- Nothing to hydrate, so no flash-of-static-content while JS loads
- Works identically with JS disabled
- No `useEffect` scan added to the article template
- Cheapest possible version of this feature to maintain

## Files

| File | Purpose |
|---|---|
| `app/components/blogs/TwoColumnContent.tsx` | `injectTwoColumnContent()` — the loader-side transform |
| `app/assets/two-column-content.css` | Grid layout for the normalized markup |

## Wiring it up

**1. Import in `blogs.$blogHandle.$articleHandle.tsx`:**

```tsx
import {injectTwoColumnContent} from '~/components/blogs/TwoColumnContent';
import twoColumnContentStyles from '~/assets/two-column-content.css?url';
```

**2. Register the stylesheet:**

```tsx
export function links() {
  return [
    {rel: 'stylesheet', href: articleStyles},
    {rel: 'stylesheet', href: authorSectionStyles},
    {rel: 'stylesheet', href: twoColumnContentStyles},
  ];
}
```

**3. Run the transform in `loadCriticalData`**, after the shoppable-embed
block (so a shoppable marker nested inside a column is already resolved to
real product markup before this pass counts div depth):

```tsx
contentHtml = injectTwoColumnContent(contentHtml);
contentHtml = injectFaqSections(contentHtml);
```

## Editor marker syntax

Minimum viable block — two `<div>` children, any content inside:

```html
<div data-two-col>
  <div>First column — any rich text/HTML.</div>
  <div>Second column — any rich text/HTML.</div>
</div>
```

### Optional ratio override

Defaults to equal (`1-1`) columns. Override with `data-two-col-ratio`:

```html
<div data-two-col data-two-col-ratio="2-1">
  <div>Wider column.</div>
  <div>Narrower column.</div>
</div>
```

Supported values: `1-1` (default), `2-1`, `1-2`.

## Mixing formats

Because each column is just raw HTML, editors aren't limited to plain text —
any combination works, including nesting another marker inside a column.

### Text + text (most common)

```html
<div data-two-col>
  <div>
    <h3>Hub-drive motors</h3>
    <p>Steady push, simple, cost-effective. Best for flatter commutes.</p>
  </div>
  <div>
    <h3>Mid-drive motors</h3>
    <p>More bike-like feel, strong climbing. Best for hills and cargo.</p>
  </div>
</div>
```

### Image + text

```html
<div data-two-col>
  <div>
    <img src="https://cdn.shopify.com/.../mid-drive-diagram.jpg" alt="Mid-drive motor diagram" />
  </div>
  <div>
    <h3>How mid-drive motors work</h3>
    <p>Mounted at the crank, driving the chain directly — power goes through
    your gears, so climbing feels more natural than a hub motor's steady push.</p>
  </div>
</div>
```

### Text + nested shoppable embed

```html
<div data-two-col data-two-col-ratio="1-2">
  <div>
    <h3>Our pick for hills</h3>
    <p>If your commute has real elevation, this is the one we reach for.</p>
  </div>
  <div>
    <div data-shoppable-product="9468552413398"></div>
  </div>
</div>
```

The shoppable-embed transform runs first in the loader, so by the time
`injectTwoColumnContent` scans this block, the second column already contains
the resolved product card markup — the depth-counting scanner treats it like
any other nested HTML and doesn't need to know it's a product embed.

### List + list

```html
<div data-two-col>
  <div>
    <p><strong>Pros</strong></p>
    <ul>
      <li>Lightweight frame</li>
      <li>Great for apartment storage</li>
    </ul>
  </div>
  <div>
    <p><strong>Cons</strong></p>
    <ul>
      <li>Shorter range than full-size folders</li>
    </ul>
  </div>
</div>
```

## Malformed markup — what happens

If a `data-two-col` block doesn't contain **exactly two** direct child
`<div>` elements (one child, three children, stray text between them, or an
unclosed marker), the transform leaves the entire block untouched and passes
it through as-is. It won't silently drop content or produce broken markup —
worst case, the editor sees their raw, unstyled HTML in the published
article, which is a visible, obvious signal something needs fixing, rather
than a silent content loss.

Common ways to trigger this (avoid these):

- Only one `<div>` inside the marker
- Any text or a third `<div>` outside/between the two column divs
- An unclosed `<div data-two-col>` tag

## Testing

Because the div-depth counter is hand-rolled (a plain regex can't safely find
a wrapping `</div>` when there are nested `<div>`s inside a column), it's
worth covering with unit tests beyond visual QA:

- Two plain-text columns → normalizes correctly
- A column containing a nested `<div>` (e.g. an image wrapper) → boundary
  still resolves correctly
- A column containing a full nested marker (shoppable embed) → same
- Ratio attribute present / absent / invalid value → correct class or default
- One child div only → passed through untouched
- Three child divs → passed through untouched
- Unclosed marker → passed through untouched, no infinite loop
