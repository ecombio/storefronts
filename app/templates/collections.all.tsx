// app/templates/collections.all.tsx

import type {Route} from './+types/collections.all';
import {useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {buildSelfCanonicalUrl} from '~/lib/canonical';
import {MainCollection, type CollectionTab} from '~/sections/MainCollection';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';
import {ARTICLE_ITEM_FRAGMENT} from '~/graphql/ArticleItemFragment';
import type {
  ProductCardFragment,
  ArticleItemFragment,
} from 'storefrontapi.generated';

const TAB_URL_PARAM_NAME = 'tab';
const VALID_TABS: CollectionTab[] = ['products', 'articles'];
const DEFAULT_TAB: CollectionTab = 'products';

// Products per page (mirrors the `pageBy` passed to getPaginationVariables).
const PAGE_BY = 48;
// How many page numbers we're willing to make directly clickable — same
// rationale as collections.$handle.tsx. Capped so MAX_PAGE_LINKS * PAGE_BY
// stays under the Storefront API's 250-item-per-connection limit.
const MAX_PAGE_LINKS = 5;
// How many articles to pull for the Articles tab. This is a flat,
// unpaginated fetch across every blog in the shop (see note on ARTICLES_QUERY
// below), so keep it modest.
const ARTICLES_COUNT = 20;

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Hydrogen | All Products`},
    ...(data?.canonicalUrl
      ? [{tagName: 'link', rel: 'canonical', href: data.canonicalUrl}]
      : []),
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront} = context;
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {
    pageBy: PAGE_BY,
  });
  const activeTab = parseActiveTab(url);
  const canonicalUrl = buildSelfCanonicalUrl(request, {
    keepParams: [TAB_URL_PARAM_NAME, 'cursor', 'direction', 'p'],
    dropDefaultValues: {[TAB_URL_PARAM_NAME]: DEFAULT_TAB},
  });

  const [{products}, pageCursorsResult, {articles}] = await Promise.all([
    storefront.query(CATALOG_QUERY, {
      variables: {...paginationVariables},
    }),
    // Lightweight lookahead query (cursors only) that powers the numbered
    // page links — see buildPageCursors below. Same pattern as
    // collections.$handle.tsx, minus the `filters` argument: the root-level
    // `products` query has no structured ProductFilter input (only a
    // free-text `query` string), so there's no facet sidebar on this page
    // for now.
    storefront.query(PRODUCTS_PAGE_CURSORS_QUERY, {
      variables: {first: MAX_PAGE_LINKS * PAGE_BY},
    }),
    // Always fetched alongside products (not just when the Articles tab is
    // active) so switching tabs never has to wait on a second round trip —
    // same reasoning as collections.$handle.tsx's postsMetafield.
    storefront.query(ARTICLES_QUERY, {
      variables: {first: ARTICLES_COUNT},
    }),
  ]);

  const {pageCursors, totalKnownPages, hasMoreBeyondKnownPages} =
    buildPageCursors(
      pageCursorsResult.products?.edges ?? [],
      pageCursorsResult.products?.pageInfo?.hasNextPage ?? false,
    );

  return {
    products,
    articles: articles.nodes,
    activeTab,
    canonicalUrl,
    pageCursors,
    totalKnownPages,
    hasMoreBeyondKnownPages,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData(_args: Route.LoaderArgs) {
  return {};
}

/**
 * Same pattern as collections.$handle.tsx: `?tab=` param, shareable and
 * works without JS. Falls back to 'products' for anything missing/invalid.
 */
function parseActiveTab(url: URL): CollectionTab {
  const tab = url.searchParams.get(TAB_URL_PARAM_NAME);
  return (VALID_TABS as string[]).includes(tab ?? '')
    ? (tab as CollectionTab)
    : DEFAULT_TAB;
}

/**
 * Identical logic to collections.$handle.tsx's buildPageCursors — turns a
 * flat list of item cursors into a "page number -> cursor" map for the
 * numbered pagination links. Not shared/imported since collections.$handle.tsx
 * doesn't currently export it; duplicated here to keep this route
 * self-contained.
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
    const edge = edges[(page - 1) * PAGE_BY - 1];
    if (!edge) break;
    pageCursors[page] = edge.cursor;
  }

  const totalKnownPages = 1 + Object.keys(pageCursors).length;
  const hasMoreBeyondKnownPages =
    hasNextPage && edges.length === MAX_PAGE_LINKS * PAGE_BY;

  return {pageCursors, totalKnownPages, hasMoreBeyondKnownPages};
}

export default function CollectionAll() {
  const {
    products,
    articles,
    activeTab,
    pageCursors,
    totalKnownPages,
    hasMoreBeyondKnownPages,
  } = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1 className="collection-title">All Products</h1>
      <MainCollection
        activeTab={activeTab}
        // No facet sidebar yet — see the comment on PRODUCTS_PAGE_CURSORS_QUERY
        // above for why (root `products` query has no ProductFilter input).
        filters={[]}
        products={products}
        articles={articles}
        pageCursors={pageCursors}
        totalKnownPages={totalKnownPages}
        hasMoreBeyondKnownPages={hasMoreBeyondKnownPages}
      />
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
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
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
 * Deliberately minimal, mirroring COLLECTION_PAGE_CURSORS_QUERY in
 * collections.$handle.tsx: cursors only, no filters argument (root
 * `products` has none to pass).
 */
const PRODUCTS_PAGE_CURSORS_QUERY = `#graphql
  query ProductsPageCursors(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
  ) @inContext(country: $country, language: $language) {
    products(first: $first) {
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

/**
 * Root-level `articles` query — pulls the newest articles across every
 * blog in the shop, unlike collections.$handle.tsx's Articles tab (which
 * reads a single collection's `custom.posts` metafield reference list).
 * Flat/unpaginated by design; see ARTICLES_COUNT above.
 */
const ARTICLES_QUERY = `#graphql
  query AllArticles(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
  ) @inContext(country: $country, language: $language) {
    articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
      nodes {
        ...ArticleItem
      }
    }
  }
  ${ARTICLE_ITEM_FRAGMENT}
` as const;