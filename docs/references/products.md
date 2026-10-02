# Products

How product pages (`/products/[handle]`) are built and which Shopify data drives them. Everything below is metafield-driven: set the data on the product in Shopify and the page picks it up. Nothing is hardcoded per product.

## Files

| Area                         | File                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Route and metadata           | `app/products/[handle]/page.tsx`                                                      |
| Page layout and tabs         | `components/product-detail/product-detail-section.tsx`                                |
| Trust badges and specs       | `components/product-detail/product-highlights.tsx`                                    |
| Technical Specifications tab | `components/product-detail/technical-specs-section.tsx`                               |
| FAQs tab                     | `components/product-detail/frequently-asked-questions-section.tsx`                    |
| Cached getters               | `lib/product/server.ts`                                                               |
| Shopify queries              | `lib/shopify/operations/products/server.ts`, `lib/shopify/fragments/product/index.ts` |
| Shopify to app mapping       | `lib/shopify/transforms/product/index.ts`                                             |
| Types                        | `lib/product/types.ts`                                                                |
| Hidden embedded pages        | `lib/pages/hidden.ts`                                                                 |

## Page layout

- Left column (6 of 10): media gallery, then highlights (specs grid and trust badges) in the gallery footer.
- Right column (4 of 10): breadcrumbs, title, Yotpo star rating, price, delivery estimate, options, accessories, buy buttons.
- Below: a tab bar, then Yotpo reviews (`#reviews`), then related products.
- The tab bar renders only when the product has a description (`descriptionHtml`).

## Tabs

| Tab                        | Source                                               |
| -------------------------- | ---------------------------------------------------- |
| Description                | Product description, plus the Expert Reviews section |
| Technical Specifications   | Page in `custom.technical_specifications`            |
| Frequently Asked Questions | Page in `custom.frequently_asked_questions`          |

Both page-driven tabs always show. If a product has no page attached, the tab shows a short "isn't available yet" message.

## Metafields

Define these under Settings, Custom data, Products. **Tick Storefront API access on every definition**, or the storefront cannot read it.

| Metafield                           | Type                | Used for                                                                                    |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| `custom.trust_badges`               | List of metaobjects | Badge tiles under the gallery (up to 10). Fields: `title`, `icon`, `tooltip`, `link`        |
| `custom.product_specs`              | List of metaobjects | Spec grid under the gallery (up to 12). Fields: `label`, `value`, `icon`, `tooltip`, `link` |
| `custom.expert_reviews`             | List of metaobjects | Video cards in the Description tab (up to 20)                                               |
| `custom.technical_specifications`   | Page                | Technical Specifications tab                                                                |
| `custom.frequently_asked_questions` | Page                | Frequently Asked Questions tab                                                              |

With no trust badges set, four fallback tiles show (warranty, UL certified, returns, shipping).

## FAQs

Each product gets its own Shopify page, named `frequently-asked-questions-<product-handle>`, selected in the product's Frequently Asked Questions field. The page body uses the same accordion shortcode as blog posts. Each shortcode goes on its own line:

```
[accordion: What class is this e-bike?]
<p>The class is listed in the Technical Specifications tab.</p>
[/accordion]
```

The tab turns each shortcode into an expandable item. A body with no shortcodes is shown as plain HTML.

To add FAQs to a product:

1. Shopify admin, Online Store, Pages: create a page with the handle `frequently-asked-questions-<product-handle>` and the shortcodes above.
2. Open the product and set its Frequently Asked Questions field to that page.

## Hidden embedded pages

Pages that exist only to be embedded must never be reachable on their own. `lib/pages/hidden.ts` returns a 404 for `/pages/<handle>` and drops them from the sitemap when the handle starts with:

- `after-item-` / `after-items-` (collections)
- `technical-specifications-`
- `frequently-asked-questions-`

The tabs still work because they read the page through the product metafield, not through the URL. Name any new embedded page with one of these prefixes, or add a prefix to the regex.

## Caching

- `getProduct` is cached (`cacheLife("max")`, tags `products` and `product-<handle>`) and refreshed by Shopify webhooks.
- `getProductVariant` is not cached, so price and stock are live.
- Technical specifications and FAQs are cached for hours (tags `technical-specs-<handle>` and `frequently-asked-questions-<handle>`). An edit in Shopify can take a while to show on the live site.
- Locally, clear `.next` and restart `pnpm dev` if a change does not appear.

## Config flags

`shopConfig.pdp` in `lib/config/index.ts` toggles bundles, Buy with Shop, complementary products, the quantity picker, and related products.

## Troubleshooting

- **Local product page returns 500 with a `JSON.parse` error:** the dev cache is corrupted. Stop Node, delete `.next`, and run `pnpm dev` again. Production was unaffected.
- **A tab always shows its placeholder:** the product has no page attached, or the metafield definition does not have Storefront API access ticked.
- **An embedded page is reachable at `/pages/...`:** its handle is missing a prefix in `lib/pages/hidden.ts`.
