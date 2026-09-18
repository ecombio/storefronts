// app/routes/collections.$handle.tsx
// Current Hydrogen skeletons (React Router 7 era, ~2025.7.0+) no longer
// ship @shopify/remix-oxygen as a package — redirect/useLoaderData come
// from react-router directly, and LoaderFunctionArgs comes from
// @shopify/hydrogen/oxygen. If your project predates that migration and
// you DO have @shopify/remix-oxygen installed, revert to the old imports:
//   import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
//   import {useLoaderData} from '@remix-run/react';
import {redirect, useLoaderData} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';
import {ProductItem, PaginatedResourceSection, FilterSort} from '~/components';
import {
  getAllFiltersFromParams,
  getSortValuesFromParam,
  type SortParam,
} from '~/lib/filters';
// This assumes PRODUCT_ITEM_FRAGMENT already exists in your fragments.ts,
// as it does in the standard skeleton. If your project's fragment doesn't
// include price/compareAtPrice fields your cards need, extend it there —
// don't duplicate it here.
import {PRODUCT_ITEM_FRAGMENT} from '~/lib/fragments';

export const meta = ({data}: {data?: {collection?: {title?: string}}}) => {
  return [{title: `Hydrogen | ${data?.collection?.title ?? ''} Collection`}];
};

export async function loader(args: LoaderFunctionArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({
  context,
  params,
  request,
}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw redirect('/collections');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const paginationVariables = getPaginationVariables(request, {pageBy: 8});
  const filters: ProductFilter[] = getAllFiltersFromParams(searchParams);
  const sortParam = searchParams.get('sort') as SortParam | null;
  const {sortKey, reverse} = getSortValuesFromParam(sortParam);

  const [{collection}] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {
        handle,
        filters,
        sortKey,
        reverse,
        ...paginationVariables,
      },
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }

  return {collection};
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function loadDeferredData({context}: LoaderFunctionArgs) {
  return {};
}

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <h1>{collection.title}</h1>
      <p className="collection-description">{collection.description}</p>

      <div className="my-4">
        <FilterSort filters={collection.products.filters} />
      </div>

      <PaginatedResourceSection
        connection={collection.products}
        resourcesClassName="products-grid"
      >
        {({node: product, index}: {node: any; index: number}) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        )}
      </PaginatedResourceSection>

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

const COLLECTION_QUERY = `#graphql
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
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
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
        filters: $filters
        sortKey: $sortKey
        reverse: $reverse
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
  ${PRODUCT_ITEM_FRAGMENT}
` as const;
