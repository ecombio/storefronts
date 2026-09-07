# RelatedProducts

"Related products" article sidebar widget. Shows a merchant-curated
list of products, stacked in the article's right rail alongside (or
instead of) the Latest Blogs widget.

## Data source

Editor-curated, not algorithmic. Set up in **Settings > Custom data >
Articles**:

| Field     | Value                     |
| --------- | ------------------------- |
| Name      | `Related Products`        |
| Namespace and key | `custom.related_products` |
| Type      | List → Product             |

The merchant adds/removes/reorders products directly on the article
in admin. There is no fallback recommendation logic — if the list is
empty, the widget shows nothing.

## Usage

**1. Query the metafield** (already added to `ARTICLE_QUERY` in
`~/graphql/blog/ArticleQuery.ts`):

```graphql
relatedProducts: metafield(namespace: "custom", key: "related_products") {
  references(first: 10) {
    nodes {
      ... on Product {
        id
      }
    }
  }
}
```

> The `first: 10` cap is arbitrary — raise it if a merchant needs a
> longer list. There's no separate display cap in the component
> itself; whatever resolves, renders.

**2. In the route loader**, extract the raw ids and merge them into
the existing shoppable-products batch query so this doesn't cost a
second round-trip:

```ts
import {getRelatedProductIds} from '~/components/blogs/RelatedProducts';

const relatedProductGids = getRelatedProductIds(article);
const relatedProductIds = relatedProductGids.map((gid) => gid.split('/').pop()!);
```

Merge `relatedProductIds` into whatever id list you're already
building for `SHOPPABLE_PRODUCTS_QUERY`, then resolve each id back
against the returned nodes into a `ProductCardFragment[]`, preserving
the merchant's list order.

**3. Render it** — no manual empty-check needed, the component
self-hides:

```tsx
import RelatedProducts from '~/components/blogs/RelatedProducts';

<RelatedProducts products={relatedProducts} />
```

**4. Link the stylesheet** in the route's `links()`:

```ts
import relatedProductsStyles from '~/components/blogs/RelatedProducts.css?url';
```

## Notes

- Product order in the sidebar matches the order the merchant set in
  the metafield list — this is preserved end-to-end (extraction →
  batch resolution → render), not re-sorted by price, rating, etc.
- If a referenced product is deleted, unpublished, or otherwise fails
  to resolve in the batch query, it's silently dropped from the
  rendered list rather than showing a broken card.
- Pairs with `.article-latest-blogs` inside a shared
  `.article-right-rail` wrapper in the article route — see
  `article.css` for that wrapper and `TableOfContents.css` for the
  grid column it sits in.
