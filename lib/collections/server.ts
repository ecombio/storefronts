import { parseCollectionParams, serializeCollectionParams } from "@shopify/hydrogen";
import { cacheLife, cacheTag } from "next/cache";

import { getBrowseSort, PRODUCTS_PER_PAGE } from "@/lib/collections";
import type {
  Collection,
  CollectionAfterItemPage,
  CollectionWithThumbnail,
} from "@/lib/collections/types";
import type { CommerceLocale } from "@/lib/config/types";
import { withProductRatings } from "@/lib/product/ratings";
import { tagProducts } from "@/lib/product/server";
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
}: {
  handle: string;
  searchStatePromise: Promise<CollectionSearchState>;
}): Promise<CollectionResultsData> {
  const { dataSearch, filters, sort } = await searchStatePromise;
  const result = await fetchCollectionProducts({
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
