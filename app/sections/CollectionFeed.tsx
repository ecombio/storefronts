// app/sections/CollectionFeed.tsx

import type {ComponentProps} from 'react';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/snippets/ProductItem';
import type {ProductItemFragment} from 'storefrontapi.generated';

// Derived from PaginatedResourceSection's own generic prop type rather than
// hardcoded to a specific generated query shape, so this section works with
// any loader that hands it a `products`-shaped connection (collection page,
// search results, a "related products" feed, etc.) without re-typing it
// here each time.
type ProductsConnection = ComponentProps<
  typeof PaginatedResourceSection<ProductItemFragment>
>['connection'];

interface CollectionFeedProps {
  products: ProductsConnection;
}

/**
 * The paginated grid of product cards for a collection page. Rendered
 * directly by a template (e.g. `templates/collections.$handle.tsx`) as a
 * sibling to `CollectionFilters` — this owns the `products` slice of the
 * collection's loader data, the template owns the rest (title, description,
 * analytics).
 */
export function CollectionFeed({products}: CollectionFeedProps) {
  return (
    <PaginatedResourceSection<ProductItemFragment>
      connection={products}
      resourcesClassName="products-grid"
    >
      {({node: product, index}) => (
        <ProductItem
          key={product.id}
          product={product}
          loading={index < 8 ? 'eager' : undefined}
        />
      )}
    </PaginatedResourceSection>
  );
}