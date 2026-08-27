/**
 * Server-side helper for fetching a product's review summary (average
 * score + review count) so it can be rendered in the initial SSR HTML
 * instead of waiting for the client-side Yotpo widget to mount.
 *
 * This uses Yotpo's public bottomline endpoint, which only needs your
 * Store ID (app key) — no API secret/auth token required:
 *   GET https://api-cdn.yotpo.com/products/{app_key}/{product_id}/bottomline
 *
 * Env var required (set in .env locally, and in Oxygen environment
 * variables in production):
 *   YOTPO_STORE_ID   (your Yotpo App Key / Store ID — safe to be public,
 *                      but keeping the fetch server-side still avoids an
 *                      extra client-side request blocking widget render)
 */

const YOTPO_API_BASE = 'https://api-cdn.yotpo.com';

interface YotpoEnv {
  YOTPO_STORE_ID: string;
}

export interface YotpoReviewSummary {
  averageScore: number;
  totalReviews: number;
}

/**
 * Fetches the review summary for a single product, for use in an SSR
 * loader. Returns null on any failure so a Yotpo outage never breaks
 * the product page — treat a null result the same as "no reviews yet"
 * and let the client-side widget fill in once it mounts.
 */
export async function getYotpoReviewSummary(
  env: YotpoEnv,
  productId: string,
): Promise<YotpoReviewSummary | null> {
  try {
    const response = await fetch(
      `${YOTPO_API_BASE}/products/${env.YOTPO_STORE_ID}/${productId}/bottomline`,
      {
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      console.error(`Yotpo bottomline fetch failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    // Actual response shape (verified against a real payload):
    //   {"bottomline":{"totalReviews":5,"averageScore":4.8,...}}
    // No "response" wrapper, and fields are camelCase.
    const bottomline = data?.bottomline;

    if (!bottomline) {
      return null;
    }

    return {
      averageScore: Number(bottomline.averageScore ?? 0),
      totalReviews: Number(bottomline.totalReviews ?? 0),
    };
  } catch (error) {
    // Never let a Yotpo outage/timeout break the product page.
    console.error('Yotpo review summary fetch error:', error);
    return null;
  }
}

/**
 * If you later need write access or private data (submitting reviews
 * programmatically, moderation, exporting UGC, etc.), THAT is when the
 * API Secret comes in — via a separate OAuth client-credentials
 * exchange (POST /oauth/token with client_id + client_secret) to get a
 * short-lived utoken. Keep YOTPO_API_SECRET out of this file and out
 * of any code path reachable from the client bundle; only add it if
 * you build one of those write/private-data features.
 */