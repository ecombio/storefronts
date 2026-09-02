// app/graphql/blog/ArticleQuery.ts

import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
export const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
        blog {
          handle
        }
        layoutVariant: metafield(namespace: "custom", key: "layout_variant") {
          value
        }
      }
    }
  }
` as const;

// Reuses PRODUCT_CARD_FRAGMENT (~/graphql/ProductCardFragment) instead
// of hand-listing a subset of fields - the fragment is what every other
// ProductCard on the site is fed, including reviewsRating/reviewsCount.
// The previous hand-rolled selection here only asked for id/handle/
// title/featuredImage/priceRange, so ProductCard's parseRating()/
// parseCount() always fell back to 0 for shoppable-embed cards
// specifically (the 0-star, "0 Reviews" state), even though the same
// products showed real ratings everywhere else on the site.
export const SHOPPABLE_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query ShoppableProducts($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(language: $language, country: $country) {
    nodes(ids: $ids) {
      ... on Product {
        ...ProductCard
      }
    }
  }
` as const;