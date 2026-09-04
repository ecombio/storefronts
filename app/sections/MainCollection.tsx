// app/sections/MainCollection.tsx

import {useEffect, useRef, useState} from 'react';
import type {ChangeEvent, FormEvent} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import type {Filter} from '@shopify/hydrogen/storefront-api-types';
import type {
  ArticleItemFragment,
  ProductCardFragment,
  SubCollectionItemFragment,
} from 'storefrontapi.generated';
import {PaginationSection} from '~/components/pagination';
import type {PaginationConnection} from '~/components/pagination';
import {ProductCard} from '~/snippets/ProductCard';
import {ArticleItem} from '~/snippets/ArticleItem';
import {SubCollections} from '~/snippets/SubCollections';
import {PromoCarousel} from '~/snippets/PromoCarousel';
import type {SponsoredAdsData} from '~/snippets/PromoCarousel';

const TAB_PARAM_NAME = 'tab';
const FILTER_URL_PARAM_NAME = 'filter';

const PAGINATION_PARAM_NAMES = ['cursor', 'direction', 'p'];

export type CollectionTab = 'products' | 'articles';

const TABS: {id: CollectionTab; label: string}[] = [
  {id: 'products', label: 'Products'},
  {id: 'articles', label: 'Expert Advice'},
];

const DEFAULT_SPONSORED_ADS_GRID_POSITION = 4;

export type ProductsConnection = PaginationConnection<ProductCardFragment>;

export interface FeedSortOption {
  value: string;
  label: string;
}

function resetPagination(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  PAGINATION_PARAM_NAMES.forEach((name) => next.delete(name));
  return next;
}

// ---------------------------------------------------------------------------
// Banner — inlined from the former app/sections/CollectionBanner.tsx.
// ---------------------------------------------------------------------------

export type CollectionBannerTextAlignment = 'left' | 'center' | 'right';

interface CollectionBannerProps {
  title: string;
  descriptionHtml?: string | null;
  /** Default: 'left'. */
  textAlignment?: CollectionBannerTextAlignment;
}

/**
 * Collection page banner: title + rich-text description, text-only.
 */
export function CollectionBanner({
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

interface MainCollectionProps {
  activeTab: CollectionTab;
  filters: Filter[];
  products: ProductsConnection;
  articles: ArticleItemFragment[];
  /** Rendered as a row above the products grid, products panel only. */
  subCollections?: SubCollectionItemFragment[];
  /** Rendered as a row above the products grid, products panel only. */
  sponsoredAds?: SponsoredAdsData | null;
}

export function MainCollection({
  activeTab,
  filters,
  products,
  articles,
  subCollections,
  sponsoredAds,
}: MainCollectionProps) {
  return (
    <div className="main-collection">
      <CollectionToolbar activeTab={activeTab} />

      <div className="collection-layout">
        <CollectionFilter filters={filters} />

        <div className="collection-feed">
          <CollectionFeed
            activeTab={activeTab}
            products={products}
            articles={articles}
            subCollections={subCollections}
            sponsoredAds={sponsoredAds}
          />
        </div>
      </div>
    </div>
  );
}

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
          params.set(TAB_PARAM_NAME, tab.id);
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

interface CollectionFeedProps {
  /**
   * Omit on routes with no tab switcher (e.g. /collections/all) — the
   * product grid then renders directly, with no tabpanel wrapper and no
   * articles panel. Pass it (as MainCollection does) to get the
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
   * Omit to render with no sort dropdown. Pass `{value, options}` to show
   * one — selecting an option resets pagination and updates the `sort`
   * URL param.
   */
  sort?: {
    value: string;
    options: FeedSortOption[];
  };
}

function CollectionFeed({
  activeTab,
  products,
  articles = [],
  subCollections = [],
  sponsoredAds,
  sort,
}: CollectionFeedProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const sponsoredAdsPosition =
    sponsoredAds?.position ?? DEFAULT_SPONSORED_ADS_GRID_POSITION;

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
            {sponsoredAds && index === sponsoredAdsPosition && (
              <div className="products-grid__promo-item">
                <PromoCarousel sponsoredAds={sponsoredAds} />
              </div>
            )}
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