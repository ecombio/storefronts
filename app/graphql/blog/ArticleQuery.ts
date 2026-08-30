// app/graphql/blog/ArticleQuery.ts

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

export const SHOPPABLE_PRODUCTS_QUERY = `#graphql
  query ShoppableProducts($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(language: $language, country: $country) {
    nodes(ids: $ids) {
      ... on Product {
        id
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
` as const;
