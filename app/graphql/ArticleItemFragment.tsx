// app/graphql/ArticleItemFragment.tsx

export const ARTICLE_ITEM_FRAGMENT = `#graphql
  fragment ArticleItem on Article {
    id
    handle
    title
    excerpt
    publishedAt
    blog {
      handle
    }
    image {
      id
      url
      altText
      width
      height
    }
    readingTime: metafield(namespace: "custom", key: "reading_time") {
      value
    }
  }
` as const;