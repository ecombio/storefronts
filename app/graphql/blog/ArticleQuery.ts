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
        # Points at a single "Author" metaobject entry (see README.md
        # for the metaobject definition: name / bio / avatar fields).
        # One entry per person, reused across every article they're
        # credited on — edit the metaobject once, every article that
        # references it picks up the change.
        authorProfile: metafield(namespace: "custom", key: "author_profile") {
          reference {
            ... on Metaobject {
              name: field(key: "name") {
                value
              }
              bio: field(key: "bio") {
                value
              }
              avatar: field(key: "avatar") {
                reference {
                  ... on MediaImage {
                    image {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
        showAuthorSection: metafield(
          namespace: "custom"
          key: "show_author_section"
        ) {
          value
        }
        showToc: metafield(namespace: "custom", key: "show_toc") {
          value
        }
        # Gates the top-of-article "Key takeaways" summary box (see
        # Summary.tsx / Summary.md). Boolean metafield, defined at
        # /settings/custom_data/article/metafields as
        # custom.show_summary. Same "true"/"false" string-value
        # pattern as showToc/showAuthorSection above — isSummaryEnabled()
        # in Summary.tsx checks value === 'true', so an unset metafield
        # (value undefined) and an explicit "false" both resolve to
        # hidden. The summary content itself still comes from a
        # data-summary-embed marker in contentHtml, not from this
        # metafield — this only controls whether that marker's parsed
        # content is rendered at the top of the page.
        showSummary: metafield(namespace: "custom", key: "show_summary") {
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