# PromoBanner

Wide, single in-feed promotional banner — pure brand/marketing real estate,
with **no products of its own**. Spliced into the products grid on
collection pages the same way [`PromoCarousel`](../../snippets/PromoCarousel.md)
is, via a full-row grid item, but where `PromoCarousel` is a shoppable row
of products next to a brand tile, `PromoBanner` is just the brand moment
on its own.

- **Component:** `app/snippets/PromoBanner.tsx`
- **Styles:** `app/assets/promo-banner.css`
- **Used from:** `app/templates/collections.$handle.tsx` (via
  `CollectionFeed`'s `buildInFeedItems`)

## Data source — FOR NOW: image + link only

> **This is the actual scope to build first.** The `promo_banner`
> metaobject should be created in Admin with exactly **two fields**:
>
> | Metaobject field key | Type | Purpose |
> |---|---|---|
> | `image` | File (image) | The banner image |
> | `link_url` | URL | Where the banner links to when clicked |
>
> That's it for v1 — no heading, no subheading, no separate CTA text, no
> variant picker, no background color. The banner **is** the image, and
> the image **is** the link.

Backed by a `custom.promo_banner` metaobject-reference metafield on the
Collection resource.

```graphql
fragment PromoBanner on Metaobject {
  id
  image: field(key: "image") {
    reference {
      ... on MediaImage {
        image {
          url
          altText
          width
          height
        }
      }
    }
  }
  linkUrl: field(key: "link_url") {
    value
  }
}
```

Field keys (`image`, `link_url`) are best-guess, mirroring the naming
convention already established by `promo_carousel`'s `PROMO_CARD_FRAGMENT`.
Confirm/adjust once the real metaobject is created in Admin.

**Position:** no `grid_position` field is being added yet either. Until
one exists, `promoBanner.position` stays `undefined`/`null` for every
collection, so every banner falls back to `CollectionFeed`'s
`DEFAULT_PROMO_BANNER_GRID_POSITION` (`0` — before the first product).
Merchant-configurable placement is a fields-later addition, same as
everything else on this list.

## ⚠️ Known gap: the banner isn't clickable yet with only these two fields

`PromoBanner.tsx`'s CTA logic today requires **both** `linkText` and
`linkUrl` before it renders a link at all:

```tsx
const hasCta = Boolean(banner.linkUrl && banner.linkText);
```

With only `image` + `link_url` populated (no `link_text`), `hasCta` stays
`false` — so as the component is currently written, **nothing would
actually be clickable**, even with `linkUrl` set. Making the banner
clickable off just an image + URL means the *image itself* needs to be
wrapped in the `<Link>`, not gated behind a separate labeled CTA button.

This needs a small code change to `PromoBanner.tsx` before it matches the
"image + link, so it's clickable" brief — not just a docs update. Options,
roughly:

- Wrap `promo-banner__media` in `<Link to={linkUrl}>` whenever `linkUrl`
  is set, regardless of `linkText`/CTA button presence.
- Keep the CTA button as an *optional* enhancement on top of that (once
  `link_text` is added later), rather than the only click target.

Let me know if you want me to make that change to the component next —
it's a real behavior fix, not just a description update.

## Everything else below is what the component *supports in code* today

The rest of this doc describes `PromoBannerData`'s full shape as coded —
useful once the metaobject grows past image+link, but **not** yet backed
by any Admin field beyond the two above.

### Props

```ts
interface PromoBannerProps {
  banner?: PromoBannerData | null;
}
```

| Field | Type | Backed by Admin field today? |
|---|---|---|
| `id` | `string` | — |
| `variant` | `'split-left' \| 'split-right' \| 'full-bleed' \| 'minimal' \| string \| null` | No — always defaults to `'split-left'` for now |
| `heading` | `string \| null` | No |
| `subheading` | `string \| null` | No |
| `image` | `{url, altText?, width?, height?} \| null` | **Yes** — `image` |
| `linkText` | `string \| null` | No |
| `linkUrl` | `string \| null` | **Yes** — `link_url` |
| `backgroundColor` | `string \| null` | No |
| `textAlignment` | `'left' \| 'center' \| 'right' \| string \| null` | No |
| `position` | `number \| null` | No — falls back to `DEFAULT_PROMO_BANNER_GRID_POSITION` |

### Render guard

Renders nothing if `banner` is missing, or if `banner.heading` **and**
`banner.image` are both missing. With only `image`/`link_url` wired up,
this simplifies in practice to: renders whenever `image` is set.

### Variants (code-level, not yet merchant-facing)

| Variant | Layout |
|---|---|
| `split-left` (default — what every banner will render as for now) | Image left, text block right |
| `split-right` | Image right, text block left |
| `full-bleed` | Image fills the banner; text overlaid on a dark scrim |
| `minimal` | No image; solid/custom color-block background, text only |

With no `heading`/`subheading` populated, `split-left`'s text block will
simply render empty next to the image — worth checking visually once the
clickability fix above lands, since an empty text column next to a
clickable image may look unintentional until `variant`/heading fields
exist.

## In-feed placement

Positioned via `CollectionFeed`'s `buildInFeedItems` helper alongside
`PromoCarousel`, currently always at the shared default position (`0`)
until `grid_position` exists as a real Admin field. If it later collides
with `PromoCarousel`'s position, banner renders first, then carousel.

## Preview / demo data

`PROMO_BANNER_DEMO_DATA` (exported from `PromoBanner.tsx`) still provides
one fixture per variant with full heading/subheading/CTA data, for
checking the richer layouts in isolation before those fields exist in
Admin. It is not the render path used by `collections.$handle.tsx`.

## Related

- [`PromoCarousel`](../../snippets/PromoCarousel.md) — the shoppable
  sibling in-feed item; splices in alongside `PromoBanner` via the same
  `products-grid` mechanism.
- `promo-banner.css` — variant layouts, responsive stacking, in-feed grid
  containment (`products-grid__banner-item`).
