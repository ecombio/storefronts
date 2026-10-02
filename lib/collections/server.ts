import { parseCollectionParams, serializeCollectionParams } from "@shopify/hydrogen";
import { getProductCardRatings, type YotpoCollectionReviewProduct } from "@yotpo";
import { cacheLife, cacheTag } from "next/cache";

import { getBrowseSort, PRODUCTS_PER_PAGE } from "@/lib/collections";
import type {
  Collection,
  CollectionAfterItemPage,
  CollectionWithThumbnail,
} from "@/lib/collections/types";
import type { CommerceLocale } from "@/lib/config/types";
import { withProductRatings } from "@/lib/product/ratings";
import { isOnSale } from "@/lib/product/sale";
import { tagProducts } from "@/lib/product/server";
import type { ProductCard } from "@/lib/product/types";
import { getNumericShopifyId } from "@/lib/shopify/id/server";
import { fetchCollectionSubCollections } from "@/lib/shopify/operations/collections/server";
import {
  fetchCollection,
  fetchCollectionAfterItemPage,
  fetchCollections,
  fetchCollectionsListing,
} from "@/lib/shopify/operations/collections/server";
import {
  fetchCollectionProducts,
  fetchSearchFacets,
  fetchSearchIndexProducts,
} from "@/lib/shopify/operations/products/server";

import type { CollectionResultsData, CollectionSearchState } from "./types";

// /collections/all is a local virtual collection with no Storefront API equivalent.
export const ALL_PRODUCTS_HANDLE = "all";

function tagCollections(collections: Array<{ handle: string }>): void {
  for (const collection of collections) {
    cacheTag(`collection-${collection.handle}`);
  }
}

export async function getCollections(
  params: { limit?: number; locale?: CommerceLocale } = {},
): Promise<Collection[]> {
  "use cache: remote";
  cacheLife("max");
  cacheTag("collections", "collections-index");

  const collections = await fetchCollections(params);
  tagCollections(collections);
  return collections;
}

export async function getCollection(params: {
  handle: string;
  locale?: CommerceLocale;
}): Promise<Collection | undefined> {
  // Plain cache is required to bake the collection into the PLP shell.
  "use cache";
  cacheLife("max");
  cacheTag("collections", `collection-${params.handle}`);

  return fetchCollection(params);
}

export async function getCollectionsListing(
  params: { limit?: number; locale?: CommerceLocale } = {},
): Promise<CollectionWithThumbnail[]> {
  "use cache";
  cacheLife("max");
  cacheTag("collections", "collections-index");

  const collections = await fetchCollectionsListing(params);
  tagCollections(collections);
  // Thumbnails fall back to product imagery, so product updates must refresh the listing.
  tagProducts(
    collections.flatMap((collection) =>
      collection.thumbnailProductId ? [{ id: collection.thumbnailProductId }] : [],
    ),
  );
  return collections;
}

export function resolveBrowseParams(search: string | URLSearchParams): CollectionSearchState {
  const state = parseCollectionParams(
    typeof search === "string" ? new URLSearchParams(search) : search,
  );
  return {
    dataSearch: serializeCollectionParams(state).toString(),
    filters: state.filters,
    sort: getBrowseSort(state),
  };
}

export async function getCollectionSearchState(
  searchParamsPromise: Promise<Record<string, string | string[] | undefined>>,
): Promise<CollectionSearchState> {
  return resolveBrowseParams(recordToSearchParams(await searchParamsPromise));
}

function recordToSearchParams(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  return params;
}

// Browse pages and facets stay uncached: cached cursor pages drift apart and duplicate boundary products, and Search & Discovery changes must appear immediately.
export async function getCollectionResultsData({
  handle,
  searchStatePromise,
  excludeOnSale = false,
}: {
  handle: string;
  searchStatePromise: Promise<CollectionSearchState>;
  excludeOnSale?: boolean;
}): Promise<CollectionResultsData> {
  const { dataSearch, filters, sort } = await searchStatePromise;
  const fetchPage = excludeOnSale ? fetchCollectionProductsExcludingSale : fetchCollectionProducts;
  const result = await fetchPage({
    collection: handle,
    sortKey: sort,
    limit: PRODUCTS_PER_PAGE,
    filters,
  });
  return {
    collection: handle,
    dataSearch,
    sort,
    filters,
    result: { ...result, products: await withProductRatings(result.products) },
    transformedFilters: { filters: result.filters, priceRange: result.priceRange },
  };
}

type CollectionProductsParams = Parameters<typeof fetchCollectionProducts>[0];
type CollectionProductsResult = Awaited<ReturnType<typeof fetchCollectionProducts>>;

// The regular grid holds only full-price products, so one API page can come back short or empty; keep reading until it fills.
const MAX_FILL_PAGES = 4;

export async function fetchCollectionProductsExcludingSale(
  params: CollectionProductsParams,
): Promise<CollectionProductsResult> {
  const first = await fetchCollectionProducts(params);
  const products = first.products.filter((product) => !isOnSale(product));
  let pageInfo = first.pageInfo;
  for (
    let page = 1;
    page < MAX_FILL_PAGES &&
    products.length < PRODUCTS_PER_PAGE &&
    pageInfo.hasNextPage &&
    pageInfo.endCursor;
    page++
  ) {
    const next = await fetchCollectionProducts({ ...params, cursor: pageInfo.endCursor });
    products.push(...next.products.filter((product) => !isOnSale(product)));
    pageInfo = next.pageInfo;
  }
  return { ...first, products, pageInfo };
}

const DEALS_PAGE_SIZE = 100;
const DEALS_MAX_PAGES = 5;

