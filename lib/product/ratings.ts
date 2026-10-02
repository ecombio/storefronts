import "server-only";
import { getProductCardRatings } from "@yotpo";

import type { ProductCard } from "./types";

function numericId(gid: string): string {
  return gid.slice(gid.lastIndexOf("/") + 1);
}

/** Adds Yotpo score and count to listing cards; cards Yotpo can't answer for are returned unchanged. */
export async function withProductRatings(products: ProductCard[]): Promise<ProductCard[]> {
  if (products.length === 0) return products;
  const ratings = await getProductCardRatings(products.map((product) => numericId(product.id)));
  return products.map((product) => {
    const rating = ratings.get(numericId(product.id));
    return rating ? { ...product, rating } : product;
  });
}
