// app/templates/collections.all.tsx

import type {Route} from './+types/collections.all';
import {useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {buildSelfCanonicalUrl} from '~/lib/canonical';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';
import {
  CollectionFilters,
  buildSearchQuery,
  parseFilters,
  SORT_OPTIONS,
  DEFAULT_SORT,
} from '~/sections/CollectionFilters';
import {ProductFeed} from '~/sections/ProductFeed';

// Products per page (mirrors the `pageBy` passed to getPaginationVariables).
const PAGE_BY = 48;
// How many page numbers we're willing to make directly clickable.
// Capped so MAX_PAGE_LINKS * PAGE_BY stays under the Storefront API's
// 250-item-per-connection limit.
const MAX_PAGE_LINKS = 5;

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Hydrogen | All Products`},
    ...(data?.canonicalUrl
      ? [{tagName: 'link', rel: 'canonical', href: data.canonicalUrl}]
      : []),
  ];
};

export async function loader({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {
    pageBy: PAGE_BY,
  });

  const filters = parseFilters(url);
  const searchQuery = buildSearchQuery(filters);
  const sort =
    SORT_OPTIONS.find((s) => s.value === filters.sort) ??
    SORT_OPTIONS.find((s) => s.value === DEFAULT_SORT)!;

  const canonicalUrl = buildSelfCanonicalUrl(request, {
    keepParams: [
      'cursor',
      'direction',
      'p',
      'q',
      'price_min',
      'price_max',
      'availability',
      'sort',
    ],
    dropDefaultValues: {sort: DEFAULT_SORT},
  });

  const [{products}, pageCursorsResult] = await Promise.all([
    storefront.query(CATALOG_QUERY, {
      variables: {
        ...paginationVariables,
        query: searchQuery || undefined,
        sortKey: sort.sortKey,
        reverse: sort.reverse,
      },
    }),
    // Lightweight lookahead query (cursors only) that powers the numbered
    // page links — see buildPageCursors below. Uses the same filter/sort
    // so page counts reflect the filtered set.
    storefront.query(PRODUCTS_PAGE_CURSORS_QUERY, {
      variables: {
        first: MAX_PAGE_LINKS * PAGE_BY,
        query: searchQuery || undefined,
        sortKey: sort.sortKey,
        reverse: sort.reverse,
      },
    }),
  ]);

  const {pageCursors, totalKnownPages, hasMoreBeyondKnownPages} =
    buildPageCursors(
      pageCursorsResult.products?.edges ?? [],
      pageCursorsResult.products?.pageInfo?.hasNextPage ?? false,
    );

  return {
    products,
    canonicalUrl,
    pageCursors,
    totalKnownPages,
    hasMoreBeyondKnownPages,
    filters,
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
    filters,
  } = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1 className="collection-title">All Products</h1>

      <div className="collection-layout">
        <CollectionFilters filters={filters} />
        <ProductFeed
          products={products}
          currentSort={filters.sort}
          pageCursors={pageCursors}
          totalKnownPages={totalKnownPages}
          hasMoreBeyondKnownPages={hasMoreBeyondKnownPages}
        />
      </div>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/products
const CATALOG_QUERY = `#graphql
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $query: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      query: $query
      sortKey: $sortKey
      reverse: $reverse
    ) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

/**
 * Cursors only, but takes the same query/sortKey/reverse as CATALOG_QUERY
 * so the numbered page links reflect the filtered set.
 */
const PRODUCTS_PAGE_CURSORS_QUERY = `#graphql
  query ProductsPageCursors(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $query: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
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
` as const;