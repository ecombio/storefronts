// app/graphql/ProductCardFragment.tsx
//
// STAGE 3: adds ETA, sponsored, and review-stat metafields.
// Reviews come from the standard `reviews.rating` / `reviews.rating_count`
// metafields (whatever review app syncs those) — no live Yotpo call in
// the collection loader. Confirm namespace/key in Settings > Custom data
// > Products if these come back null.

export const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    handle
    title
    vendor
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      availableForSale
    }
    etaText: metafield(namespace: "custom", key: "eta_text") {
      value
    }
    sponsored: metafield(namespace: "custom", key: "sponsored") {
      value
    }
    reviewsRating: metafield(namespace: "reviews", key: "rating") {
      value
    }
    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {
      value
    }
  }
` as const;