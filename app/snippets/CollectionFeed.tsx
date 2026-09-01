// app/snippets/CollectionFeed.tsx

import type {ComponentProps} from 'react';
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

interface CollectionFeedProps {
  activeTab: CollectionTab;
  products: ProductsConnection;
  articles: ArticleItemFragment[];
  /** Precomputed "page number -> cursor" map for numbered pagination links; see collections.$handle.tsx. */
  pageCursors?: Record<number, string>;
  /** How many page numbers can be linked to directly. */
  totalKnownPages?: number;
  /** Whether pages exist beyond `totalKnownPages` (shown as an ellipsis). */
  hasMoreBeyondKnownPages?: boolean;
}

export function CollectionFeed({
  activeTab,
  products,
  articles,
  pageCursors,
  totalKnownPages,
  hasMoreBeyondKnownPages,
}: CollectionFeedProps) {
  return (
    <>
      <div
        id="panel-products"
        role="tabpanel"
        aria-labelledby="tab-products"
        hidden={activeTab !== 'products'}
      >
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