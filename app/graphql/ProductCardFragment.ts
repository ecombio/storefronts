// app/graphql/ProductCardFragment.ts
//
// STAGE 1: bare minimum — same fields ProductItem/RecommendedProduct
// already used successfully. No metafields, no variant lookups. This
// is here to confirm the query + component wiring works at all before
// adding anything that could fail.

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
  }
` as const;

export interface ProductCardImage {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface ProductCardMoney {
  amount: string;
  currencyCode: string;
}

export interface ProductCardData {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  featuredImage: ProductCardImage | null;
  priceRange: {minVariantPrice: ProductCardMoney};
}