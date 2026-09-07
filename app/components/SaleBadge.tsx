import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {hasDiscount, percentOff} from '~/lib/pricing';

/**
 * "Save X%" badge, shown above the product title when the selected
 * variant has a compareAtPrice higher than its current price.
 * Renders nothing if there's no discount to show.
 */
export function SaleBadge({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2 | null;
  compareAtPrice?: MoneyV2 | null;
}) {
  if (!hasDiscount(price, compareAtPrice)) return null;

  const pct = percentOff(price!, compareAtPrice);
  if (pct <= 0) return null;

  return <span className="sale-badge">Save {pct}%</span>;
}