// app/graphql/CollectionCardFragment.tsx

// Unlike ImageCarousel's placeholder content, collection tiles map onto
// real Shopify Collection objects directly — title, image, and handle
// are native fields, so there's no metaobject layer needed here. Query
// this fragment, then map `nodes` into CollectionCarouselItem[]
// (id, title, image, href: `/collections/${handle}`).
export const COLLECTION_CARD_FRAGMENT = `#graphql
  fragment CollectionCard on Collection {
    id
    handle
    title
    image {
      id
      url
      altText
      width
      height
    }
  }
` as const;
