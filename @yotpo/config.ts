// Path: @yotpo/config.ts
//
// - No longer throws at import time. A missing env var used to fail the build of every page
//   that imports `@yotpo`; now the client simply returns null and the components render nothing.
// - `shopDomain` is used by the review-submission route.
// - `reviewsFetchLimit` reviews are fetched per product so the search / rating filter / sort
//   controls have something to work with; `reviewsPerPage` is how many show before "Show more".
//
// The app key is a public Yotpo identifier, not a secret.

export const yotpoConfig = {
  appKey: process.env.NEXT_PUBLIC_YOTPO_APP_KEY ?? null,
  // Domain Yotpo knows your store by (Yotpo admin > Store settings). Adjust if it isn't the myshopify domain.
  shopDomain: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? "",
  apiBaseUrl: "https://api.yotpo.com/v1/widget",
  createReviewUrl: "https://api.yotpo.com/v1/widget/reviews",
  reviewsFetchLimit: 50, // reviews requested from Yotpo per product (filters work on these)
  reviewsPerPage: 5, // reviews shown before "Show more reviews"
  collectionReviewsPerProduct: 10, // newest reviews requested per product for collection pages
  collectionRevalidateSeconds: 604800, // merged collection reviews are rebuilt at most this often
  revalidateSeconds: 604800,
  brand: {
    primaryColor: "#000000",
    starsColor: "#FFE000",
    textColor: "#000000",
    fontPrimary: "var(--font-nunito-sans)",
    fontSecondary: "var(--font-nunito-sans)",
    lineSeparatorStyle: "smooth" as const,
  },
} as const;
