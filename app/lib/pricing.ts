// app/lib/pricing.ts
//
// Single source of truth for "is this actually a discount". Shopify
// returns compareAtPriceRange as an object with amount "0.00" rather
// than null when no compare-at price is set, so a truthiness check on
// the object alone isn't enough — it must be a real object AND greater
// than the current price. Previously this check lived correctly in
// SaleBadge.tsx but was duplicated (incorrectly, as a bare truthy
// check) in ProductCard.tsx's price block, which is how the two drifted
// out of sync and produced a "$0.00" struck-through price whenever a
// product had an empty/zero compare-at price set in Shopify.

import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

export function hasDiscount(
  price?: MoneyV2 | null,
  compareAtPrice?: MoneyV2 | null,
): compareAtPrice is MoneyV2 {
  if (!price || !compareAtPrice) return false;
  return parseFloat(compareAtPrice.amount) > parseFloat(price.amount);
}

export function percentOff(price: MoneyV2, compareAtPrice: MoneyV2): number {
  const priceAmount = parseFloat(price.amount);
  const compareAmount = parseFloat(compareAtPrice.amount);
  return Math.round((1 - priceAmount / compareAmount) * 100);
}