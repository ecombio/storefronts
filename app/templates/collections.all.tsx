// app/templates/collections.all.tsx

import {useState} from 'react';
import type {FormEvent} from 'react';
import type {Route} from './+types/collections.all';
import {Link, useLocation, useNavigate, useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import type {
  ProductFilter,
  Filter,
} from '@shopify/hydrogen/storefront-api-types';
import type {ComponentProps, ChangeEvent} from 'react';
import {buildSelfCanonicalUrl} from '~/lib/canonical';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductCard} from '~/snippets/ProductCard';
import type {ProductCardFragment} from 'storefrontapi.generated';

// Products per page (mirrors the `pageBy` passed to getPaginationVariables).
const PAGE_BY = 48;
// How many page numbers we're willing to make directly clickable.
// Capped so MAX_PAGE_LINKS * PAGE_BY stays under the Storefront API's
// 250-item-per-connection limit.
const MAX_PAGE_LINKS = 5;

// Shopify auto-generates an "All products" collection with this handle on
// every store. The Storefront API's root `products` field does NOT accept
// a `filters` argument (faceted filtering is scoped to a collection's
// products connection) — so /collections/all queries this collection
// instead of the root field, same pattern as collections.$handle.tsx.
const ALL_PRODUCTS_COLLECTION_HANDLE = 'all';

const FILTER_URL_PARAM_NAME = 'filter';
const PAGINATION_PARAM_NAMES = ['cursor', 'direction', 'p'];

interface SortOption {
  value: string;
  label: string;
  sortKey: string;
  reverse: boolean;
}

const SORT_OPTIONS: SortOption[] = [
  {value: 'relevance', label: 'Relevance', sortKey: 'RELEVANCE', reverse: false},
  {value: 'best-selling', label: 'Best selling', sortKey: 'BEST_SELLING', reverse: false},
  {value: 'price-asc', label: 'Price: Low to High', sortKey: 'PRICE', reverse: false},
  {value: 'price-desc', label: 'Price: High to Low', sortKey: 'PRICE', reverse: true},
  {value: 'newest', label: 'Newest', sortKey: 'CREATED', reverse: true},
];

const DEFAULT_SORT = 'relevance';

type ProductsConnection = ComponentProps<
  typeof PaginatedResourceSection<ProductCardFragment>
>['connection'];

/**
 * Each selected filter is its own `filter` URL param, JSON-encoded to
 * match the Storefront API's ProductFilter input shape directly (same
 * encoding as collections.$handle.tsx — shareable, works without JS).
 */
function parseFiltersFromUrl(url: URL): ProductFilter[] {
  return url.searchParams
    .getAll(FILTER_URL_PARAM_NAME)
    .map((rawFilter) => {
      try {
        return JSON.parse(rawFilter) as ProductFilter;
      } catch {
        return null;
      }
    })
    .filter((filter): filter is ProductFilter => filter !== null);
}

function parseSort(url: URL): SortOption {
  const value = url.searchParams.get('sort');
  return (
    SORT_OPTIONS.find((s) => s.value === value) ??
    SORT_OPTIONS.find((s) => s.value === DEFAULT_SORT)!
  );
}

function resetPagination(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  PAGINATION_PARAM_NAMES.forEach((name) => next.delete(name));
  return next;
}

function toggleFilterParam(filterInput: string, params: URLSearchParams) {
  const newParams = new URLSearchParams(params);
  const currentFilters = newParams.getAll(FILTER_URL_PARAM_NAME);

  newParams.delete(FILTER_URL_PARAM_NAME);

  if (currentFilters.includes(filterInput)) {
    currentFilters
      .filter((existing) => existing !== filterInput)
      .forEach((existing) => newParams.append(FILTER_URL_PARAM_NAME, existing));
  } else {
    currentFilters.forEach((existing) => newParams.append(FILTER_URL_PARAM_NAME, existing));
    newParams.append(FILTER_URL_PARAM_NAME, filterInput);
  }

  return newParams;
}

interface ParsedPriceFilter {
  price?: {min?: number; max?: number};
}

