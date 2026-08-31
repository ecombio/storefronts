// app/templates/_index.tsx
import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {FeaturedCollectionFragment, ProductCardFragment} from 'storefrontapi.generated';
import {ProductCarousel} from '~/sections/ProductCarousel';
import {ImageCarousel, type ImageCarouselItem} from '~/sections/ImageCarousel';
import {CollectionCarousel, type CollectionCarouselItem} from '~/sections/CollectionCarousel';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';
import {COLLECTION_CARD_FRAGMENT} from '~/graphql/CollectionCardFragment';
import {MockShopNotice} from '~/sections/MockShopNotice';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);

  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}, {collections: shopByCategory}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    context.storefront.query(SHOP_BY_CATEGORY_QUERY),
  ]);

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collections.nodes[0],
    shopByCategory: shopByCategory.nodes,
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

const SHOP_THE_LOOK_ITEMS: ImageCarouselItem[] = [
  {
    id: 'placeholder-1',
    title: 'Studio Sessions',
    caption: 'New for fall',
    eyebrow: 'New',
    image: {url: 'https://picsum.photos/seed/shoplook1/600/450'},
  },
  {
    id: 'placeholder-2',
    title: 'Weekend Edit',
    caption: 'Casual layers',
    image: {url: 'https://picsum.photos/seed/shoplook2/600/450'},
  },
  {
    id: 'placeholder-3',
    title: 'City Commute',
    caption: 'Built for the ride in',
    eyebrow: 'Going fast',
    image: {url: 'https://picsum.photos/seed/shoplook3/600/450'},
  },
];

const SHOP_BY_CATEGORY_PLACEHOLDER: CollectionCarouselItem[] = [
  {id: 'ph-1', title: 'iPhone', image: {url: 'https://picsum.photos/seed/iphone/300/300'}},
  {id: 'ph-2', title: 'iPad', image: {url: 'https://picsum.photos/seed/ipad/300/300'}},
  {id: 'ph-3', title: 'Apple Watch', image: {url: 'https://picsum.photos/seed/watch/300/300'}},
  {id: 'ph-4', title: 'AirPods', image: {url: 'https://picsum.photos/seed/airpods/300/300'}},
  {id: 'ph-5', title: 'AirTag', image: {url: 'https://picsum.photos/seed/airtag/300/300'}},
  {id: 'ph-6', title: 'Apple TV 4K', image: {url: 'https://picsum.photos/seed/appletv/300/300'}},
  {id: 'ph-7', title: 'HomePod', image: {url: 'https://picsum.photos/seed/homepod/300/300'}},
  {id: 'ph-8', title: 'Accessories', image: {url: 'https://picsum.photos/seed/accessories/300/300'}},
];

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      <FeaturedCollection collection={data.featuredCollection} />
      <CollectionCarousel
        title="Shop by Category"
        items={SHOP_BY_CATEGORY_PLACEHOLDER}
        viewAllUrl="/collections"
      />
      <RecommendedProducts products={data.recommendedProducts} />
      <ImageCarousel title="Shop the Look" items={SHOP_THE_LOOK_ITEMS} />
    </div>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="featured-collection-image">
          <Image
            data={image}
            sizes="100vw"
            alt={image.altText || collection.title}
          />
        </div>
      )}
      <h1>{collection.title}</h1>
    </Link>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<{products: {nodes: ProductCardFragment[]}} | null>;
}) {
  return (
    <Suspense fallback={<div className="recommended-products-loading">Loading...</div>}>
      <Await resolve={products}>
        {(response) =>
          response ? (
            <ProductCarousel title="Recommended Products" products={response.products.nodes} />
          ) : null
        }
      </Await>
    </Suspense>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const SHOP_BY_CATEGORY_QUERY = `#graphql
  ${COLLECTION_CARD_FRAGMENT}
  query ShopByCategory($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 10, sortKey: TITLE) {
      nodes {
        ...CollectionCard
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...ProductCard
      }
    }
  }
` as const;