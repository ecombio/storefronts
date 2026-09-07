# Recipe Header

A printable recipe info card for blog articles — shows a photo alongside
prep time, cooking time, servings, and category, plus a "Print recipe"
button. Any stat can optionally link to another page (e.g. "Desserts"
linking to a tag or collection page), for internal linking. Added by
editors directly in Shopify's blog post HTML source view, the same way
as CTA buttons, pull-quotes, FAQs, and the newsletter form.

See `RecipeHeader.tsx` for the implementation (the `injectRecipeHeader`
transform) and `RecipeHeader.css` for the styling.

## How to add one

In the blog post editor:

1. Upload your recipe photo first (via **Add image** in the editor, or
   your media library), so you have a real CDN URL to reference.
2. Switch the content editor to **HTML source view** (the `</>` icon
   in the toolbar).
3. Paste a marker `<div>` like this wherever you want the card to
   appear:

```html
<div
  data-recipe-header
  data-recipe-title="Recipe informations"
  data-recipe-image="https://cdn.shopify.com/s/files/1/XXXX/XXXX/files/cupcake.jpg"
  data-recipe-image-alt="Frosted cupcake on a plate"
  data-recipe-prep-time="10 minutes"
  data-recipe-cook-time="10 minutes"
  data-recipe-servings="8 persons"
  data-recipe-category="Desserts"
  data-recipe-category-url="/blogs/news/tagged/desserts"
></div>
```

4. Switch back to rich text view and publish.

The `<div>` renders empty in the editor — that's expected. It only
becomes the full styled card (photo, stats, print button) once the
article is rendered on the live storefront.

## Attributes

All attributes are optional, but the card needs **at least one of**:
an image, or one of the four stat fields. A marker with none of these
is left untouched (nothing renders) rather than showing an empty card.

| Attribute | Required? | Notes |
|---|---|---|
| `data-recipe-title` | No | Defaults to "Recipe informations" if omitted. |
| `data-recipe-image` | No | Full CDN URL of the photo. If omitted, a placeholder box renders instead. |
| `data-recipe-image-alt` | No | Alt text for the photo. Also used as the placeholder's `aria-label` when no image is set. |
| `data-recipe-prep-time` | No | Free text, e.g. `"10 minutes"`. |
| `data-recipe-prep-time-url` | No | Optional link target — makes the prep time value clickable. See "Linking a stat" below. |
| `data-recipe-cook-time` | No | Free text, e.g. `"25 minutes"`. |
| `data-recipe-cook-time-url` | No | Optional link target for cooking time. |
| `data-recipe-servings` | No | Free text, e.g. `"8 persons"`. Omit for recipes where "servings" doesn't apply (a sauce, a drink, a spice blend) rather than filling in a placeholder value. |
| `data-recipe-servings-url` | No | Optional link target for servings. |
| `data-recipe-category` | No | Free text, e.g. `"Desserts"`, `"Main course"`. |
| `data-recipe-category-url` | No | Optional link target for category — the most common use case for internal linking (e.g. to a tag or collection page). |

Only the stat attributes you actually set are shown — there's no blank
row for an omitted stat. Stats always appear in this fixed order when
present: Prep time, Cooking time, Servings, Category.

## Linking a stat (internal linking)

Any of the four stats can be turned into a clickable link by pairing
its value attribute with a matching `-url` attribute:

```html
data-recipe-category="Desserts"
data-recipe-category-url="/blogs/news/tagged/desserts"
```

- A `-url` attribute only does anything if the matching value
  attribute is also set — there's no value to link without it.
- A stat with a value but **no** `-url` renders as plain text, exactly
  as it always has.
- This works the same way for all four stats
  (`prep-time`, `cook-time`, `servings`, `category`) — link whichever
  ones make sense. `category` is the most natural fit for internal
  linking (pointing to a recipe tag, collection, or category page),
  but there's no restriction on the others — e.g. linking `servings`
  to a "how we size portions" guide.
- Linked stats show a subtle grey background on hover to signal
  they're clickable. In print, links render as plain gray text with no
  background or link color, since links have no meaning on paper.
- Existing recipe headers published without any `-url` attributes are
  unaffected — this is fully backward compatible.

## Print behavior

Clicking **Print recipe** opens the browser's print dialog with only
the recipe card visible — the rest of the page (header, nav, article
text, footer) is hidden for that print job. No extra setup needed;
this works automatically wherever the marker is used. Linked stats
print as plain text (no underline color, no background) since a link
has no meaning on paper.

## Known limitation: multiple recipe headers in one article

If an article has **more than one** recipe header, clicking "Print
recipe" on any one of them currently prints **all** the recipe cards
in the article, not just the one you clicked.

**Workaround until this is fixed:** if you need a single article to
document multiple recipes with independent printing, publish each
recipe as its own article instead of combining them with multiple
recipe headers in one post.

## Troubleshooting

- **Card doesn't appear at all** — check that the marker has at least
  one image or stat attribute set; an empty marker (no image, no
  stats) is intentionally left as-is.
- **Photo shows a gray placeholder box** — `data-recipe-image` is
  missing or the URL is broken. Confirm the image was uploaded and the
  CDN URL was copied correctly.
- **Photo shows as broken with alt text visible** — same as above;
  double-check the CDN URL actually resolves in a browser tab.
- **"Servings" (or another stat) shows nothing** — that attribute
  wasn't set on the marker. Add it if you want it to appear.
- **Photo renders full-width instead of the fixed 240×200 box** —
  usually means `RecipeHeader.css` isn't loading, or another
  stylesheet's `img` rule (e.g. a broad `.article img` rule) is
  overriding it. See `RecipeHeader.css`'s header comment for the
  specificity fix already applied for this.
- **A stat value isn't clickable even though I added a `-url`
  attribute** — confirm the matching base value attribute
  (`data-recipe-category`, etc.) is also present; a `-url` attribute
  with no value attribute has nothing to link.