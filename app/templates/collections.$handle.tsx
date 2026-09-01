// app/templates/collections.$handle.tsx

import {useEffect, useRef} from 'react';
import type {CSSProperties} from 'react';
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {buildSelfCanonicalUrl} from '~/lib/canonical';
import {SubCollections} from '~/sections/SubCollections';
import {MainCollection, type CollectionTab} from '~/sections/MainCollection';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';
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

// ---------------------------------------------------------------------------
// CollectionBanner
//
// Title + rich-text description, with an optional image column (the
// collection's own image) plus overlay/position/height/alignment/parallax
// styling. Every image-related prop is optional — a collection with no
// image and no styling metafields set renders exactly a plain text-only
// banner.
//
// `image`/`descriptionHtml` come straight off the Collection object. The
// styling props (overlay, position, height, alignment, parallax) come from
// collection metafields since a headless storefront has no theme
// customizer to expose those as merchant-editable section settings.
//
// Inlined here (rather than living in ~/sections/) since this route is its
// only consumer — see app/assets/collection-banner.css for the matching
// styles, still shared/imported globally in app/root.tsx.
// ---------------------------------------------------------------------------

interface CollectionBannerImage {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

type CollectionBannerImagePosition = 'left' | 'right';
type CollectionBannerImageHeight =
  | 'extra_small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra_large';
type CollectionBannerTextAlignment = 'left' | 'center' | 'right';
type CollectionBannerParallaxDirection = 'vertical' | 'horizontal';

interface CollectionBannerProps {
  title: string;
  descriptionHtml?: string | null;
  /** The collection's native image. Omitting it renders the original text-only banner. */
  image?: CollectionBannerImage | null;
  /** 0-100. Darkens the image so overlaid text stays legible. Default: 0 (no overlay). */
  imageOverlayOpacity?: number;
  /** Which side the image sits on at desktop widths. Default: 'right'. */
  imagePosition?: CollectionBannerImagePosition;
  /** Controls the banner's min-height at desktop widths. Default: 'extra_small'. */
  imageHeight?: CollectionBannerImageHeight;
  /** Default: 'left' (matches the original text-only banner's layout). */
  textAlignment?: CollectionBannerTextAlignment;
  /** Default: false. Automatically skipped for visitors who prefer reduced motion. */
  enableParallax?: boolean;
  /** Default: 'vertical'. Only applies when `enableParallax` is true. */
  parallaxDirection?: CollectionBannerParallaxDirection;
}

const BANNER_HEIGHT_PX: Record<CollectionBannerImageHeight, number> = {
  extra_small: 320,
  small: 400,
  medium: 480,
  large: 560,
  extra_large: 640,
};

function CollectionBanner({
  title,
  descriptionHtml,
  image,
  imageOverlayOpacity = 0,
  imagePosition = 'right',
  imageHeight = 'extra_small',
  textAlignment = 'left',
  enableParallax = false,
  parallaxDirection = 'vertical',
}: CollectionBannerProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const hasImage = Boolean(image?.url);

  useEffect(() => {
    if (!hasImage || !enableParallax) return;

    const el = parallaxRef.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Parallax is a desktop-only embellishment — skip below the `lg`
    // breakpoint both to avoid mobile scroll jank and because the image
    // column collapses to a static stacked block there anyway.
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    if (!desktopQuery.matches) return;

    let rafId = 0;

    function update() {
      rafId = 0;
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      // Distance of the banner's center from the viewport's center,
      // scaled down so the image drifts a few percent rather than
      // tracking scroll 1:1.
      const offset = (viewportCenter - elementCenter) * 0.08;

      el.style.transform =
        parallaxDirection === 'horizontal'
          ? `translateX(${offset}px)`
          : `translateY(${offset}px)`;
    }

    function onScrollOrResize() {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScrollOrResize, {passive: true});
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [hasImage, enableParallax, parallaxDirection]);

  const style = hasImage
    ? ({
        '--collection-banner-height': `${BANNER_HEIGHT_PX[imageHeight]}px`,
      } as CSSProperties)
    : undefined;

  const className = hasImage
    ? `collection-banner collection-banner--has-image collection-banner--image-${imagePosition} collection-banner--text-${textAlignment}`
    : `collection-banner collection-banner--text-${textAlignment}`;

  return (
    <div className={className} id="collection-banner" style={style}>
      <div className="collection-banner__text">
        <h1 className="collection-title">{title}</h1>
        {descriptionHtml && (
          <div
            className="collection-description rte"
            dangerouslySetInnerHTML={{__html: descriptionHtml}}
          />
        )}
      </div>

      {hasImage && (
        <div className="collection-banner__image-wrap">
          <div ref={parallaxRef} className="collection-banner__image-parallax">
            <img
              className="collection-banner__image"
              src={image!.url}
              alt={image!.altText ?? ''}
              width={image!.width ?? undefined}
              height={image!.height ?? undefined}
              loading="eager"
              fetchPriority="high"
            />
          </div>
          {imageOverlayOpacity > 0 && (
            <div
              className="collection-banner__image-overlay"
              style={{opacity: imageOverlayOpacity / 100}}
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
}

// Allowed values for the CollectionBanner styling metafields — anything
// else (unset, mistyped in Admin, etc.) falls through to CollectionBanner's
// own defaults rather than being passed through as an invalid prop.
const IMAGE_POSITIONS: CollectionBannerImagePosition[] = ['left', 'right'];
const IMAGE_HEIGHTS: CollectionBannerImageHeight[] = [
  'extra_small',
  'small',
  'medium',
  'large',
  'extra_large',
];
const TEXT_ALIGNMENTS: CollectionBannerTextAlignment[] = [
  'left',
  'center',
  'right',
];
const PARALLAX_DIRECTIONS: CollectionBannerParallaxDirection[] = [
  'vertical',
  'horizontal',
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
 * Clamps a metafield's raw string value to an integer in [min, max].
 * Returns undefined (letting CollectionBanner fall back to its own
 * default) for anything missing or non-numeric.
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

  // CollectionBanner's image and description come straight off the native
  // Collection object — no metafield needed. Only the *styling* around
  // that image needs metafields (see comment above CollectionBanner).
  // Every value below is optional and falls back to CollectionBanner's own
  // defaults, so a collection with none of these metafields set renders
  // the original plain text-only banner unchanged.
  const bannerOverlayOpacity = toClampedInt(
    collection.bannerOverlayOpacityMetafield?.value,
    0,
    100,
  );
  const bannerImagePosition = toEnum(
    collection.bannerImagePositionMetafield?.value,
    IMAGE_POSITIONS,
  );
  const bannerImageHeight = toEnum(
    collection.bannerImageHeightMetafield?.value,
    IMAGE_HEIGHTS,
  );
  const bannerTextAlignment = toEnum(
    collection.bannerTextAlignmentMetafield?.value,
    TEXT_ALIGNMENTS,
  );
  const bannerEnableParallax =
    collection.bannerParallaxEnabledMetafield?.value === 'true';
  const bannerParallaxDirection = toEnum(
    collection.bannerParallaxDirectionMetafield?.value,
    PARALLAX_DIRECTIONS,
  );

  return (
    <div className="collection">
      <CollectionBanner
        title={collection.title}
        descriptionHtml={collection.descriptionHtml}
        image={collection.image}
        imageOverlayOpacity={bannerOverlayOpacity}
        imagePosition={bannerImagePosition}
        imageHeight={bannerImageHeight}
        textAlignment={bannerTextAlignment}
        enableParallax={bannerEnableParallax}
        parallaxDirection={bannerParallaxDirection}
      />

      {/* Collection-level content, not part of the products/articles feed —
          rendered as its own section directly below the banner rather than
          inside MainCollection. */}
      <SubCollections collections={subCollections} />

      <MainCollection
        activeTab={activeTab}
        filters={collection.products.filters}
        products={collection.products}
        articles={articles}
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

const ARTICLE_ITEM_FRAGMENT = `#graphql
  fragment ArticleItem on Article {
    id
    handle
    title
    excerpt
    publishedAt
    blog {
      handle
    }
    image {
      id
      url
      altText
      width
      height
    }
    readingTime: metafield(namespace: "custom", key: "reading_time") {
      value
    }
  }
` as const;

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

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  ${ARTICLE_ITEM_FRAGMENT}
  ${SUB_COLLECTION_ITEM_FRAGMENT}
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
      image {
        id
        url
        altText
        width
        height
      }
      bannerOverlayOpacityMetafield: metafield(namespace: "custom", key: "banner_overlay_opacity") {
        value
      }
      bannerImagePositionMetafield: metafield(namespace: "custom", key: "banner_image_position") {
        value
      }
      bannerImageHeightMetafield: metafield(namespace: "custom", key: "banner_image_height") {
        value
      }
      bannerTextAlignmentMetafield: metafield(namespace: "custom", key: "banner_text_alignment") {
        value
      }
      bannerParallaxEnabledMetafield: metafield(namespace: "custom", key: "banner_enable_parallax") {
        value
      }
      bannerParallaxDirectionMetafield: metafield(namespace: "custom", key: "banner_parallax_direction") {
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