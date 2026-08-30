// app/lib/yotpo.server.ts

/**
 * Fetches aggregate star rating data (average score + review count) for a
 * single product directly from Yotpo's Bottomline API. This bypasses the
 * on-site Star Rating widget entirely — no client script, no CSP entries
 * needed for this piece, no widget-mounting mystery. Used instead of the
 * `data-yotpo-instance-id="1332841"` div, which was rendering empty
 * despite the product having 5 published reviews (widget-specific issue,
 * not a data or integration problem — the main Reviews widget, instance
 * 1332840, renders the same underlying data correctly).
 *
 * Docs: https://apidocs.yotpo.com/reference/retrieve-bottom-line
 */

export type YotpoBottomline = {
  averageScore: number;
  totalReviews: number;
} | null;

export async function getYotpoBottomline(
  appKey: string,
  yotpoProductId: string,
): Promise<YotpoBottomline> {
  try {
    const res = await fetch(
      `https://api-cdn.yotpo.com/v1/widget/${appKey}/products/${yotpoProductId}/bottomline.json`,
    );

    if (!res.ok) {
      console.error(`Yotpo bottomline fetch failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const bottomline = data?.response?.bottomline;

    if (!bottomline || typeof bottomline.average_score !== 'number') {
      return null;
    }

    return {
      averageScore: bottomline.average_score,
      totalReviews: bottomline.total_review ?? 0,
    };
  } catch (error) {
    console.error('Yotpo bottomline fetch error:', error);
    return null;
  }
}