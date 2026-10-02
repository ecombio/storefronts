// Path: @yotpo/components/collection-reviews.tsx
//
// Async Server Component: gathers the reviews of a collection's products, then hands them to
// <CollectionReviewsBrowser> (client).
//
// - Renders nothing if Yotpo is unavailable or none of the products has reviews.
// - Wrap it in <Suspense> where it is used.

import { getCollectionReviews } from "../client";
import { yotpoConfig } from "../config";
import type { YotpoCollectionReviewProduct } from "../types";
import { CollectionReviewsBrowser } from "./collection-reviews-browser";

export async function CollectionReviews({
  collectionTitle,
  products,
}: {
  collectionTitle: string;
  products: YotpoCollectionReviewProduct[];
}) {
  const data = await getCollectionReviews(products);
  if (!data) return null;

  return (
    <section aria-label="Customer reviews" className="font-sans">
      <h2 className="mb-5 text-xl font-semibold sm:text-2xl">
        Customer reviews for {collectionTitle}
      </h2>
      <CollectionReviewsBrowser
        reviews={data.reviews}
        bottomline={data.bottomline}
        pageSize={yotpoConfig.reviewsPerPage}
      />
    </section>
  );
}
