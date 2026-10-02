/**
 * yotpo/types.ts
 */

export type YotpoReview = {
  id: number;
  score: number; // 1-5
  title: string;
  content: string;
  created_at: string;
  user: {
    display_name: string;
  };
  votes_up: number;
  votes_down: number;
  // Optional: taken from Yotpo's documented sample, not yet checked against the live account.
  verified_buyer?: boolean;
  images_data?: { id?: number; thumb_url?: string; original_url?: string }[];
};

export type YotpoBottomline = {
  total_review: number;
  average_score: number;
  star_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};

export type YotpoProductReviews = {
  reviews: YotpoReview[];
  bottomline: YotpoBottomline;
};

export type YotpoRatingSummary = {
  averageScore: number;
  totalReviews: number;
};

export type YotpoCollectionReviewProduct = {
  id: string; // Shopify numeric product ID
  handle: string;
  title: string;
};

export type YotpoCollectionReview = YotpoReview & {
  product: { handle: string; title: string };
};

export type YotpoCollectionReviews = {
  reviews: YotpoCollectionReview[];
  bottomline: YotpoBottomline;
};
