"use server";

import { PRODUCTS_PER_PAGE } from "@/lib/collections";
import {
  fetchCollectionProductsExcludingSale,
  resolveBrowseParams,
} from "@/lib/collections/server";
import type { PageInfo } from "@/lib/pagination/types";
import { withProductRatings } from "@/lib/product/ratings";
import type { ProductCard } from "@/lib/product/types";
import { fetchCollectionProducts } from "@/lib/shopify/operations/products/server";

export async function loadMoreCollectionProductsAction(params: {
  collection: string;
  cursor: string;
  search: string;
  excludeOnSale?: boolean;
}): Promise<{ products: ProductCard[]; pageInfo: PageInfo }> {
  const { filters, sort } = resolveBrowseParams(params.search);
  const fetchPage = params.excludeOnSale
    ? fetchCollectionProductsExcludingSale
    : fetchCollectionProducts;
  const result = await fetchPage({
    collection: params.collection,
    cursor: params.cursor,
    sortKey: sort,
    limit: PRODUCTS_PER_PAGE,
    filters,
  });
  return {
    products: await withProductRatings(result.products),
    pageInfo: result.pageInfo,
  };
}
