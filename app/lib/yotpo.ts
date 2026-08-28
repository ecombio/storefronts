export interface YotpoBottomline {
  averageScore: number;
  totalReviews: number;
}

interface YotpoBottomlineResponse {
  bottomline?: YotpoBottomline;
}

export async function fetchYotpoBottomline(
  appKey: string,
  productId: string,
): Promise<YotpoBottomline | null> {
  try {
    const res = await fetch(
      `https://api-cdn.yotpo.com/products/${appKey}/${productId}/bottomline`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as YotpoBottomlineResponse;
    return data?.bottomline ?? null;
  } catch {
    return null;
  }
}