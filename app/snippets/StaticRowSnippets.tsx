// app/snippets/StaticRowSnippets.tsx
//
// Hook-free twins of Solo/Duo/Trio (~/snippets/RowSnippets), used only
// for the SSR pass in ~/lib/shoppable-embeds.

import {StaticProductRow} from './StaticProductRow';
import type {ProductCardFragment} from 'storefrontapi.generated';

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

export function StaticSolo({productIds, productsById}: RowProps<1>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}

export function StaticDuo({productIds, productsById}: RowProps<2>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}

export function StaticTrio({productIds, productsById}: RowProps<3>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}