function isPriceFilter(rawFilter: string): boolean {
  try {
    return Boolean((JSON.parse(rawFilter) as ParsedPriceFilter)?.price);
  } catch {
    return false;
  }
}

function getExistingPriceFilter(
  params: URLSearchParams,
): ParsedPriceFilter | undefined {
  return params
    .getAll(FILTER_URL_PARAM_NAME)
    .map((rawFilter) => {
      try {
        return JSON.parse(rawFilter) as ParsedPriceFilter;
      } catch {
        return null;
      }
    })
    .find((parsed): parsed is ParsedPriceFilter => Boolean(parsed?.price));
}

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Hydrogen | All Products`},
    ...(data?.canonicalUrl
      ? [{tagName: 'link', rel: 'canonical', href: data.canonicalUrl}]
      : []),
    ...(data?.shouldNoIndex
      ? [{name: 'robots', content: 'noindex, follow'}]
      : []),
  ];
};

export async function loader({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {
    pageBy: PAGE_BY,
  });

  const filters = parseFiltersFromUrl(url);
  const sort = parseSort(url);
  const shouldNoIndex = filters.length > 0;

  const canonicalUrl = buildSelfCanonicalUrl(request, {
    keepParams: ['cursor', 'direction', 'p', 'sort'],
    dropDefaultValues: {sort: DEFAULT_SORT},
  });

  const [{collection}, pageCursorsResult] = await Promise.all([
    storefront.query(CATALOG_QUERY, {
      variables: {
        handle: ALL_PRODUCTS_COLLECTION_HANDLE,
        ...paginationVariables,
        filters,
        sortKey: sort.sortKey,
        reverse: sort.reverse,
      },
    }),
    // Lightweight lookahead query (cursors only) that powers the numbered
    // page links — see buildPageCursors below. Uses the same filter/sort
    // so page counts reflect the filtered set.
    storefront.query(PRODUCTS_PAGE_CURSORS_QUERY, {
      variables: {
        handle: ALL_PRODUCTS_COLLECTION_HANDLE,
        first: MAX_PAGE_LINKS * PAGE_BY,
        filters,
        sortKey: sort.sortKey,
        reverse: sort.reverse,
      },
    }),
  ]);

  if (!collection) {
    throw new Response(
      `Collection "${ALL_PRODUCTS_COLLECTION_HANDLE}" not found — check ALL_PRODUCTS_COLLECTION_HANDLE in collections.all.tsx matches your store's actual "all products" collection handle.`,
      {status: 404},
    );
  }

  const {pageCursors, totalKnownPages, hasMoreBeyondKnownPages} =
    buildPageCursors(
      pageCursorsResult.collection?.products.edges ?? [],
      pageCursorsResult.collection?.products.pageInfo?.hasNextPage ?? false,
    );

  return {
    products: collection.products,
    canonicalUrl,
    shouldNoIndex,
    pageCursors,
    totalKnownPages,
    hasMoreBeyondKnownPages,
    availableFilters: collection.products.filters,
    sort: sort.value,
  };
}

/**
 * Turns a flat list of item cursors into a "page number -> cursor" map
 * for the numbered pagination links.
 *
 * A page is only added if there's at least one item *beyond* its starting
 * boundary — otherwise, when the result count is an exact multiple of
 * PAGE_BY, this would produce a phantom trailing page with zero products.
 */
function buildPageCursors(
  edges: Array<{cursor: string}>,
  hasNextPage: boolean,
): {
  pageCursors: Record<number, string>;
  totalKnownPages: number;
  hasMoreBeyondKnownPages: boolean;
} {
  const pageCursors: Record<number, string> = {};

  for (let page = 2; page <= MAX_PAGE_LINKS; page++) {
    const boundary = (page - 1) * PAGE_BY;
    if (edges.length <= boundary) break; // nothing left for this page
    pageCursors[page] = edges[boundary - 1].cursor;
  }

  const totalKnownPages = 1 + Object.keys(pageCursors).length;
  const hasMoreBeyondKnownPages =
    hasNextPage && edges.length === MAX_PAGE_LINKS * PAGE_BY;

  return {pageCursors, totalKnownPages, hasMoreBeyondKnownPages};
}

