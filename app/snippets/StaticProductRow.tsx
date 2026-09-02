// app/snippets/StaticProductRow.tsx
//
// Hook-free twin of ProductRow (~/snippets/ProductRow), used only for
// the SSR pass in ~/lib/shoppable-embeds. Same resolve-and-drop contract
// as ProductRow: an ID with no match (deleted/unpublished product,
// typo) is dropped, not rendered as a broken card.

import {StaticProductCard} from './StaticProductCard';
import type {ProductCardFragment} from 'storefrontapi.generated';

type StaticProductRowProps = {
  productIds: string[];
  productsById: Map<string, ProductCardFragment>;
};

export function StaticProductRow({
  productIds,
  productsById,
}: StaticProductRowProps) {
  const products = productIds
    .map((id) => productsById.get(id))
    .filter((p): p is ProductCardFragment => Boolean(p));

  if (products.length === 0) return null;

  return (
    <div className="product-row" data-columns={products.length}>
      {products.map((product) => (
        <StaticProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}