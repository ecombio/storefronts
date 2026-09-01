// app/sections/ProductFeed.tsx
//
// ⚠️ RECONSTRUCTED STOPGAP — see the header comment in the sibling
// CollectionFilters.tsx. This exists only so `collections.all.tsx`
// compiles. The sort-dropdown wiring below is a guess at what
// `currentSort` was for; verify before trusting it.

import type {ComponentProps} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductCard} from '~/snippets/ProductCard';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {SORT_OPTIONS} from '~/sections/CollectionFilters';

type ProductsConnection = ComponentProps<
  typeof PaginatedResourceSection<ProductCardFragment>
>['connection'];

interface ProductFeedProps {
  products: ProductsConnection;
  currentSort?: string;
  pageCursors?: Record<number, string>;
  totalKnownPages?: number;
  hasMoreBeyondKnownPages?: boolean;
}

export function ProductFeed({
  products,
  currentSort,
  pageCursors,
  totalKnownPages,
  hasMoreBeyondKnownPages,
}: ProductFeedProps) {
  const location = useLocation();
  const navigate = useNavigate();

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(location.search);
    params.delete('cursor');
    params.delete('direction');
    params.delete('p');
    params.set('sort', event.target.value);
    navigate(`${location.pathname}?${params.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  }

  return (
    <div className="collection-feed">
      <div className="collection-feed__sort">
        <label htmlFor="product-sort">Sort by</label>
        <select id="product-sort" value={currentSort ?? ''} onChange={handleSortChange}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <PaginatedResourceSection<ProductCardFragment>
        connection={products}
        resourcesClassName="products-grid"
        pageCursors={pageCursors}
        totalKnownPages={totalKnownPages}
        hasMoreBeyondKnownPages={hasMoreBeyondKnownPages}
      >
        {({node: product, index}) => (
          <ProductCard
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
            showVendor={false}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}
