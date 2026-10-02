// Keep @yotpo/yotpo.md in sync with changes in this folder.
// Path: @yotpo/index.ts
//
// Public surface of the Yotpo slice. Everything else in this folder is an implementation
// detail; the rest of the app imports only from `@yotpo`.
//
// `submitReview` is server-only (it lives in client.ts, which imports 'server-only'). Import it
// from route handlers / server code, never from a client component. The client-side
// WriteReviewButton is used internally by ProductReviews and isn't exported.

export { StarRating } from "./components/star-ratings";
export { ProductReviews } from "./components/reviews-widget";
export { getProductCardRatings, submitReview } from "./client";
export type { SubmitReviewInput } from "./client";

export type {
  YotpoReview,
  YotpoBottomline,
  YotpoProductReviews,
  YotpoRatingSummary,
} from "./types";