// The Storefront API cannot filter on compare-at price, so deals are found by reading the collection's pages.
async function fetchCollectionDeals(handle: string): Promise<ProductCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("collections", "collection-" + handle);

  const deals: ProductCard[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < DEALS_MAX_PAGES; page++) {
    const result = await fetchCollectionProducts({
      collection: handle,
      limit: DEALS_PAGE_SIZE,
      cursor,
    });
    deals.push(...result.products.filter(isOnSale));
    if (!result.pageInfo.hasNextPage || !result.pageInfo.endCursor) break;
    cursor = result.pageInfo.endCursor;
  }
  tagProducts(deals);
  return deals;
}

export async function getCollectionDeals(params: { handle: string }): Promise<ProductCard[]> {
  return withProductRatings(await fetchCollectionDeals(params.handle));
}

const REVIEW_CANDIDATES_LIMIT = 250; // products checked for reviews (each adds a cache tag, keep under ~120)
const REVIEW_PRODUCTS_LIMIT = 24;
// Products known to have Yotpo reviews. Temporary: the review webhook will maintain this list.
const REVIEWED_PRODUCT_IDS = new Set(["9448490696918"]); // reviewed products used for the section

// Yotpo returns reviews one product at a time, so a collection's reviews come from its first products.
export async function getCollectionReviewProducts(params: {
  handle: string;
}): Promise<YotpoCollectionReviewProduct[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("collections", "collection-" + params.handle);

  // Dev only: skip the big Shopify fetch on slow connections.
  if (process.env.NODE_ENV === "development") {
    return [
      {
        id: "9448490696918",
        handle: "aventon-level-4-rec-electric-commuter-bike",
        title: "Aventon Level 4 REC Electric Commuter Bike",
      },
    ];
  }
  const { products } = await fetchCollectionProducts({
    collection: params.handle,
    limit: REVIEW_CANDIDATES_LIMIT,
  });
  const candidates = products.flatMap((product) => {
    const id = getNumericShopifyId(product.id);
    return id ? [{ id, handle: product.handle, title: product.title }] : [];
  });
  // One shared tag (not one per product) keeps big collections under the cache tag limit.
  // The Yotpo webhook revalidates it, so a product's first review reaches the section.
  cacheTag("yotpo-review-selection");

  const ratings = await getProductCardRatings(candidates.map((candidate) => candidate.id));
  // Throw (never cached) if Yotpo answered for none, so an outage isn't remembered.
  if (candidates.length > 0 && ratings.size === 0) throw new Error("Yotpo ratings unavailable");
  return candidates
    .filter((candidate) => (ratings.get(candidate.id)?.count ?? 0) > 0)
    .slice(0, REVIEW_PRODUCTS_LIMIT);
}

export async function getAllProductsCollection(): Promise<Collection> {
  const title = "Products";
  const description = "";
  return {
    handle: ALL_PRODUCTS_HANDLE,
    title,
    description,
    image: null,
    path: `/collections/${ALL_PRODUCTS_HANDLE}`,
    updatedAt: new Date(0).toISOString(),
    seo: { title, description },
  };
}

export async function getAllProductsResultsData({
  searchStatePromise,
}: {
  searchStatePromise: Promise<CollectionSearchState>;
}): Promise<CollectionResultsData> {
  const { dataSearch, filters, sort } = await searchStatePromise;
  const [products, facets] = await Promise.all([
    fetchSearchIndexProducts({
      sortKey: sort,
      limit: PRODUCTS_PER_PAGE,
      filters,
    }),
    fetchSearchFacets({
      filters,
    }),
  ]);
  return {
    collection: ALL_PRODUCTS_HANDLE,
    dataSearch,
    sort,
    filters,
    result: {
      products: await withProductRatings(products.products),
      pageInfo: products.pageInfo,
      filters: facets.filters,
      priceRange: facets.priceRange,
    },
    transformedFilters: { filters: facets.filters, priceRange: facets.priceRange },
  };
}

export async function getCollectionAfterItemPage(params: {
  handle: string;
  locale?: CommerceLocale;
}): Promise<CollectionAfterItemPage | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag("collections", `collection-${params.handle}`);

  return fetchCollectionAfterItemPage(params);
}

// The Storefront API has no collection total, so sum the availability facet (in stock + out of stock).
// Falls back to search totalCount when that filter isn't enabled in Search & Discovery.
export async function getCollectionProductCount(params: { handle: string }): Promise<number> {
  "use cache";
  cacheLife("hours");
  cacheTag("collections", `collection-${params.handle}`);

  const { filters } = await fetchCollectionProducts({ collection: params.handle, limit: 1 });
  const availability = filters.find((f) => /availab/i.test(`${f.id} ${f.paramKey} ${f.label}`));
  const summed = availability?.values.reduce((sum, v) => sum + v.count, 0) ?? 0;
  if (summed > 0) return summed;

  try {
    const { total } = await fetchSearchFacets({ collection: params.handle });
    return total;
  } catch {
    return 0;
  }
}

export async function getCollectionSubCollections(params: {
  handle: string;
  locale?: CommerceLocale;
}): Promise<CollectionWithThumbnail[]> {
  "use cache";
  cacheLife("max");
  cacheTag("collections", `collection-${params.handle}`);

  const subCollections = await fetchCollectionSubCollections(params);
  tagCollections(subCollections);
  tagProducts(
    subCollections.flatMap((collection) =>
      collection.thumbnailProductId ? [{ id: collection.thumbnailProductId }] : [],
    ),
  );
  return subCollections;
}
