// app/snippets/CollectionFeed.tsx

import type {ComponentProps, ChangeEvent} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductCard} from '~/snippets/ProductCard';
import {ArticleItem} from '~/snippets/ArticleItem';
import type {
  ProductCardFragment,
  ArticleItemFragment,
} from 'storefrontapi.generated';
import type {CollectionTab} from '~/sections/MainCollection';

export type ProductsConnection = ComponentProps<
  typeof PaginatedResourceSection<ProductCardFragment>
>['connection'];

export interface FeedSortOption {
  value: string;
  label: string;
}

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
   * Omit to render with no sort dropdown (collections.$handle.tsx doesn't
   * currently offer one). Pass `{value, options}` to show one — selecting
   * an option resets pagination and updates the `sort` URL param.
   */
  sort?: {
    value: string;
    options: FeedSortOption[];
  };
  /** Precomputed "page number -> cursor" map for numbered pagination links. */
  pageCursors?: Record<number, string>;
  /** How many page numbers can be linked to directly. */
  totalKnownPages?: number;
  /** Whether pages exist beyond `totalKnownPages` (shown as an ellipsis). */
  hasMoreBeyondKnownPages?: boolean;
}

export function CollectionFeed({
  activeTab,
  products,
  articles = [],
  sort,
  pageCursors,
  totalKnownPages,
  hasMoreBeyondKnownPages,
}: CollectionFeedProps) {
  const location = useLocation();
  const navigate = useNavigate();

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(location.search);
    // Any sort change alters ordering, so pagination state from the old
    // ordering is no longer valid — same reasoning as resetPagination
    // elsewhere in this route family.
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
    </>
  );

  // No activeTab means this route has no tab switcher (/collections/all) —
  // render the grid directly. No tabpanel semantics, no articles markup.
  if (!activeTab) {
    return <div className="collection-feed">{productGrid}</div>;
  }

  return (
    <>
      <div
        id="panel-products"
        role="tabpanel"
        aria-labelledby="tab-products"
        hidden={activeTab !== 'products'}
      >
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