import { Suspense } from "react";

import { ProductCard } from "@/components/product-card/product-card";
import { ProductsGridSkeleton } from "@/components/product/products-grid";
import { PRODUCTS_PER_PAGE } from "@/lib/collections";
import { loadMoreCollectionProductsAction } from "@/lib/collections/action";
import { getFeedItems } from "@/lib/collections/feed-items";
import { ALL_PRODUCTS_HANDLE } from "@/lib/collections/server";
import { type CollectionResultsData } from "@/lib/collections/types";
import { loadMoreSearchProductsAction } from "@/lib/search/action";

import { FeedItemCard } from "./feed-item-card";
import { InfiniteProductGrid } from "./infinite-product-grid";

function Fallback() {
  return (
    <ProductsGridSkeleton
      count={PRODUCTS_PER_PAGE}
      className="sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3"
    />
  );
}

async function Render({
  collectionResultsDataPromise,
  excludeOnSale = false,
}: {
  collectionResultsDataPromise: Promise<CollectionResultsData>;
  excludeOnSale?: boolean;
}) {
  const { collection, dataSearch, result } = await collectionResultsDataPromise;
  const products = result.products;
  if (products.length === 0) {
    return (
      <div className="py-10 text-center">
        <h2 className="mb-2 text-2xl">No products found</h2>
        <p className="text-muted-foreground">No products available</p>
      </div>
    );
  }
  const cards = products.map((product) => (
    <ProductCard key={product.id} product={product} outOfStockText="Out of Stock" />
  ));

  const feedItems = getFeedItems(collection).map((item) => ({
    id: item.id,
    position: item.position,
    width: item.width ?? 1,
    node: <FeedItemCard item={item} />,
  }));

  // /collections/all pagination must use the same search backend as its initial page.
  if (collection === ALL_PRODUCTS_HANDLE) {
    return (
      <InfiniteProductGrid
        key={dataSearch}
        initialProducts={products}
        initialPageInfo={result.pageInfo}
        outOfStockText="Out of Stock"
        loadMore={loadMoreSearchProductsAction}
        feedItems={feedItems}
        gridClassName="sm:grid-cols-3 lg:group-data-[collapsed=true]/browse:grid-cols-4 [&_[data-slot=product-card-image]]:aspect-5/4"
        loadMoreParams={{}}
      >
        {cards}
      </InfiniteProductGrid>
    );
  }
  return (
    <InfiniteProductGrid
      key={dataSearch}
      initialProducts={products}
      initialPageInfo={result.pageInfo}
      outOfStockText="Out of Stock"
      loadMore={loadMoreCollectionProductsAction}
      feedItems={feedItems}
      gridClassName="sm:grid-cols-3 lg:group-data-[collapsed=true]/browse:grid-cols-4 [&_[data-slot=product-card-image]]:aspect-5/4"
      loadMoreParams={{
        collection,
        excludeOnSale,
      }}
    >
      {cards}
    </InfiniteProductGrid>
  );
}

export function CollectionResultsGrid({
  collectionResultsDataPromise,
  excludeOnSale = false,
}: {
  collectionResultsDataPromise: Promise<CollectionResultsData>;
  excludeOnSale?: boolean;
}) {
  return (
    <Suspense fallback={<Fallback />}>
      <Render
        collectionResultsDataPromise={collectionResultsDataPromise}
        excludeOnSale={excludeOnSale}
      />
    </Suspense>
  );
}
