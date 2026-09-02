// app/snippets/ProductRow.tsx
//
// Real, interactive counterpart to StaticProductRow (~/snippets/StaticProductRow).
// Renders a row of full ProductCard components — wishlist, quick view,
// compare, and add-to-cart all live — for a list of product IDs resolved
// against a productsById map.
//
// Same resolve-and-drop contract as StaticProductRow: an ID with no
// match (deleted/unpublished product, typo) is dropped, not rendered as
// a broken card.

import {ProductCard} from './ProductCard';
import type {ProductCardFragment} from 'storefrontapi.generated';

type ProductRowProps = {
  productIds: string[];
  productsById: Map<string, ProductCardFragment>;
};

export function ProductRow({productIds, productsById}: ProductRowProps) {
  const products = productIds
    .map((id) => productsById.get(id))
    .filter((p): p is ProductCardFragment => Boolean(p));

  if (products.length === 0) return null;

  return (
    <div className="product-row" data-columns={products.length}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}