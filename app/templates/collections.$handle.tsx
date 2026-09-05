// app/templates/collections.$handle.tsx

import {useEffect, useRef, useState} from 'react';
import type {ChangeEvent, FormEvent, ReactNode} from 'react';
import {Link, redirect, useLoaderData, useLocation, useNavigate} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import type {Filter, ProductFilter} from '@shopify/hydrogen/storefront-api-types';
import type {
  ArticleItemFragment,
  ProductCardFragment,
  SubCollectionItemFragment,
} from 'storefrontapi.generated';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {buildSelfCanonicalUrl} from '~/lib/canonical';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';
import {ARTICLE_ITEM_FRAGMENT} from '~/graphql/ArticleItemFragment';
import {PaginationSection} from '~/components/pagination';
import type {PaginationConnection} from '~/components/pagination';
import {ProductCard} from '~/snippets/ProductCard';
import {ArticleItem} from '~/snippets/ArticleItem';
import {SubCollections} from '~/snippets/SubCollections';
import {PromoCarousel} from '~/snippets/PromoCarousel';
import type {SponsoredAdsData} from '~/snippets/PromoCarousel';
import {PromoBanner} from '~/snippets/PromoBanner';
import type {PromoBannerData} from '~/snippets/PromoBanner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILTER_URL_PARAM_NAME = 'filter';
const TAB_URL_PARAM_NAME = 'tab';
const PAGINATION_PARAM_NAMES = ['cursor', 'direction', 'p'];

type CollectionTab = 'products' | 'articles';
const VALID_TABS: CollectionTab[] = ['products', 'articles'];
const DEFAULT_TAB: CollectionTab = 'products';

const TABS: {id: CollectionTab; label: string}[] = [
  {id: 'products', label: 'Products'},
  {id: 'articles', label: 'Expert Advice'},
];

const DEFAULT_SPONSORED_ADS_GRID_POSITION = 4;

// Deliberately different from the carousel's default position so two
// unconfigured in-feed items don't collide out of the box — a banner
// reads naturally as a top-of-grid hero, so it defaults to the very
// first slot rather than sharing the carousel's mid-grid default.
const DEFAULT_PROMO_BANNER_GRID_POSITION = 0;

// Products per page (mirrors the `pageBy` passed to getPaginationVariables).
const PAGE_BY = 48;

type CollectionBannerTextAlignment = 'left' | 'center' | 'right';

// Allowed values for the CollectionBanner text-alignment metafield —
// anything else (unset, mistyped in Admin, etc.) falls through to
// CollectionBanner's own default rather than being passed through as an
// invalid prop.
const TEXT_ALIGNMENTS: CollectionBannerTextAlignment[] = [
  'left',
  'center',
  'right',
];

type ProductsConnection = PaginationConnection<ProductCardFragment>;

interface FeedSortOption {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

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

