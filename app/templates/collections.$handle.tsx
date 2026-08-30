// app/templates/collections.$handle.tsx

import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {CollectionFilters} from '~/sections/CollectionFilters';
import {CollectionFeed} from '~/sections/CollectionFeed';
import {CollectionToolbar} from '~/sections/CollectionToolbar';
import {CollectionArticles} from '~/sections/CollectionArticles';
import {SubCollections} from '~/sections/SubCollections';
import {CollectionAfterItems} from '~/sections/CollectionAfterItems';
import type {CollectionTab} from '~/sections/CollectionToolbar';
import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';

const FILTER_URL_PARAM_NAME = 'filter';
const TAB_URL_PARAM_NAME = 'tab';
const VALID_TABS: CollectionTab[] = ['products', 'articles'];

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.collection.title ?? ''} Collection`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  const url = new URL(request.url);
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });
  const filters = parseFiltersFromUrl(url);
  const activeTab = parseActiveTab(url);

  if (!handle) {
    throw redirect('/collections');
  }

  const [{collection}] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {handle, filters, ...paginationVariables},
      // Add other queries here, so that they are loaded in parallel
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {
    collection,
    activeTab,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

/**
 * Each selected filter is stored as its own `filter` URL param, JSON-encoded
 * to match the Storefront API's `ProductFilter` input shape directly (this
 * is the same encoding Hydrogen's own skeleton template uses, so `?filter=`
 * links are shareable and work without JS).
 */
function parseFiltersFromUrl(url: URL): ProductFilter[] {
  return url.searchParams
    .getAll(FILTER_URL_PARAM_NAME)
    .map((rawFilter) => {
      try {
        return JSON.parse(rawFilter) as ProductFilter;
      } catch {
        return null;
      }
    })
    .filter((filter): filter is ProductFilter => filter !== null);
}

/**
 * The active Products/Expert Advice tab is stored in a `?tab=` URL param,
 * same pattern as the filter params above — shareable and works without JS.
 * Falls back to 'products' for anything missing or invalid.
 */
function parseActiveTab(url: URL): CollectionTab {
  const tab = url.searchParams.get(TAB_URL_PARAM_NAME);
  return (VALID_TABS as string[]).includes(tab ?? '') ? (tab as CollectionTab) : 'products';
}

export default function Collection() {
  const {collection, activeTab} = useLoaderData<typeof loader>();

  const articles = (collection.postsMetafield?.references?.nodes ?? []).filter(
    (node): node is NonNullable<typeof node> => Boolean(node),
  );

  const subCollections = (collection.subCollectionsMetafield?.references?.nodes ?? []).filter(
    (node): node is NonNullable<typeof node> => Boolean(node),
  );

  return (
    <div className="collection">
      <h1>{collection.title}</h1>
      <p className="collection-description">{collection.description}</p>

      <CollectionToolbar activeTab={activeTab} />

      <div className="collection-layout">
        <CollectionFilters filters={collection.products.filters} />

        <div className="collection-feed">
          <div
            id="panel-products"
            role="tabpanel"
            aria-labelledby="tab-products"
            hidden={activeTab !== 'products'}
          >
            <SubCollections collections={subCollections} />
            <CollectionFeed products={collection.products} />
          </div>
          <div
            id="panel-articles"
            role="tabpanel"
            aria-labelledby="tab-articles"
            hidden={activeTab !== 'articles'}
          >
            <CollectionArticles articles={articles} />
          </div>
        </div>
      </div>

      <CollectionAfterItems body={collection.afterItemsMetafield?.reference?.body} />

      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
` as const;

const ARTICLE_ITEM_FRAGMENT = `#graphql
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

const SUB_COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment SubCollectionItem on Collection {
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

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  ${ARTICLE_ITEM_FRAGMENT}
  ${SUB_COLLECTION_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      postsMetafield: metafield(namespace: "custom", key: "posts") {
        references(first: 10) {
          nodes {
            ... on Article {
              ...ArticleItem
            }
          }
        }
      }
      subCollectionsMetafield: metafield(namespace: "custom", key: "sub_collections") {
        references(first: 20) {
          nodes {
            ... on Collection {
              ...SubCollectionItem
            }
          }
        }
      }
      afterItemsMetafield: metafield(namespace: "custom", key: "after_item_lists") {
        reference {
          ... on Page {
            id
            body
          }
        }
      }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters
      ) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;