import {lazy, Suspense, useEffect, useState} from 'react';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/search';
import {Analytics} from '@shopify/hydrogen';
import type {AlgoliaConfig} from '~/lib/algolia';
import {getEmptyPredictiveSearchResult} from '~/lib/search';
import type {PredictiveSearchReturn} from '~/lib/search';
import type {PredictiveSearchQuery} from 'storefrontapi.generated';

// Lazy + client-only: react-instantsearch (and its CJS algoliasearch-helper
// dependency) is loaded ONLY in the browser. See AlgoliaInstantSearch.client.tsx
// for why this file must keep the `.client.tsx` suffix.
const AlgoliaInstantSearch = lazy(
  () => import('~/snippets/AlgoliaInstantSearch.client'),
);

export const meta: Route.MetaFunction = () => {
  return [{title: `Hydrogen | Search`}];
};

interface AlgoliaSearchReturn {
  type: 'algolia';
  term: string;
  algolia: AlgoliaConfig;
}

export async function loader({
  request,
  context,
}: Route.LoaderArgs): Promise<PredictiveSearchReturn | AlgoliaSearchReturn> {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');

  // Predictive branch — powers the header search flyout (SearchAside in
  // PageLayout.tsx). Untouched: still Shopify-native, still required.
  if (isPredictive) {
    return predictiveSearch({request, context});
  }

  // Full-page branch — now Algolia-powered instead of the old
  // Shopify Storefront API `regularSearch()`.
  const {env} = context;
  const term = String(url.searchParams.get('q') || '');

  return {
    type: 'algolia',
    term,
    algolia: {
      appId: env.PUBLIC_ALGOLIA_APP_ID,
      searchKey: env.PUBLIC_ALGOLIA_SEARCH_KEY,
      indexName: env.PUBLIC_ALGOLIA_INDEX_NAME,
    },
  };
}

/**
 * Renders the /search route
 */
export default function SearchPage() {
  const data = useLoaderData<typeof loader>();

  // Predictive requests render nothing — the flyout in PageLayout.tsx
  // renders its own dropdown UI; this route is only hit for its JSON data.
  if (data.type === 'predictive') return null;

  const {algolia, term} = data;

  // Gate rendering on client mount. Belt-and-suspenders alongside the
  // `.client.tsx` suffix: this guarantees the dynamic import() itself is
  // never even called during SSR, not just that its module is excluded
  // from the server bundle.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  return (
    <div className="search-page">
      {hasMounted && (
        <Suspense fallback={<div className="search-loading">Loading search…</div>}>
          <AlgoliaInstantSearch algolia={algolia} term={term} />
        </Suspense>
      )}
      <Analytics.SearchView data={{searchTerm: term, searchResults: null}} />
    </div>
  );
}

/**
 * Predictive search query and fragments — kept as-is, still used by the
 * header search flyout via ?predictive=1 requests to this same route.
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

/**
 * Predictive search fetcher — unchanged from the original file.
 */
async function predictiveSearch({
  request,
  context,
}: Pick<
  Route.ActionArgs,
  'request' | 'context'
>): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  const {
    predictiveSearch: items,
    errors,
  }: PredictiveSearchQuery & {errors?: Array<{message: string}>} =
    await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {
        limit,
        limitScope: 'EACH',
        term,
      },
    });

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}: {message: string}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc: number, item: Array<unknown>) => acc + item.length,
    0,
  );

  return {type, term, result: {items, total}};
}