  const {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {handle, filters, ...paginationVariables},
    // Add other queries here, so that they are loaded in parallel
  });

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {
    collection,
    activeTab,
    canonicalUrl,
    shouldNoIndex,
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

/**
 * Clamps a metafield's raw string value to an integer in [min, max].
 * Returns undefined (letting a component fall back to its own default)
 * for anything missing or non-numeric. Used by both the sponsored-ads
 * and promo-banner grid-position metafields above.
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

function resetPagination(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  PAGINATION_PARAM_NAMES.forEach((name) => next.delete(name));
  return next;
}

// ---------------------------------------------------------------------------
// Route component
// ---------------------------------------------------------------------------

export default function Collection() {
  const {collection, activeTab} = useLoaderData<typeof loader>();

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
  // sponsored panel spliced into the products grid — see CollectionFeed ->
  // ~/snippets/PromoCarousel.tsx. Every field below is optional;
  // PromoCarousel itself renders nothing if promoCard or products end up
  // empty.
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

  // "custom.promo_banner" is a single metaobject_reference metafield
  // (promo_banner type), confirmed live in Admin with fields: image,
  // link_url, grid_position, and layout (a metaobject_reference to a
  // separate "Layout Variant" metaobject — see PROMO_BANNER_FRAGMENT's
  // FIELD-KEY NOTE below for why `variant` requires an extra hop).
  // heading, subheading, link_text, background_color, and text_alignment
  // do not exist as fields in Admin yet, so those resolve to null until
  // added — PromoBanner.tsx already handles all of these safely as
  // optional. Rendered as a full-row grid item spliced into the products
  // grid — see CollectionFeed -> ~/snippets/PromoBanner.tsx.
  // PromoBanner itself renders nothing if heading and image are both
  // missing, so this is always safe to pass through unconditionally.
  const promoBannerRef = collection.promoBannerMetafield?.reference ?? null;
  const promoBanner: PromoBannerData | null = promoBannerRef
    ? {
        id: promoBannerRef.id,
        // Two-hop reference resolved via LAYOUT_VARIANT_FRAGMENT below:
        // promo_banner.layout -> Layout Variant metaobject entry -> that
        // entry's own `variant` field, which holds the actual string
        // ('split-left' | 'split-right' | 'full-bleed' | 'minimal').
        // Falls back to null (and PromoBanner.tsx's toEnum then falls
        // back to 'split-left') if the reference or nested field is
        // unset on a given entry.
        variant: promoBannerRef.variant?.reference?.variant?.value ?? null,
        heading: promoBannerRef.heading?.value ?? null,
        subheading: promoBannerRef.subheading?.value ?? null,
        image: promoBannerRef.image?.reference?.image ?? null,
        linkText: promoBannerRef.linkText?.value ?? null,
        linkUrl: promoBannerRef.linkUrl?.value ?? null,
        backgroundColor: promoBannerRef.backgroundColor?.value ?? null,
        textAlignment: promoBannerRef.textAlignment?.value ?? null,
        // Same [0, PAGE_BY - 1] convention as sponsoredAds.position above.
        position:
          toClampedInt(promoBannerRef.position?.value, 0, PAGE_BY - 1) ?? null,
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

      {/* SubCollections renders inside CollectionFeed, as a row above the
          products grid (products panel only), instead of as its own section
          here. sponsoredAds and promoBanner are passed through the same
          way: CollectionFeed splices them into the products grid itself
          (see products-grid__promo-item / products-grid__banner-item), so
          neither is rendered standalone above the banner. */}
      <div className="main-collection">
        <CollectionToolbar activeTab={activeTab} />

        <div className="collection-layout">
          <CollectionFilter filters={collection.products.filters} />

          <div className="collection-feed">
            <CollectionFeed
              activeTab={activeTab}
              products={collection.products}
              articles={articles}
              subCollections={subCollections}
              sponsoredAds={sponsoredAds}
              promoBanner={promoBanner}
            />
          </div>
        </div>
      </div>

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

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

interface CollectionBannerProps {
  title: string;
  descriptionHtml?: string | null;
  /** Default: 'left'. */
  textAlignment?: CollectionBannerTextAlignment;
}

/**
 * Collection page banner: title + rich-text description, text-only.
 */
