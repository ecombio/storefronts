// Path: @yotpo/client.ts
//
// - Uses `'use cache'` so reviews can live in the prerendered shell and revalidate via tags.
// - Failures are honest: the cached function THROWS (errors are never cached), the public
//   functions catch and return `null`. Components render nothing on null.
// - The response is normalized so missing bottomline / distribution buckets can't crash a render.
// - `getProductRatingSummary` shares the cache entry with `getProductReviews` (same args).
// - All upstream calls time out after REQUEST_TIMEOUT_MS so a slow Yotpo can't stall a render
//   or a review submission.

import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import { yotpoConfig } from "./config";
import type { YotpoProductReviews, YotpoRatingSummary } from "./types";

const REQUEST_TIMEOUT_MS = 5000;

async function fetchProductReviews(
  appKey: string,
  productId: string,
  page: number,
  perPage: number,
): Promise<YotpoProductReviews> {
  "use cache";
  cacheLife({ stale: 300, revalidate: yotpoConfig.revalidateSeconds, expire: 86400 });
  cacheTag("yotpo-reviews", `yotpo-reviews-${productId}`);

  const url =
    `${yotpoConfig.apiBaseUrl}/${encodeURIComponent(appKey)}` +
    `/products/${encodeURIComponent(productId)}/reviews.json?page=${page}&per_page=${perPage}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Yotpo API ${res.status} ${res.statusText}`);

  const json = (await res.json()) as { response?: Partial<YotpoProductReviews> };
  const bottomline = json.response?.bottomline;
  if (!bottomline) throw new Error("Yotpo response missing bottomline");

  const dist = bottomline.star_distribution;
  return {
    reviews: json.response?.reviews ?? [],
    bottomline: {
      total_review: bottomline.total_review ?? 0,
      average_score: bottomline.average_score ?? 0,
      star_distribution: {
        1: dist?.[1] ?? 0,
        2: dist?.[2] ?? 0,
        3: dist?.[3] ?? 0,
        4: dist?.[4] ?? 0,
        5: dist?.[5] ?? 0,
      },
    },
  };
}

/**
 * Reviews + bottomline for one product, or `null` if Yotpo is unconfigured/unreachable.
 * @param productId - Shopify numeric product ID (not the GraphQL GID).
 */
export async function getProductReviews(
  productId: string,
  opts: { page?: number; perPage?: number } = {},
): Promise<YotpoProductReviews | null> {
  const appKey = yotpoConfig.appKey;
  if (!appKey) return null;

  const { page = 1, perPage = yotpoConfig.reviewsFetchLimit } = opts;
  try {
    return await fetchProductReviews(appKey, productId, page, perPage);
  } catch (err) {
    console.error(`Yotpo fetch failed (product ${productId}):`, err);
    return null;
  }
}

/**
 * Score/count only. Deliberately calls getProductReviews with default args so it shares
 * the cache entry with the reviews section.
 */
export async function getProductRatingSummary(
  productId: string,
): Promise<YotpoRatingSummary | null> {
  const data = await getProductReviews(productId);
  if (!data) return null;
  return {
    averageScore: data.bottomline.average_score,
    totalReviews: data.bottomline.total_review,
  };
}

export type SubmitReviewInput = {
  productId: string;
  productTitle: string;
  productUrl: string;
  productImageUrl?: string;
  name: string;
  email: string;
  title: string;
  content: string;
  score: number;
};

/**
 * Creates a review via Yotpo's POST /v1/widget/reviews. New reviews normally go through
 * Yotpo moderation, so they won't appear immediately. Returns true on success.
 *
 * Field names follow Yotpo's create-review endpoint; verify against your Yotpo API reference
 * if submissions are rejected (the error body is logged).
 */
export async function submitReview(input: SubmitReviewInput): Promise<boolean> {
  const appKey = yotpoConfig.appKey;
  if (!appKey) return false;

  if (!yotpoConfig.shopDomain) {
    console.error("Yotpo create review skipped: NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN is not set");
    return false;
  }

  try {
    const res = await fetch(yotpoConfig.createReviewUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        appkey: appKey,
        domain: yotpoConfig.shopDomain,
        sku: input.productId,
        product_title: input.productTitle,
        product_url: input.productUrl,
        ...(input.productImageUrl ? { product_image_url: input.productImageUrl } : {}),
        display_name: input.name,
        email: input.email,
        review_title: input.title,
        review_content: input.content,
        review_score: input.score,
      }),
    });
    if (!res.ok) {
      console.error(
        `Yotpo create review failed: ${res.status} ${await res.text().catch(() => "")}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("Yotpo create review error:", err);
    return false;
  }
}

/**
 * Score and count for several products, for listing cards. Fetches one review per product so each
 * cache entry stays small. Failed lookups are left out; zero-review products have count 0.
 * @param productIds - Shopify numeric product IDs (not GraphQL GIDs).
 */
export async function getProductCardRatings(
  productIds: string[],
): Promise<Map<string, { count: number; score: number }>> {
  const entries = await Promise.all(
    productIds.map(async (id) => {
      const data = await getProductReviews(id, { perPage: 1 });
      if (!data) return null;
      return [
        id,
        { count: data.bottomline.total_review, score: data.bottomline.average_score },
      ] as const;
    }),
  );
  return new Map(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
}
