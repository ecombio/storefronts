// app/templates/collections.$handle.tsx

import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {buildSelfCanonicalUrl} from '~/lib/canonical';
import {
  CollectionBanner,
  MainCollection,
  type CollectionBannerTextAlignment,
  type CollectionTab,
} from '~/sections/MainCollection';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';
import {ARTICLE_ITEM_FRAGMENT} from '~/graphql/ArticleItemFragment';
import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';

const FILTER_URL_PARAM_NAME = 'filter';
const TAB_URL_PARAM_NAME = 'tab';
const VALID_TABS: CollectionTab[] = ['products', 'articles'];
const DEFAULT_TAB: CollectionTab = 'products';

// Products per page (mirrors the `pageBy` passed to getPaginationVariables).
const PAGE_BY = 48;
// How many page numbers we're willing to make directly clickable. Cursor-
// based connections can't jump to an arbitrary page, so we look ahead this
// many pages' worth of cursors up front; beyond this window, users still
// get correct Previous/Next (Hydrogen's Pagination component tracks that
// live), they just can't jump straight to e.g. page 40.
// Capped so MAX_PAGE_LINKS * PAGE_BY stays under the Storefront API's
// 250-item-per-connection limit (5 * 48 = 240).
const MAX_PAGE_LINKS = 5;

