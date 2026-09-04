// app/snippets/CollectionFeed.tsx

import type {ChangeEvent} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {PaginationSection} from '~/components/pagination';
import type {PaginationConnection} from '~/components/pagination';
import {ProductCard} from '~/snippets/ProductCard';
import {ArticleItem} from '~/snippets/ArticleItem';
import {SubCollections} from '~/snippets/SubCollections';
import {PromoCarousel} from '~/snippets/PromoCarousel';
import type {SponsoredAdsData} from '~/snippets/PromoCarousel';
import type {
  ProductCardFragment,
  ArticleItemFragment,
  SubCollectionItemFragment,
} from 'storefrontapi.generated';
import type {CollectionTab} from '~/sections/MainCollection';

export type ProductsConnection = PaginationConnection<ProductCardFragment>;

export interface FeedSortOption {
  value: string;
  label: string;
}

// Fallback 0-based position within the accumulated product list where the
// sponsored panel is spliced in — used only when the promo_carousel
// metaobject's "Grid Position" field is unset for a given collection.
// With Load More accumulating nodes rather than replacing them per page,
// this applies ONCE across the whole growing list, not once per page.
const DEFAULT_SPONSORED_ADS_GRID_POSITION = 4;

interface CollectionFeedProps {
  /**
   * Omit on routes with no tab switcher (e.g. /collections/all) — the
   * product grid then renders directly, with no tabpanel wrapper and no
   * articles panel. Pass it (as on collections.$handle.tsx, via
   * MainCollection) to get the Products/Expert Advice tabpanel behavior.
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
  /**
   * @deprecated No longer used — pagination renders a single accumulating
   * "Load more" button instead of numbered page links, so arbitrary
   * page-jumping no longer applies. Left in the prop type so
   * collections.$handle.tsx (which still computes and passes these)
   * doesn't need to change. Ask if you'd like the now-unused server-side
   * lookahead queries (buildPageCursors, COLLECTION_PAGE_CURSORS_QUERY)
   * removed too — they still run on every request for nothing.
   */
  pageCursors?: Record<number, string>;
  /** @deprecated See pageCursors above. */
  totalKnownPages?: number;
  /** @deprecated See pageCursors above. */
  hasMoreBeyondKnownPages?: boolean;
}

export function CollectionFeed({
  activeTab,
  products,
  articles = [],
  subCollections = [],
  sponsoredAds,
  sort,
}: CollectionFeedProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Merchant-set via the promo_carousel metaobject's "Grid Position" field
  // when present; otherwise falls back to the sitewide default above.
  const sponsoredAdsPosition =
    sponsoredAds?.position ?? DEFAULT_SPONSORED_ADS_GRID_POSITION;

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(location.search);
    // Any sort change alters ordering, so pagination state from the old
    // ordering is no longer valid.
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

      {/*
        PaginationSection (app/components/pagination.tsx) handles the
        accumulating list, the eager-load-first-8 behavior, and the Load
        more button + infinite-scroll trigger — same shared component used
        by collections.all.tsx and blogs.$blogHandle.tagged.$tag.tsx.

        renderItem is called with the index within the FULL accumulated
        list (not per-page), which is what lets the sponsored promo panel
        splice in ONCE across the whole list rather than once per page.
      */}
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

  // No activeTab means this route has no tab switcher (/collections/all) —
  // render the grid directly. No tabpanel semantics, no articles markup.
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
