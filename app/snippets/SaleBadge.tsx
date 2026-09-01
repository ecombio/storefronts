import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

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
  if (!price || !compareAtPrice) return null;

  const priceAmount = parseFloat(price.amount);
  const compareAmount = parseFloat(compareAtPrice.amount);

  if (!(compareAmount > priceAmount)) return null;

  const percentOff = Math.round((1 - priceAmount / compareAmount) * 100);

  if (percentOff <= 0) return null;

  return <span className="sale-badge">Save {percentOff}%</span>;
}