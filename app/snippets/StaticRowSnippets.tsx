// app/snippets/StaticRowSnippets.tsx
//
// Hook-free twins of Solo/Duo/Trio (~/snippets/RowSnippets), used only
// for the SSR pass in ~/lib/shoppable-embeds. These exist because the
// real Solo/Duo/Trio -> ProductRow chain (indirectly) relies on hooks
// that require React context unavailable during renderToStaticMarkup.

import {StaticProductRow} from './StaticProductRow';
import type {ProductCardFragment} from 'storefrontapi.generated';

// Same fixed-arity prop shape as the real RowSnippets — kept in sync
// manually since this file intentionally has no shared import from
// RowSnippets.tsx (that file pulls in the interactive ProductRow,
// which is exactly what this static twin needs to avoid).
type RowProps<N extends number> = {
  productIds: FixedArray<string, N>;
  productsById: Map<string, ProductCardFragment>;
};

type FixedArray<T, N extends number> = N extends 1
  ? [T]
  : N extends 2
    ? [T, T]
    : N extends 3
      ? [T, T, T]
      : T[];

// Static 1-product row — renders via StaticProductRow, no hooks.
export function StaticSolo({productIds, productsById}: RowProps<1>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}

// Static 2-product row.
export function StaticDuo({productIds, productsById}: RowProps<2>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}

// Static 3-product row.
export function StaticTrio({productIds, productsById}: RowProps<3>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}