# Collections: Sponsored Ads / Promo Carousel

Documents how the in-feed sponsored promo panel works on
`app/templates/collections.$handle.tsx`, including the merchant-controlled
grid position added on top of it.

## Summary

`PromoCarousel` — an Amazon-style sponsored panel (promo card + shoppable
product row) — is spliced directly into the products grid on collection
pages, rather than rendered as a separate section. `ProductCard` is
unaffected either way; it's used both as the regular grid tiles and,
separately, inside `PromoCarousel`'s own shoppable row.

## Data source

- Collection metafield: `custom.sponsored_ads`
- Type: metaobject reference (`promo_carousel`)
- Renders nothing if the metafield, its `promo_card` reference, or its
  `products` list is missing/empty — always safe to render unconditionally.

### `promo_carousel` metaobject fields

| Field label   | Key             | Type              | Notes |
|---------------|-----------------|-------------------|-------|
| Heading       | `heading`       | Single line text  | |
| Subheading    | `subheading`    | Single line text  | |
| Products      | `products`      | Collection (One)  | A *collection reference*, not a list of products — its own `products` are pulled for the shoppable row (first 6). |
| Promo Card    | `promo_card`    | Metaobject (One)  | See Promo Card fields below. |
| Grid Position | `grid_position` | Integer           | Optional. 0-based index in the current page's product grid to splice the panel after (`0` = before the first product). Leave blank to use the code default. |

### `promo_card` metaobject fields (assumed — confirm against Admin)

| Field    | Key         | Type             |
|----------|-------------|------------------|
| Image    | `image`     | File/image ref   |
| Heading  | `heading`   | Single line text |
| Link text| `link_text` | Single line text |
| Link URL | `link_url`  | Single line text |

## Files involved

```
app/templates/collections.$handle.tsx   loads + parses sponsoredAds, passes to MainCollection
app/sections/MainCollection.tsx         passes sponsoredAds through, unchanged
app/snippets/CollectionFeed.tsx         splices PromoCarousel into the products grid
app/snippets/PromoCarousel.tsx          renders the panel; defines SponsoredAdsData
```

### `collections.$handle.tsx`

- GraphQL fragment `SponsoredAds` fetches `heading`, `subheading`,
  `position` (`grid_position`), `promoCard`, `products`.
- Loader parses the metaobject reference into a plain `sponsoredAds`
  object; `position` is clamped to `[0, PAGE_BY - 1]` via the existing
  `toClampedInt` helper and defaults to `null` when unset.
- `sponsoredAds` is passed to `<MainCollection sponsoredAds={sponsoredAds} />`.
- The panel is **not** rendered standalone above `CollectionBanner` — only
  via the grid splice in `CollectionFeed`.

### `CollectionFeed.tsx`

- `DEFAULT_SPONSORED_ADS_GRID_POSITION = 4` — fallback used only when a
  collection's `sponsored_ads` entry has no `Grid Position` set.
- `sponsoredAdsPosition = sponsoredAds?.position ?? DEFAULT_SPONSORED_ADS_GRID_POSITION`
- Inside the `PaginatedResourceSection` render-prop, when `index === sponsoredAdsPosition`,
  `<PromoCarousel />` is rendered in a `.products-grid__promo-item` wrapper
  immediately before that product's `<ProductCard />`.
- Position is per-page: `index` restarts at 0 on every fetched page, so the
  panel appears at the same relative spot on every page — not first-page-only.
  (To restrict to page 1 only, additionally gate on the absence of the
  `cursor`/`direction` URL params.)

### `PromoCarousel.tsx`

- `SponsoredAdsData` includes optional `position?: number | null`.
- Component itself doesn't use `position` — it's read one level up in
  `CollectionFeed`; `PromoCarousel` only renders the panel + shoppable row.

## CSS note

`.products-grid__promo-item` is one more child in `.products-grid` (a CSS
grid). If `products-grid` uses fixed-width `grid-template-columns`, the
promo panel needs to span the full row or it'll be squeezed into a single
card-sized cell:

```css
.products-grid__promo-item {
  grid-column: 1 / -1;
}
```

Add this wherever `.products-grid` is styled if it isn't already handled.

## Open items

- Confirm `promo_card` field keys (`image`, `heading`, `link_text`,
  `link_url`) match the real metaobject definition in Admin — these were
  best-guess when first implemented.
- Confirm `.products-grid__promo-item` CSS spans the full grid row.
- Decide whether `Grid Position` should ever apply per-page-1-only instead
  of per-page (see note above) — not implemented, since it wasn't requested.
