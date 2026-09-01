// app/sections/MainCollection.tsx

import {useEffect, useRef, useState} from 'react';
import type {ComponentProps, FormEvent} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import type {Filter} from '@shopify/hydrogen/storefront-api-types';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/snippets/ProductItem';
import {ArticleItem} from '~/snippets/ArticleItem';
import {SubCollections} from '~/sections/SubCollections';
import type {
  ProductItemFragment,
  ArticleItemFragment,
  SubCollectionItemFragment,
} from 'storefrontapi.generated';

const TAB_PARAM_NAME = 'tab';
const FILTER_URL_PARAM_NAME = 'filter';

export type CollectionTab = 'products' | 'articles';

const TABS: {id: CollectionTab; label: string}[] = [
  {id: 'products', label: 'Products'},
  {id: 'articles', label: 'Expert Advice'},
];

type ProductsConnection = ComponentProps<
  typeof PaginatedResourceSection<ProductItemFragment>
>['connection'];

interface MainCollectionProps {
  activeTab: CollectionTab;
  filters: Filter[];
  products: ProductsConnection;
  subCollections: SubCollectionItemFragment[];
  articles: ArticleItemFragment[];
}

/**
 * The tab-switcher + filters + feed unit for a collection page —
 * everything below the hero and above the after-items block.
 *
 * Previously split across CollectionToolbar.tsx, CollectionFilters.tsx,
 * and CollectionFeed.tsx (each still below as an internal function) —
 * inlined into one file since all three only ever render together, in
 * this exact nesting, for this one page. Note: CollectionFeed was
 * originally written generic (usable for search results or a related-
 * products feed too) — that reusability goes away with this merge
 * unless it's pulled back out into its own file later.
 */
export function MainCollection({
  activeTab,
  filters,
  products,
  subCollections,
  articles,
}: MainCollectionProps) {
  return (
    <>
      <CollectionToolbar activeTab={activeTab} />

      <div className="collection-layout">
        <CollectionFilters filters={filters} />

        <div className="collection-feed">
          <CollectionFeed
            activeTab={activeTab}
            products={products}
            subCollections={subCollections}
            articles={articles}
          />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CollectionToolbar                                                   */
/* ------------------------------------------------------------------ */

/**
 * Tab switcher between a collection's product grid and its linked
 * articles (from the collection's `custom.posts` metafield). Tab
 * state lives in the `?tab=` URL param, same pattern CollectionFilters
 * uses for its own params, so it's shareable and needs no client JS.
 *
 * `sticky-under-header` (app/assets/sticky-header.css) sticks this
 * below the header and closes the gap when the header hides on
 * scroll. On top of that, this component measures its OWN rendered
 * height via ResizeObserver and writes it to `--toolbar-height` on
 * <html> — CollectionFilters reads that var to stick itself below
 * the toolbar rather than underneath/behind it. Without this, the
 * filter panel and the toolbar both compute their sticky offset from
 * only the header's height and end up overlapping once both are
 * stuck (toolbar tabs rendering on top of the filter's "Filters"
 * heading).
 */
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
          const params = new URLSearchParams(location.search);
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

/* ------------------------------------------------------------------ */
/* CollectionFilters                                                   */
/* ------------------------------------------------------------------ */

function CollectionFilters({filters}: {filters: Filter[]}) {
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
        {filters.map((filter) =>
          filter.type === 'PRICE_RANGE' ? (
            <PriceRangeFilterGroup key={filter.id} filter={filter} />
          ) : (
            <FilterGroup key={filter.id} filter={filter} />
          ),
        )}
      </div>
    </aside>
  );
}

/**
 * A single facet group (Availability, Category, Brand, Type, etc.) rendered
 * as a collapsible list of rows, one per filter value. Selecting a row
 * inverts it to solid black/white rather than checking a box.
 */
function FilterGroup({filter}: {filter: Filter}) {
  const [isOpen, setIsOpen] = useState(true);

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
  const newParams = toggleFilterParam(filterInput, params);

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

/**
 * PRICE_RANGE filters don't have a fixed set of values like other filter
 * types do — they need a min/max input instead of a row list.
 */
function PriceRangeFilterGroup({filter}: {filter: Filter}) {
  const [isOpen, setIsOpen] = useState(true);
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
      const price: {min?: number; max?: number} = {};
      if (min) price.min = Number(min);
      if (max) price.max = Number(max);
      newParams.append(FILTER_URL_PARAM_NAME, JSON.stringify({price}));
    }

    navigate(`${location.pathname}?${newParams.toString()}`, {
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

  const newParams = new URLSearchParams(params);
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

/**
 * Toggles a single filter input in/out of the existing `filter` params,
 * leaving all other params (pagination cursors, other filters, etc.)
 * untouched.
 */
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

/* ------------------------------------------------------------------ */
/* CollectionFeed                                                      */
/* ------------------------------------------------------------------ */

/**
 * The tabbed content area for a collection page: the paginated product
 * grid (plus any sub-collections) for the "Products" tab, and the
 * article list for the "Expert Advice" tab.
 */
function CollectionFeed({
  activeTab,
  products,
  subCollections,
  articles,
}: {
  activeTab: CollectionTab;
  products: ProductsConnection;
  subCollections: SubCollectionItemFragment[];
  articles: ArticleItemFragment[];
}) {
  return (
    <>
      <div
        id="panel-products"
        role="tabpanel"
        aria-labelledby="tab-products"
        hidden={activeTab !== 'products'}
      >
        <SubCollections collections={subCollections} />
        <PaginatedResourceSection<ProductItemFragment>
          connection={products}
          resourcesClassName="products-grid"
        >
          {({node: product, index}) => (
            <ProductItem
              key={product.id}
              product={product}
              loading={index < 8 ? 'eager' : undefined}
            />
          )}
        </PaginatedResourceSection>
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