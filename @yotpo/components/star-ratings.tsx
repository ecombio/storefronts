// Path: @yotpo/components/star-ratings.tsx
//
// - Renders nothing if Yotpo is unavailable.
// - Whole badge is a link that jumps to the reviews section (`href`, default "#reviews").
// - Layout: stars, score (in the star color), divider, "N Reviews".
// - Empty state is just a "Write a review" link (no zero-star row).
// - aria-label comes from the shared ratingLabel(); "1 Review" pluralization kept.
//
// Async Server Component; wrap it in <Suspense> where it's used.

import { getProductRatingSummary } from "../client";
import { ratingLabel, StarRow } from "./star";

export async function StarRating({
  productId,
  href = "#reviews",
}: {
  productId: string;
  href?: string;
}) {
  const summary = await getProductRatingSummary(productId);
  if (!summary) return null;

  const { averageScore, totalReviews } = summary;

  if (totalReviews === 0) {
    return (
      <a
        href={href}
        className="inline-flex items-center font-sans text-sm font-bold text-black underline-offset-2 hover:underline"
      >
        Write a review
      </a>
    );
  }

  return (
    <a
      href={href}
      aria-label={`${ratingLabel(averageScore, totalReviews)}. Jump to reviews`}
      className="inline-flex items-center gap-2.5 font-sans hover:opacity-80"
    >
      <StarRow decorative score={averageScore} starClassName="h-5 w-5" color="#000" />
      <span className="text-base font-bold text-black">{averageScore.toFixed(1)}</span>
      <span className="h-4 w-px bg-neutral-400" />
      <span className="text-base font-bold text-black underline-offset-2 hover:underline">
        {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"}
      </span>
    </a>
  );
}
