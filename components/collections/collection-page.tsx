import { CollectionReviews, type YotpoCollectionReviewProduct } from "@yotpo";
import Link from "next/link";
import { Suspense } from "react";

import { CollectionViewedTracker } from "@/components/analytics/trackers";
import { CollectionResultsGrid } from "@/components/collections/results-grid";
import { BrowseToolbar } from "@/components/collections/toolbar";
import { ProductCard } from "@/components/product-card/product-card";
import { ProductsGridSkeleton } from "@/components/product/products-grid";
import { BreadcrumbSchema } from "@/components/schema/breadcrumb-schema";
import { CollectionSchema } from "@/components/schema/collection-schema";
import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import type { BlogArticle } from "@/lib/blog/types";
import { PRODUCTS_PER_PAGE } from "@/lib/collections";
import type { CollectionWithThumbnail } from "@/lib/collections/types";
import type {
  CollectionAfterItemPage,
  CollectionResultsData,
  CollectionSearchState,
  Collection,
} from "@/lib/collections/types";
import type { ProductCard as ProductCardType } from "@/lib/product/types";

import { AfterItemList } from "./after-item-list";
import { ArticleGrid } from "./article-grid";
import { CollectionBrowseProvider } from "./collection-browse-provider";
import { CollectionTabs } from "./collection-tabs";
import { DealsCarousel } from "./deals-carousel";
import { FilterPendingScope } from "./filter-pending-context";
import { FilterSidebarLayout } from "./filter-sidebar-layout";
import { CollectionFilters } from "./filters";
import { SubCollectionTiles } from "./sub-collection-tiles";

const BROWSE_LAYOUT = "lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10";
const GRID_COLUMNS = "sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3";

async function AfterItems({
  pagePromise,
}: {
  pagePromise: Promise<CollectionAfterItemPage | undefined>;
}) {
  const page = await pagePromise;
  return page ? <AfterItemList page={page} /> : null;
}

async function Deals({
  dealsPromise,
  title,
}: {
  dealsPromise: Promise<ProductCardType[]>;
  title: string;
}) {
  const deals = await dealsPromise;
  if (deals.length === 0) return null;
  return (
    <DealsCarousel title={title}>
      {deals.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          outOfStockText="Out of Stock"
          className="w-60 shrink-0 snap-start"
        />
      ))}
    </DealsCarousel>
  );
}

async function Reviews({
  productsPromise,
  title,
}: {
  productsPromise: Promise<YotpoCollectionReviewProduct[]>;
  title: string;
}) {
  const products = await productsPromise;
  if (products.length === 0) return null;
  return <CollectionReviews collectionTitle={title} products={products} />;
}

export function CollectionDetailPage({
  afterItemPagePromise,
  articles = [],
  productCount,
  subCollections = [],
  collection,
  collectionResultsDataPromise,
  dealsPromise,
  handle,
  reviewProductsPromise,
  searchStatePromise,
  sortExclude,
}: {
  afterItemPagePromise?: Promise<CollectionAfterItemPage | undefined>;
  articles?: BlogArticle[];
  productCount?: number;
  subCollections?: CollectionWithThumbnail[];
  collection: Collection;
  collectionResultsDataPromise: Promise<CollectionResultsData>;
  dealsPromise?: Promise<ProductCardType[]>;
  handle: string;
  reviewProductsPromise?: Promise<YotpoCollectionReviewProduct[]>;
  searchStatePromise: Promise<CollectionSearchState>;
  sortExclude?: string[];
}) {
  const facetsPromise = collectionResultsDataPromise.then((data) => data.transformedFilters);

  return (
    <>
      {collection.id ? (
        <CollectionViewedTracker collection={{ handle: collection.handle, id: collection.id }} />
      ) : null}
      <Page className="bg-[#f8f9fc] pt-2.5 md:pt-10 pb-10">
        <Container>
          <Sections className="gap-5">
            <CollectionHeader collection={collection} handle={handle} homeLabel="Home" />

            <CollectionTabs
              advice={<ArticleGrid articles={articles} />}
              adviceCount={articles.length}
              productCount={productCount}
            >
              <Suspense
                fallback={
                  <div className={BROWSE_LAYOUT}>
                    <div className="hidden lg:block" />
                    <ProductsGridSkeleton count={PRODUCTS_PER_PAGE} className={GRID_COLUMNS} />
                  </div>
                }
              >
                <CollectionBrowseProvider handle={handle} searchStatePromise={searchStatePromise}>
                  <FilterSidebarLayout
                    sidebar={
                      <FilterPendingScope>
                        <CollectionFilters facetsPromise={facetsPromise} />
                      </FilterPendingScope>
                    }
                    toolbar={
                      <BrowseToolbar
                        facetsPromise={facetsPromise}
                        hideFilterTriggerOnDesktop
                        sortExclude={sortExclude}
                      />
                    }
                  >
                    <SubCollectionTiles collections={subCollections} />
                    {dealsPromise ? (
                      <Suspense fallback={null}>
                        <Deals dealsPromise={dealsPromise} title={collection.title + " deals"} />
                      </Suspense>
                    ) : null}
                    <FilterPendingScope>
                      <CollectionResultsGrid
                        collectionResultsDataPromise={collectionResultsDataPromise}
                        excludeOnSale={Boolean(dealsPromise)}
                      />
                    </FilterPendingScope>
                  </FilterSidebarLayout>
                </CollectionBrowseProvider>
              </Suspense>
            </CollectionTabs>

            {reviewProductsPromise ? (
              <Suspense fallback={null}>
                <Reviews productsPromise={reviewProductsPromise} title={collection.title} />
              </Suspense>
            ) : null}

            {afterItemPagePromise ? (
              <Suspense fallback={null}>
                <AfterItems pagePromise={afterItemPagePromise} />
              </Suspense>
            ) : null}
          </Sections>
        </Container>
      </Page>
    </>
  );
}

function CollectionHeader({
  collection,
  handle,
  homeLabel,
}: {
  collection: Collection;
  handle: string;
  homeLabel: string;
}) {
  const { title, description, updatedAt } = collection;

  const breadcrumbItems = [
    { name: homeLabel, path: "/" },
    { name: title, path: `/collections/${handle}` },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbItems} />
      <CollectionSchema collection={{ handle, title, description, updatedAt }} />
      <div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl">
          <Link href={`/collections/${handle}`}>{title}</Link>
        </h1>
        {description && <p className="mt-1 leading-6 text-muted-foreground">{description}</p>}
      </div>
    </>
  );
}
