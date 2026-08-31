// app/lib/yotpo.server.ts

/**
 * Fetches a page of individual reviews + bottomline stats for a product
 * from Yotpo's reviews.json endpoint. Bottomline (average score, total
 * reviews, star distribution) is included in every response, so this
 * single call covers both the star-rating summary and the full review
 * list — no separate bottomline request needed.
 *
 * Powers app/sections/CustomerReviews.tsx (initial server-rendered page)
 * and app/templates/api.reviews.tsx's GET loader (subsequent "Load more" /
 * sort-change pages fetched client-side).
 *
 * Docs: https://apidocs.yotpo.com/reference/retrieve-reviews-for-a-product
 */

export type YotpoSort =
  | 'date'
  | 'votes_up'
  | 'votes_down'
  | 'time'
  | 'rating'
  | 'reviewer_type';

export type YotpoDirection = 'asc' | 'desc';

export type YotpoReview = {
  id: number;
  score: number;
  title: string;
  content: string;
  createdAt: string;
  verifiedBuyer: boolean;
  votesUp: number;
  votesDown: number;
  user: {
    displayName: string;
    socialImage: string | null;
  };
};

export type YotpoReviewsResult = {
  reviews: YotpoReview[];
  bottomline: {
    averageScore: number;
    totalReviews: number;
    starDistribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  };
  pagination: {page: number; perPage: number; total: number};
} | null;

export async function getYotpoReviews(
  appKey: string,
  yotpoProductId: string,
  options: {
    page?: number;
    perPage?: number;
    sort?: YotpoSort;
    direction?: YotpoDirection;
  } = {},
): Promise<YotpoReviewsResult> {
  try {
    const params = new URLSearchParams();
    params.set('page', String(options.page ?? 1));
    params.set('per_page', String(options.perPage ?? 10));
    if (options.sort) params.set('sort', options.sort);
    if (options.direction) params.set('direction', options.direction);

    const res = await fetch(
      `https://api-cdn.yotpo.com/v1/widget/${appKey}/products/${yotpoProductId}/reviews.json?${params}`,
    );

    if (!res.ok) {
      console.error(`Yotpo reviews fetch failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const response = data?.response;
    if (!response) return null;

    const reviews: YotpoReview[] = (response.reviews ?? []).map(
      (r: {
        id: number;
        score: number;
        title?: string;
        content?: string;
        created_at: string;
        verified_buyer?: boolean;
        votes_up?: number;
        votes_down?: number;
        user?: {display_name?: string; social_image?: string | null};
      }) => ({
        id: r.id,
        score: r.score,
        title: r.title ?? '',
        content: r.content ?? '',
        createdAt: r.created_at,
        verifiedBuyer: Boolean(r.verified_buyer),
        votesUp: r.votes_up ?? 0,
        votesDown: r.votes_down ?? 0,
        user: {
          displayName: r.user?.display_name ?? 'Anonymous',
          socialImage: r.user?.social_image ?? null,
        },
      }),
    );

    const bl = response.bottomline;
    return {
      reviews,
      bottomline: {
        averageScore: bl?.average_score ?? 0,
        totalReviews: bl?.total_review ?? 0,
        starDistribution: {
          '1': bl?.star_distribution?.['1'] ?? 0,
          '2': bl?.star_distribution?.['2'] ?? 0,
          '3': bl?.star_distribution?.['3'] ?? 0,
          '4': bl?.star_distribution?.['4'] ?? 0,
          '5': bl?.star_distribution?.['5'] ?? 0,
        },
      },
      pagination: {
        page: response.pagination?.page ?? 1,
        perPage: response.pagination?.per_page ?? 10,
        total: response.pagination?.total ?? 0,
      },
    };
  } catch (error) {
    console.error('Yotpo reviews fetch error:', error);
    return null;
  }
}

/**
 * UI sort labels mapped to Yotpo's native sort/direction query params.
 * "Top Reviews" intentionally omits both params — that's Yotpo's own
 * default relevance order, not a param combination we pass explicitly.
 */
export const YOTPO_SORT_OPTIONS = {
  top: {label: 'Top Reviews', sort: undefined, direction: undefined},
  recent: {label: 'Most Recent', sort: 'date' as const, direction: 'desc' as const},
  top_rated: {label: 'Top Rated', sort: 'rating' as const, direction: 'desc' as const},
  critical: {label: 'Critical', sort: 'rating' as const, direction: 'asc' as const},
} satisfies Record<string, {label: string; sort?: YotpoSort; direction?: YotpoDirection}>;

export type YotpoSortKey = keyof typeof YOTPO_SORT_OPTIONS;