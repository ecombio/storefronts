// app/snippets/RowSnippets.tsx
//
// Solo/Duo/Trio: thin, fixed-arity wrappers around ProductRow. These are
// the real, interactive components — used directly for any client-side
// rendering and swapped in by Article.tsx's hydration effect to replace
// the hook-free StaticSolo/StaticDuo/StaticTrio (~/snippets/StaticRowSnippets)
// rendered during the SSR pass in ~/lib/shoppable-embeds.

import {ProductRow} from './ProductRow';
import type {ProductCardFragment} from 'storefrontapi.generated';

type FixedArray<T, N extends number> = N extends 1
  ? [T]
  : N extends 2
    ? [T, T]
    : N extends 3
      ? [T, T, T]
      : T[];

type RowProps<N extends number> = {
  productIds: FixedArray<string, N>;
  productsById: Map<string, ProductCardFragment>;
};

export function Solo({productIds, productsById}: RowProps<1>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}

export function Duo({productIds, productsById}: RowProps<2>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}

export function Trio({productIds, productsById}: RowProps<3>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}