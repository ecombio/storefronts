import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionDetailPage } from "@/components/collections/collection-page";
import { getCollectionArticles } from "@/lib/blog/server";
import { getCollectionSubCollections } from "@/lib/collections/server";
import { getCollectionResultsData, getCollectionSearchState } from "@/lib/collections/server";
import {
  getCollection,
  getCollectionAfterItemPage,
  getCollectionDeals,
  getCollectionProductCount,
  getCollections,
} from "@/lib/collections/server";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";

const PLACEHOLDER_HANDLE = "__placeholder__";

export async function generateStaticParams() {
  try {
    const collections = await getCollections({ limit: 1 });
    const first = collections[0];
    return [{ handle: first ? first.handle : PLACEHOLDER_HANDLE }];
  } catch {
    return [{ handle: PLACEHOLDER_HANDLE }];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/collections/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  if (handle === PLACEHOLDER_HANDLE) {
    notFound();
  }
  const collection = await getCollection({
    handle,
  });
  if (!collection) {
    const title = "Collection";
    const description = "Browse collection products.";
    return {
      title,
      description,
      alternates: buildAlternates({
        pathname: `/collections/${handle}`,
      }),
      openGraph: buildOpenGraph({
        title,
        description,
        url: `/collections/${handle}`,
        type: "website",
      }),
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/og-default.png"],
      },
    };
  }
  const title = collection.seo.title;
  const description = collection.seo.description;
  return {
    title,
    description,
    alternates: buildAlternates({
      pathname: `/collections/${collection.handle}`,
    }),
    openGraph: buildOpenGraph({
      title,
      description,
      url: `/collections/${collection.handle}`,
      type: "website",
    }),
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-default.png"],
    },
  };
}

export const instant = false;

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps<"/collections/[handle]">) {
  const { handle } = await params;
  if (handle === PLACEHOLDER_HANDLE) notFound();
  const collection = await getCollection({
    handle,
  });
  if (!collection) notFound();

  const afterItemPagePromise = getCollectionAfterItemPage({ handle });

  // Keep searchParams unawaited so the collection header stays in the static shell.
  const searchStatePromise = getCollectionSearchState(searchParams);
  const collectionResultsDataPromise = getCollectionResultsData({
    handle,
    searchStatePromise,
    excludeOnSale: true,
  });
  // A failed deals lookup should hide the carousel, not break the page.
  const dealsPromise = getCollectionDeals({ handle }).catch(() => []);
  const [articles, productCount, subCollections] = await Promise.all([
    getCollectionArticles({ handle }),
    getCollectionProductCount({ handle }),
    getCollectionSubCollections({ handle }),
  ]);

  return (
    <CollectionDetailPage
      collection={collection}
      collectionResultsDataPromise={collectionResultsDataPromise}
      dealsPromise={dealsPromise}
      afterItemPagePromise={afterItemPagePromise}
      articles={articles}
      productCount={productCount}
      subCollections={subCollections}
      handle={handle}
      searchStatePromise={searchStatePromise}
    />
  );
}
