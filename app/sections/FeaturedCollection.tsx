// app/sections/FeaturedCollection.tsx
import {Image} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {ProductCard} from '~/snippets/ProductCard';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';

/**
 * FeaturedCollection
 * -------------------
 * One row: a banner image card first, then that collection's products
 * lined up next to it (image | product, product, product), scrolling
 * horizontally if there are more than fit.
 *
 * Presentational only — expects already-fetched data as props. Fetch
 * with FEATURED_COLLECTION_QUERY in the route loader, then render:
 *
 *   <FeaturedCollection collection={collection} />
 */

export type FeaturedCollectionData = {
  id: string;
  handle: string;
  title: string;
  image?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  products: {
    nodes: ProductCardFragment[];
  };
};

export function FeaturedCollection({
  collection,
  heading,
  showViewAll = true,
  viewAllLabel = 'View all',
}: {
  collection: FeaturedCollectionData;
  heading?: string;
  showViewAll?: boolean;
  viewAllLabel?: string;
}) {
  if (!collection || collection.products.nodes.length === 0) return null;

  const displayHeading = heading || collection.title;
  const headingId = `featured-collection-heading-${collection.id}`;

  return (
    <section className="featured-collection" aria-labelledby={headingId}>
      <div className="featured-collection__header">
        <h2 className="featured-collection__title" id={headingId}>
          {displayHeading}
        </h2>

        {showViewAll && (
          <Link
            className="featured-collection__view-all"
            to={`/collections/${collection.handle}`}
            prefetch="intent"
          >
            {viewAllLabel}
          </Link>
        )}
      </div>

      <div className="featured-collection__row">
        {collection.image && (
          <Link
            to={`/collections/${collection.handle}`}
            prefetch="intent"
            className="featured-collection__banner"
          >
            <Image
              data={collection.image}
              alt={collection.image.altText || collection.title}
              className="featured-collection__banner-img"
              sizes="320px"
            />
          </Link>
        )}

        {collection.products.nodes.map((product, index) => (
          <div className="featured-collection__item" key={product.id}>
            <ProductCard product={product} loading={index < 3 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * GraphQL query for FeaturedCollection.
 */
export const FEATURED_COLLECTION_QUERY = `#graphql
  query FeaturedCollection(
    $handle: String!
    $first: Int = 8
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
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
      products(first: $first) {
        nodes {
          ...ProductCard
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;