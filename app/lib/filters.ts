// app/lib/filters.ts
import type {
  Filter,
  ProductFilter,
} from '@shopify/hydrogen/storefront-api-types';

/**
 * FILTER PARAM STRATEGY
 * ---------------------
 * Every list/boolean filter Shopify's Search & Discovery app exposes
 * (Product Type, Fit, Pattern, Features, Colour, Size, etc.) already
 * comes back from the Storefront API as a ready-to-use JSON string on
 * `Filter.values[].input`. Rather than writing custom parsing per
 * field, we round-trip that string verbatim through a repeated
 * `filter` search param:
 *
 *   ?filter=%7B%22productType%22%3A%22Hoodie%22%7D&filter=%7B...%7D
 *
 * This means adding a brand-new metafield-backed filter in Shopify
 * admin (e.g. "Sleeve Length") requires zero code changes here — it
 * just starts appearing.
 *
 * Price is the one exception: it's a numeric range the shopper picks
 * freely, not a fixed value from a list, so it gets its own pair of
 * plain params: `price.min` / `price.max`.
 */

const FILTER_PARAM = 'filter';

/** Parses every repeated `filter` param back into a ProductFilter. */
export function getGenericFiltersFromParams(
  searchParams: URLSearchParams,
): ProductFilter[] {
  const filters: ProductFilter[] = [];
  for (const value of searchParams.getAll(FILTER_PARAM)) {
    try {
      filters.push(JSON.parse(value) as ProductFilter);
    } catch {
      // Ignore a malformed/tampered filter param instead of failing the page.
    }
  }
  return filters;
}

/** Builds a `{price: {min, max}}` ProductFilter from price.min/price.max. */
export function getPriceFilterFromParams(
  searchParams: URLSearchParams,
): ProductFilter | null {
  const min = searchParams.get('price.min');
  const max = searchParams.get('price.max');
  if (!min && !max) return null;
  return {
    price: {
      ...(min ? {min: Number(min)} : {}),
      ...(max ? {max: Number(max)} : {}),
    },
  };
}

/** Everything the loader needs to pass as the `filters` GraphQL variable. */
export function getAllFiltersFromParams(
  searchParams: URLSearchParams,
): ProductFilter[] {
  const priceFilter = getPriceFilterFromParams(searchParams);
  return [
    ...getGenericFiltersFromParams(searchParams),
    ...(priceFilter ? [priceFilter] : []),
  ];
}

/** The exact strings currently applied — used to render checked state. */
export function getAppliedFilterInputs(searchParams: URLSearchParams): string[] {
  return searchParams.getAll(FILTER_PARAM);
}

/**
 * Returns a new URLSearchParams with the given filter value toggled
 * on/off, and pagination cleared (changing filters must reset to the
 * first page).
 */
export function toggleFilterParams(
  searchParams: URLSearchParams,
  input: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const values = next.getAll(FILTER_PARAM);
  next.delete(FILTER_PARAM);

  let removed = false;
  for (const value of values) {
    if (value === input) {
      removed = true;
      continue;
    }
    next.append(FILTER_PARAM, value);
  }
  if (!removed) next.append(FILTER_PARAM, input);

  next.delete('cursor');
  next.delete('direction');
  return next;
}

/** Clears every filter, the price range, and sort — but not the base path. */
export function clearAllFilters(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.delete(FILTER_PARAM);
  next.delete('price.min');
  next.delete('price.max');
  next.delete('sort');
  next.delete('cursor');
  next.delete('direction');
  return next;
}

export type SortParam =
  | 'price-low-high'
  | 'price-high-low'
  | 'best-selling'
  | 'newest'
  | 'relevance';

export const SORT_OPTIONS: {label: string; value: SortParam}[] = [
  {label: 'Relevancy', value: 'relevance'},
  {label: 'Price: Low to High', value: 'price-low-high'},
  {label: 'Price: High to Low', value: 'price-high-low'},
  {label: 'Best Selling', value: 'best-selling'},
  {label: 'Newest', value: 'newest'},
];

/** Maps our short URL-friendly sort param to the real Storefront API enum. */
export function getSortValuesFromParam(sortParam: SortParam | null): {
  sortKey: 'PRICE' | 'BEST_SELLING' | 'CREATED' | 'RELEVANCE';
  reverse: boolean;
} {
  switch (sortParam) {
    case 'price-high-low':
      return {sortKey: 'PRICE', reverse: true};
    case 'price-low-high':
      return {sortKey: 'PRICE', reverse: false};
    case 'best-selling':
      return {sortKey: 'BEST_SELLING', reverse: false};
    case 'newest':
      return {sortKey: 'CREATED', reverse: true};
    case 'relevance':
    default:
      return {sortKey: 'RELEVANCE', reverse: false};
  }
}

/** Re-export so components don't need to import from storefront-api-types directly. */
export type {Filter, ProductFilter};