function CollectionBanner({
  title,
  descriptionHtml,
  textAlignment = 'left',
}: CollectionBannerProps) {
  return (
    <div
      id="collection-banner"
      className={`collection-banner collection-banner--text-${textAlignment}`}
    >
      <div className="collection-banner__text">
        <h1 className="collection-title">{title}</h1>
        {descriptionHtml && (
          <div
            className="collection-description rte"
            dangerouslySetInnerHTML={{__html: descriptionHtml}}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar (tab switcher)
// ---------------------------------------------------------------------------

function CollectionToolbar({activeTab}: {activeTab: CollectionTab}) {
  const location = useLocation();
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        '--toolbar-height',
        `${entry.contentRect.height}px`,
      );
    });
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={toolbarRef}
      className="collection-toolbar sticky-under-header"
      role="navigation"
      aria-label="Collection navigation"
    >
      <div className="tab-switcher" role="tablist" aria-label="Collection view">
        {TABS.map((tab) => {
          const params = resetPagination(new URLSearchParams(location.search));
          params.set(TAB_URL_PARAM_NAME, tab.id);
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              to={`${location.pathname}?${params.toString()}`}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              prefetch="intent"
              preventScrollReset
              replace
              className={
                isActive
                  ? 'tab-switcher__tab tab-switcher__tab--active'
                  : 'tab-switcher__tab'
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function CollectionFilter({filters}: {filters: Filter[]}) {
  if (!filters?.length) {
    return null;
  }

  return (
    <aside id="collection-filters" className="collection-filters" aria-label="Filters">
      <div className="collection-filters__scroll">
        <div className="collection-filters__header">
          <h2 className="collection-filters__title">Filters</h2>
          <ClearFiltersLink />
        </div>
        {filters.map((filter, index) =>
          filter.type === 'PRICE_RANGE' ? (
            <PriceRangeFilterGroup
              key={filter.id}
              filter={filter}
              defaultOpen={index === 0}
            />
          ) : (
            <FilterGroup
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

function FilterGroup({
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
              <FilterRow
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

function FilterRow({
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

function PriceRangeFilterGroup({
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

  useEffect(() => {
    setMin(existingPriceFilter?.price?.min?.toString() ?? '');
    setMax(existingPriceFilter?.price?.max?.toString() ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPriceFilter?.price?.min, existingPriceFilter?.price?.max]);

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

function ClearFiltersLink() {
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

// ---------------------------------------------------------------------------
// Feed (tab panels / product grid)
// ---------------------------------------------------------------------------

interface CollectionFeedProps {
  /**
   * Omit on routes with no tab switcher (e.g. /collections/all) — the
   * product grid then renders directly, with no tabpanel wrapper and no
   * articles panel. Pass it (as this route does) to get the
   * Products/Expert Advice tabpanel behavior.
   */
  activeTab?: CollectionTab;
  products: ProductsConnection;
  /** Only relevant when `activeTab` is provided. */
  articles?: ArticleItemFragment[];
  /**
   * Rendered as its own row above the products grid. On routes with a tab
   * switcher (`activeTab` provided), only shown on the products panel —
   * never on articles.
   */
  subCollections?: SubCollectionItemFragment[];
  /**
   * Spliced into the products grid itself as an in-feed sponsored item
   * rather than rendered as a separate row. Only appears on the products
   * panel — never on articles. PromoCarousel renders nothing when
   * sponsoredAds/promoCard/products are missing or empty, so this is
   * always safe to pass through unconditionally.
   */
  sponsoredAds?: SponsoredAdsData | null;
  /**
   * Rendered as its own full-row grid item, same in-feed splice pattern
   * as sponsoredAds. Only appears on the products panel — never on
   * articles. If both sponsoredAds and promoBanner resolve to the same
   * grid position, both render at that slot — banner first, then
   * carousel (see buildInFeedItems). PromoBanner renders nothing when
   * heading and image are both missing, so this is always safe to pass
   * through unconditionally.
   */
  promoBanner?: PromoBannerData | null;
  /**
   * Omit to render with no sort dropdown. Pass `{value, options}` to show
   * one — selecting an option resets pagination and updates the `sort`
   * URL param.
   */
  sort?: {
    value: string;
    options: FeedSortOption[];
  };
}

/**
 * A single spliced-in item (promo banner, promo carousel, or any future
 * in-feed type) at a specific 0-based grid index. `buildInFeedItems`
 * produces a flat list of these; `CollectionFeed`'s renderItem then
 * filters by index per product rather than checking one hardcoded
 * position at a time, so this scales past two item types without another
 * rewrite of the splice logic itself.
 */
interface InFeedItem {
  position: number;
  /**
   * Tie-break order when two items resolve to the same position — lower
   * renders first. Keeping this explicit (rather than relying on the
   * order items happen to be pushed in buildInFeedItems) means the
   * banner-before-carousel rule survives even if that function is later
   * reordered for unrelated reasons.
   */
  order: number;
  /**
   * Takes the React key rather than having a wrapper applied around the
   * result — the returned element (products-grid__banner-item /
   * products-grid__promo-item) must land as a DIRECT child of
   * .products-grid for its `grid-column: 1 / -1` + `min-width: 0` rules
   * to apply. Any extra wrapping div here is not a grid item and has
   * neither rule, which reintroduces the exact min-content grid-blowout
   * bug documented in promo-carousel.css's file header (one column
   * force-widened to its content's min-content size, squeezing/
   * distorting the rest of the grid).
   */
  render: (key: string) => ReactNode;
}

/**
 * Builds the flat, position-keyed list of items to splice into the
 * products grid. On a position collision (both items resolve to the same
 * index), both render at that slot, ordered by `order` — currently
 * banner (0) before carousel (1) — immediately before the product that
 * would otherwise occupy that index.
 */
function buildInFeedItems({
  promoBanner,
  sponsoredAds,
}: {
  promoBanner?: PromoBannerData | null;
  sponsoredAds?: SponsoredAdsData | null;
}): InFeedItem[] {
  const items: InFeedItem[] = [];

  if (promoBanner) {
    items.push({
      position: promoBanner.position ?? DEFAULT_PROMO_BANNER_GRID_POSITION,
      order: 0,
      render: (key) => (
        <div className="products-grid__banner-item" key={key}>
          <PromoBanner banner={promoBanner} />
        </div>
      ),
    });
  }

  if (sponsoredAds) {
    items.push({
      position: sponsoredAds.position ?? DEFAULT_SPONSORED_ADS_GRID_POSITION,
      order: 1,
      render: (key) => (
        <div className="products-grid__promo-item" key={key}>
          <PromoCarousel sponsoredAds={sponsoredAds} />
        </div>
      ),
    });
  }

  return items;
}

function CollectionFeed({
  activeTab,
  products,
  articles = [],
  subCollections = [],
  sponsoredAds,
  promoBanner,
  sort,
}: CollectionFeedProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const inFeedItems = buildInFeedItems({promoBanner, sponsoredAds});

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(location.search);
    params.delete('cursor');
    params.delete('direction');
    params.delete('p');
    params.set('sort', event.target.value);
    navigate(`${location.pathname}?${params.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  }

  const productGrid = (
    <>
      {sort && (
        <div className="collection-feed__sort">
          <label htmlFor="product-sort">Sort by</label>
          <select
            id="product-sort"
            value={sort.value}
            onChange={handleSortChange}
          >
            {sort.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <PaginationSection<ProductCardFragment>
        connection={products}
        itemsClassName="products-grid"
        renderItem={(product, index) => (
          <>
            {inFeedItems
              .filter((item) => item.position === index)
              .sort((a, b) => a.order - b.order)
              .map((item, i) => item.render(`in-feed-${index}-${i}`))}
            <ProductCard
              product={product}
              loading={index < 8 ? 'eager' : undefined}
              showVendor={false}
            />
          </>
        )}
      />
    </>
  );

  if (!activeTab) {
    return (
      <div className="collection-feed">
        {subCollections.length > 0 && (
          <SubCollections collections={subCollections} />
        )}
        {productGrid}
      </div>
    );
  }

  return (
    <>
      <div
        id="panel-products"
        role="tabpanel"
        aria-labelledby="tab-products"
        hidden={activeTab !== 'products'}
      >
        {subCollections.length > 0 && (
          <SubCollections collections={subCollections} />
        )}
        {productGrid}
      </div>

      <div
        id="panel-articles"
        role="tabpanel"
        aria-labelledby="tab-articles"
        hidden={activeTab !== 'articles'}
      >
        {articles.length ? (
          <div className="article-feed">
            {articles.map((article, index) => (
              <ArticleItem
                key={article.id}
                article={article}
                loading={index < 8 ? 'eager' : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="collection-empty">No articles found.</p>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

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
          products(first: 8) {
            nodes {
              ...ProductCard
            }
          }
        }
      }
    }
  }
` as const;

// FIELD-KEY NOTE: `promo_banner` metaobject fields confirmed live in
// Admin as of this pass: image, link_url, grid_position, layout. heading,
// subheading, link_text, background_color, and text_alignment do NOT
// exist yet — those fragment fields below will simply resolve to null
// until added in Admin, which the loader and PromoBanner.tsx both
// already handle safely as optional.
//
// `layout` is a metaobject_reference field pointing at a separate
// "Layout Variant" metaobject definition (NOT a plain string field), so
// getting the actual variant string ('split-left' | 'split-right' |
// 'full-bleed' | 'minimal') takes an extra hop: promo_banner.layout ->
// Layout Variant metaobject entry -> that entry's own `variant` field.
// LAYOUT_VARIANT_FRAGMENT resolves that second hop; aliased back to
// `variant` here so nothing downstream (the loader mapping in the route
// component above, PromoBanner.tsx's toEnum call) needs to know about
// the extra hop at all.
const LAYOUT_VARIANT_FRAGMENT = `#graphql
  fragment LayoutVariantValue on Metaobject {
    variant: field(key: "variant") {
      value
    }
  }
` as const;

const PROMO_BANNER_FRAGMENT = `#graphql
  ${LAYOUT_VARIANT_FRAGMENT}
  fragment PromoBanner on Metaobject {
    id
    variant: field(key: "layout") {
      reference {
        ... on Metaobject {
          ...LayoutVariantValue
        }
      }
    }
    heading: field(key: "heading") {
      value
    }
    subheading: field(key: "subheading") {
      value
    }
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
    linkText: field(key: "link_text") {
      value
    }
    linkUrl: field(key: "link_url") {
      value
    }
    backgroundColor: field(key: "background_color") {
      value
    }
    textAlignment: field(key: "text_alignment") {
      value
    }
    position: field(key: "grid_position") {
      value
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  ${ARTICLE_ITEM_FRAGMENT}
  ${SUB_COLLECTION_ITEM_FRAGMENT}
  ${SPONSORED_ADS_FRAGMENT}
  ${PROMO_BANNER_FRAGMENT}
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
      promoBannerMetafield: metafield(namespace: "custom", key: "promo_banner") {
        reference {
          ... on Metaobject {
            ...PromoBanner
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