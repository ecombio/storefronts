// app/snippets/RowSnippets.tsx
//
// Solo/Duo/Trio: thin, fixed-arity wrappers around ProductRow. These are
// the real, interactive components — used directly for any client-side
// rendering and swapped in by Article.tsx's hydration effect to replace
// the hook-free StaticSolo/StaticDuo/StaticTrio (~/snippets/StaticRowSnippets)
// rendered during the SSR pass in ~/lib/shoppable-embeds.

import {ProductRow} from './ProductRow';
import type {ProductCardFragment} from 'storefrontapi.generated';

// Type-level helper that pins the array length to exactly N elements
// (1, 2, or 3), falling back to a plain array for any other N. This is
// what makes Solo/Duo/Trio's props require exactly 1/2/3 product IDs
// at the type level rather than just "an array of strings".
type FixedArray<T, N extends number> = N extends 1
  ? [T]
  : N extends 2
    ? [T, T]
    : N extends 3
      ? [T, T, T]
      : T[];

// Shared prop shape for all three row components, parameterized by
// how many product IDs they require.
type RowProps<N extends number> = {
  productIds: FixedArray<string, N>;
  productsById: Map<string, ProductCardFragment>;
};

// 1-product row layout. All three variants just forward to the same
// ProductRow — the distinction is purely at the type/call-site level
// (enforcing the right number of IDs) plus whatever CSS keys off the
// resulting product count.
export function Solo({productIds, productsById}: RowProps<1>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}

// 2-product row layout.
export function Duo({productIds, productsById}: RowProps<2>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}

// 3-product row layout.
export function Trio({productIds, productsById}: RowProps<3>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}