// Allowed values for the CollectionBanner text-alignment metafield —
// anything else (unset, mistyped in Admin, etc.) falls through to
// CollectionBanner's own default rather than being passed through as an
// invalid prop.
const TEXT_ALIGNMENTS: CollectionBannerTextAlignment[] = [
  'left',
  'center',
  'right',
];

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Hydrogen | ${data?.collection.title ?? ''} Collection`},
    // Self-referencing canonical: keeps tab/cursor/direction (they change
    // which content is shown) but drops `filter` combinations, so the
    // many possible filter permutations of a collection consolidate to
    // the unfiltered collection URL instead of each being treated as a
    // separate indexable page.
    ...(data?.canonicalUrl
      ? [{tagName: 'link', rel: 'canonical', href: data.canonicalUrl}]
      : []),
    // Canonical alone is only a hint Google may or may not honor. Per
    // Google's own pagination guidance, filter/sort URL variations should
    // additionally be excluded with a noindex meta tag (or robots.txt),
    // not left to canonical consolidation on its own:
    // https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading#avoid-indexing-variations
    // `noindex, follow` keeps link equity flowing through these pages
    // while keeping the filtered variant itself out of the index.
    ...(data?.shouldNoIndex
      ? [{name: 'robots', content: 'noindex, follow'}]
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
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {
    pageBy: PAGE_BY,
  });
  const filters = parseFiltersFromUrl(url);
  const activeTab = parseActiveTab(url);
  const canonicalUrl = buildSelfCanonicalUrl(request, {
    // `p` is PaginatedResourceSection's own display-only page-number param;
    // it's kept here for the same reason as cursor/direction — each page
    // shows different products and should canonicalize to itself.
    keepParams: [TAB_URL_PARAM_NAME, 'cursor', 'direction', 'p'],
    dropDefaultValues: {[TAB_URL_PARAM_NAME]: DEFAULT_TAB},
  });
  // Any active filter means this URL is one of many possible filter
  // permutations of the same underlying collection — exclude it from the
  // index outright rather than relying solely on the canonical hint above.
  const shouldNoIndex = filters.length > 0;

  if (!handle) {
    throw redirect('/collections');
  }

  const [{collection}, pageCursorsResult] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {handle, filters, ...paginationVariables},
      // Add other queries here, so that they are loaded in parallel
    }),
    // Lightweight lookahead query (cursors only, no product fields) that
    // powers the numbered page links — see buildPageCursors below.
    storefront.query(COLLECTION_PAGE_CURSORS_QUERY, {
      variables: {handle, filters, first: MAX_PAGE_LINKS * PAGE_BY},
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  const {pageCursors, totalKnownPages, hasMoreBeyondKnownPages} =
    buildPageCursors(
      pageCursorsResult.collection?.products.edges ?? [],
      pageCursorsResult.collection?.products.pageInfo?.hasNextPage ?? false,
    );

  return {
    collection,
    activeTab,
    canonicalUrl,
    shouldNoIndex,
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
 * Each selected filter is stored as its own `filter` URL param, JSON-encoded
 * to match the Storefront API's `ProductFilter` input shape directly (this
 * is the same encoding Hydrogen's own skeleton template uses, so `?filter=`
 * links are shareable and work without JS).
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

/**
 * The active Products/Expert Advice tab is stored in a `?tab=` URL param,
 * same pattern as the filter params above — shareable and works without JS.
 * Falls back to 'products' for anything missing or invalid.
 */
function parseActiveTab(url: URL): CollectionTab {
  const tab = url.searchParams.get(TAB_URL_PARAM_NAME);
  return (VALID_TABS as string[]).includes(tab ?? '')
    ? (tab as CollectionTab)
    : DEFAULT_TAB;
}

/**
 * Turns a flat list of item cursors (from the lookahead query) into a map
 * of "page number -> cursor to use as the `after` param to load that page
 * directly", plus how many pages we can confidently link to and whether
 * more pages exist beyond that window.
 *
 * Page 1 needs no cursor (it's the default `first: PAGE_BY` fetch), so the
 * map starts at page 2: the cursor for page N is the cursor of the last
 * item on page N-1, i.e. index `(N-1) * PAGE_BY - 1`.
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
  // We only know there's more beyond our window if we actually filled the
  // whole lookahead window AND the API still reports a next page.
  const hasMoreBeyondKnownPages =
    hasNextPage && edges.length === MAX_PAGE_LINKS * PAGE_BY;

  return {pageCursors, totalKnownPages, hasMoreBeyondKnownPages};
}

/**
 * Narrows a metafield's raw string value to one of `allowed`. Returns
 * undefined (letting CollectionBanner fall back to its own default) for
 * anything missing or not in the allowed set.
 */
function toEnum<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.includes(raw as T) ? (raw as T) : undefined;
}

export default function Collection() {
  const {
    collection,
    activeTab,
    pageCursors,
    totalKnownPages,
    hasMoreBeyondKnownPages,
  } = useLoaderData<typeof loader>();

  const articles = (collection.postsMetafield?.references?.nodes ?? []).filter(
    (node): node is NonNullable<typeof node> => Boolean(node),
  );

  const subCollections = (collection.subCollectionsMetafield?.references?.nodes ?? []).filter(
    (node): node is NonNullable<typeof node> => Boolean(node),
  );

  // "custom.after_item_lists" is a single page_reference metafield (confirmed
  // in Shopify Admin: Type = "One" -> "Page"). The referenced Page's body is
  // merchant-authored HTML (same source as Liquid's `page.content`), so it's
  // injected as markup via dangerouslySetInnerHTML, not rendered as text.
  const afterItemsPage = collection.afterItemsMetafield?.reference ?? null;

  // "custom.sponsored_ads" is a single metaobject_reference metafield
  // (promo_carousel type). Its "products" field is itself a single
  // Collection reference (confirmed in Admin: Type = "One" -> "Collection")
  // — NOT a list of individual products — so we pull that collection's
  // own products for the shoppable row. Rendered as an Amazon-style
  // sponsored panel spliced into the products grid — see MainCollection ->
  // CollectionFeed -> ~/snippets/PromoCarousel.tsx. Every field below is
  // optional; PromoCarousel itself renders nothing if promoCard or
  // products end up empty.
  const sponsoredAdsRef = collection.sponsoredAdsMetafield?.reference ?? null;
  const sponsoredAds = sponsoredAdsRef
    ? {
        id: sponsoredAdsRef.id,
        heading: sponsoredAdsRef.heading?.value ?? null,
        subheading: sponsoredAdsRef.subheading?.value ?? null,
        // 0-based index within the current page's product list to splice
        // the panel after (0 = before the first product). Merchant-set via
        // the promo_carousel metaobject's "Grid Position" field; clamped to
        // stay within a single page (PAGE_BY - 1) and falls back to
        // CollectionFeed's own default when unset.
        position: toClampedInt(sponsoredAdsRef.position?.value, 0, PAGE_BY - 1) ?? null,
        promoCard: sponsoredAdsRef.promoCard?.reference
          ? {
              id: sponsoredAdsRef.promoCard.reference.id,
              image:
                sponsoredAdsRef.promoCard.reference.image?.reference?.image ??
                null,
              heading: sponsoredAdsRef.promoCard.reference.heading?.value ?? null,
              linkText:
                sponsoredAdsRef.promoCard.reference.linkText?.value ?? null,
              linkUrl:
                sponsoredAdsRef.promoCard.reference.linkUrl?.value ?? null,
            }
          : null,
        products: sponsoredAdsRef.products?.reference?.products?.nodes ?? [],
      }
    : null;

  // CollectionBanner's description comes straight off the native Collection
  // object — no metafield needed. Only text alignment is merchant-editable,
  // via a metafield, since a headless storefront has no theme customizer to
  // expose it as a section setting the way a native Shopify theme would.
  const bannerTextAlignment = toEnum(
    collection.bannerTextAlignmentMetafield?.value,
    TEXT_ALIGNMENTS,
  );

  return (
    <div className="collection">
      <CollectionBanner
        title={collection.title}
        descriptionHtml={collection.descriptionHtml}
        textAlignment={bannerTextAlignment}
      />

      {/* SubCollections renders inside MainCollection -> CollectionFeed,
          as a row above the products grid (products panel only), instead of
          as its own section here. sponsoredAds is passed through the same
          way: CollectionFeed splices <PromoCarousel /> into the products
          grid itself (see products-grid__promo-item), so it's no longer
          rendered standalone above the banner. */}
      <MainCollection
        activeTab={activeTab}
        filters={collection.products.filters}
        products={collection.products}
        articles={articles}
        subCollections={subCollections}
        sponsoredAds={sponsoredAds}
        pageCursors={pageCursors}
        totalKnownPages={totalKnownPages}
        hasMoreBeyondKnownPages={hasMoreBeyondKnownPages}
      />

      {afterItemsPage?.body && (
        <div
          className="after-items rte"
          dangerouslySetInnerHTML={{__html: afterItemsPage.body}}
        />
      )}

      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

/**
 * Clamps a metafield's raw string value to an integer in [min, max].
 * Returns undefined (letting a component fall back to its own default)
 * for anything missing or non-numeric. Still used by the sponsored-ads
 * grid-position metafield above.
 */
function toClampedInt(
  raw: string | undefined,
  min: number,
  max: number,
): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const SUB_COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment SubCollectionItem on Collection {
    id
    handle
    title
    image {
      id
      url
      altText
      width
      height
    }
  }
` as const;