export default function CollectionAll() {
  const {
    products,
    pageCursors,
    totalKnownPages,
    hasMoreBeyondKnownPages,
    availableFilters,
    sort,
  } = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1 className="collection-title">All Products</h1>

      <div className="collection-layout">
        <InlineCollectionFilters filters={availableFilters} />
        <InlineCollectionFeed
          products={products}
          sort={{value: sort, options: SORT_OPTIONS}}
          pageCursors={pageCursors}
          totalKnownPages={totalKnownPages}
          hasMoreBeyondKnownPages={hasMoreBeyondKnownPages}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feed — inlined directly in this file (no shared CollectionFeed import).
// No activeTab/articles here since /collections/all has no tab switcher;
// see snippets/CollectionFeed.tsx for the tabbed version used by
// collections.$handle.tsx.
// ---------------------------------------------------------------------------

function InlineCollectionFeed({
  products,
  sort,
  pageCursors,
  totalKnownPages,
  hasMoreBeyondKnownPages,
}: {
  products: ProductsConnection;
  sort: {value: string; options: SortOption[]};
  pageCursors?: Record<number, string>;
  totalKnownPages?: number;
  hasMoreBeyondKnownPages?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = resetPagination(new URLSearchParams(location.search));
    params.set('sort', event.target.value);
    navigate(`${location.pathname}?${params.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  }

  return (
    <div className="collection-feed">
      <div className="collection-feed__sort">
        <label htmlFor="product-sort">Sort by</label>
        <select id="product-sort" value={sort.value} onChange={handleSortChange}>
          {sort.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <PaginatedResourceSection<ProductCardFragment>
        connection={products}
        resourcesClassName="products-grid"
        pageCursors={pageCursors}
        totalKnownPages={totalKnownPages}
        hasMoreBeyondKnownPages={hasMoreBeyondKnownPages}
      >
        {({node: product, index}) => (
          <ProductCard
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
            showVendor={false}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter UI — inlined directly in this file (no shared CollectionFilter
// import), same class names / structure the CSS already targets.
// ---------------------------------------------------------------------------

function InlineCollectionFilters({filters}: {filters: Filter[]}) {
  if (!filters?.length) {
    return null;
  }

  return (
    <aside id="collection-filters" className="collection-filters" aria-label="Filters">
      <div className="collection-filters__scroll">
        <div className="collection-filters__header">
          <h2 className="collection-filters__title">Filters</h2>
          <InlineClearFiltersLink />
        </div>
        {filters.map((filter, index) =>
          filter.type === 'PRICE_RANGE' ? (
            <InlinePriceRangeFilterGroup
              key={filter.id}
              filter={filter}
              defaultOpen={index === 0}
            />
          ) : (
            <InlineFilterGroup
              key={filter.id}
              filter={filter}
              defaultOpen={index === 0}
            />
          ),
        )}
      </div>
    </aside>
  );
}

function InlineFilterGroup({
  filter,
  defaultOpen,
}: {
  filter: Filter;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collection-filters__group">
      <button
        type="button"
        className="collection-filters__group-header"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <h3 className="collection-filters__group-title">{filter.label}</h3>
        <span
          aria-hidden="true"
          className={
            isOpen
              ? 'collection-filters__toggle-icon collection-filters__toggle-icon--open'
              : 'collection-filters__toggle-icon'
          }
        />
      </button>
      {isOpen && (
        <ul className="collection-filters__values">
          {filter.values.map((value) => (
            <li key={value.id} className="collection-filters__value-item">
              <InlineFilterRow
                filterInput={value.input as string}
                label={value.label}
                count={value.count}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InlineFilterRow({
  filterInput,
  label,
  count,
}: {
  filterInput: string;
  label: string;
  count: number;
}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isActive = params.getAll(FILTER_URL_PARAM_NAME).includes(filterInput);
  const newParams = resetPagination(toggleFilterParam(filterInput, params));

  return (
    <Link
      prefetch="intent"
      preventScrollReset
      replace
      className={
        isActive
          ? 'collection-filters__value collection-filters__value--active'
          : 'collection-filters__value'
      }
      aria-current={isActive ? 'true' : undefined}
      to={`${location.pathname}?${newParams.toString()}`}
    >
      <span className="collection-filters__value-label">{label}</span>
      <span className="collection-filters__value-count">{count}</span>
    </Link>
  );
}

function InlinePriceRangeFilterGroup({
  filter,
  defaultOpen,
}: {
  filter: Filter;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const existingPriceFilter = getExistingPriceFilter(params);

  const [min, setMin] = useState(existingPriceFilter?.price?.min?.toString() ?? '');
  const [max, setMax] = useState(existingPriceFilter?.price?.max?.toString() ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newParams = new URLSearchParams(params);
    const nonPriceFilters = newParams
      .getAll(FILTER_URL_PARAM_NAME)
      .filter((rawFilter) => !isPriceFilter(rawFilter));
    newParams.delete(FILTER_URL_PARAM_NAME);
    nonPriceFilters.forEach((rawFilter) => newParams.append(FILTER_URL_PARAM_NAME, rawFilter));

    if (min || max) {
      let minNum = min ? Number(min) : undefined;
      let maxNum = max ? Number(max) : undefined;

      // Guard against a reversed range (min > max) rather than silently
      // returning zero matches.
      if (minNum !== undefined && maxNum !== undefined && minNum > maxNum) {
        [minNum, maxNum] = [maxNum, minNum];
        setMin(String(minNum));
        setMax(String(maxNum));
      }

      const price: {min?: number; max?: number} = {};
      if (minNum !== undefined) price.min = minNum;
      if (maxNum !== undefined) price.max = maxNum;
      newParams.append(FILTER_URL_PARAM_NAME, JSON.stringify({price}));
    }

    const resetParams = resetPagination(newParams);

    navigate(`${location.pathname}?${resetParams.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  }

  return (
    <div className="collection-filters__group">
      <button
        type="button"
        className="collection-filters__group-header"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <h3 className="collection-filters__group-title">{filter.label}</h3>
        <span
          aria-hidden="true"
          className={
            isOpen
              ? 'collection-filters__toggle-icon collection-filters__toggle-icon--open'
              : 'collection-filters__toggle-icon'
          }
        />
      </button>
      {isOpen && (
        <form className="collection-filters__price-range" onSubmit={handleSubmit}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Min"
            aria-label={`Minimum ${filter.label}`}
            className="collection-filters__price-input"
            value={min}
            onChange={(event) => setMin(event.target.value)}
          />
          <span aria-hidden="true" className="collection-filters__price-separator">
            &ndash;
          </span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Max"
            aria-label={`Maximum ${filter.label}`}
            className="collection-filters__price-input"
            value={max}
            onChange={(event) => setMax(event.target.value)}
          />
          <button type="submit" className="collection-filters__price-submit">
            Go
          </button>
        </form>
      )}
    </div>
  );
}

function InlineClearFiltersLink() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hasActiveFilters = params.getAll(FILTER_URL_PARAM_NAME).length > 0;

  if (!hasActiveFilters) {
    return null;
  }

  const newParams = resetPagination(new URLSearchParams(params));
  newParams.delete(FILTER_URL_PARAM_NAME);

  return (
    <Link
      prefetch="intent"
      preventScrollReset
      replace
      className="collection-filters__clear"
      to={`${location.pathname}?${newParams.toString()}`}
    >
      Clear all
    </Link>
  );
}

// ---------------------------------------------------------------------------
// GraphQL — queries the "all products" Collection (not the root `products`
// field, which doesn't accept a `filters` argument on this store's API).
// ---------------------------------------------------------------------------

const CATALOG_QUERY = `#graphql
  query Catalog(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
      ) {
        nodes {
          ...ProductCard
        }
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

/**
 * Cursors only, but takes the same filters/sortKey/reverse as CATALOG_QUERY
 * so the numbered page links reflect the filtered set.
 */
const PRODUCTS_PAGE_CURSORS_QUERY = `#graphql
  query ProductsPageCursors(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: $first, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
        edges {
          cursor
          node {
            id
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
` as const;