import type { ProductCard } from "@/lib/product/types";

/** Same rule as the card's price-drop badge: compare-at price above the current price. */
export function isOnSale(product: Pick<ProductCard, "price" | "compareAtPrice">): boolean {
  const now = parseFloat(product.price.amount);
  const was = product.compareAtPrice ? parseFloat(product.compareAtPrice.amount) : 0;
  return Number.isFinite(now) && Number.isFinite(was) && was > now;
}
