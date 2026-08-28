const YOTPO_APP_KEY = 'GVq3qDsSZ94vLoElcTQgzekz90KJDVehGX1oASx7';

export type YotpoBottomline = {
  totalReviews: number;
  averageScore: number;
};

/**
 * Fetches the aggregate star rating (average score + review count) for a
 * product directly from Yotpo's public Bottom Line API. This is a plain
 * server-side GET request — no Secret Key required, no client-side script,
 * no CSP dependency. Returns null on any failure so the UI can gracefully
 * hide the rating instead of breaking the page.
 *
 * Endpoint + response shape verified against Yotpo's official docs:
 * https://apidocs.yotpo.com/reference/get-bottom-line-total-reviews-and-average-score
 * Note: Yotpo states data here can lag up to 1 hour behind real-time.
 */
export async function getYotpoBottomline(
  productId: string,
): Promise<YotpoBottomline | null> {
  try {
    const res = await fetch(
      `https://api-cdn.yotpo.com/products/${YOTPO_APP_KEY}/${productId}/bottomline`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!res.ok) {
      console.error(
        `Yotpo bottomline request failed for product ${productId}: ${res.status}`,
      );
      return null;
    }

    const data = await res.json();
    const bottomline = data?.response?.bottomline;

    if (!bottomline) {
      return null;
    }

    return {
      totalReviews: bottomline.total_reviews ?? 0,
      averageScore: bottomline.average_score ?? 0,
    };
  } catch (error) {
    console.error('Yotpo bottomline fetch threw:', error);
    return null;
  }
}