// Promo Card field keys set to best-guess defaults: image, heading,
// link_text, link_url. If the dev build errors with a GraphQL
// "field not found" naming a different key, swap it in here.
const PROMO_CARD_FRAGMENT = `#graphql
  fragment PromoCard on Metaobject {
    id
    image: field(key: "image") {
      reference {
        ... on MediaImage {
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
    heading: field(key: "heading") {
      value
    }
    linkText: field(key: "link_text") {
      value
    }
    linkUrl: field(key: "link_url") {
      value
    }
  }
` as const;

const SPONSORED_ADS_FRAGMENT = `#graphql
  ${PROMO_CARD_FRAGMENT}
  fragment SponsoredAds on Metaobject {
    id
    heading: field(key: "heading") {
      value
    }
    subheading: field(key: "subheading") {
      value
    }
    position: field(key: "grid_position") {
      value
    }
    promoCard: field(key: "promo_card") {
      reference {
        ... on Metaobject {
          ...PromoCard
        }
      }
    }
    products: field(key: "products") {
      reference {
        ... on Collection {
          id
          handle
          title
          products(first: 6) {
            nodes {
              ...ProductCard
            }
          }
        }
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  ${ARTICLE_ITEM_FRAGMENT}
  ${SUB_COLLECTION_ITEM_FRAGMENT}
  ${SPONSORED_ADS_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      descriptionHtml
      bannerTextAlignmentMetafield: metafield(namespace: "custom", key: "banner_text_alignment") {
        value
      }
      postsMetafield: metafield(namespace: "custom", key: "posts") {
        references(first: 10) {
          nodes {
            ... on Article {
              ...ArticleItem
            }
          }
        }
      }
      subCollectionsMetafield: metafield(namespace: "custom", key: "sub_collections") {
        references(first: 20) {
          nodes {
            ... on Collection {
              ...SubCollectionItem
            }
          }
        }
      }
      afterItemsMetafield: metafield(namespace: "custom", key: "after_item_lists") {
        reference {
          __typename
          ... on Page {
            id
            body
          }
        }
      }
      sponsoredAdsMetafield: metafield(namespace: "custom", key: "sponsored_ads") {
        reference {
          ... on Metaobject {
            ...SponsoredAds
          }
        }
      }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters
      ) {
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
        nodes {
          ...ProductCard
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;

/**
 * Deliberately minimal: fetches only cursors (and the bare-minimum `id`
 * every connection edge needs to select under `node`), not full product
 * fields — this runs alongside the main COLLECTION_QUERY purely to build
 * the numbered-pagination cursor map in buildPageCursors above, so it
 * should stay as cheap as possible even though it fetches more items.
 */
const COLLECTION_PAGE_CURSORS_QUERY = `#graphql
  query CollectionPageCursors(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $first: Int!
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: $first, filters: $filters) {
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