import {useLoaderData} from 'react-router';
import type {Route} from './+types/search';
import {getEmptyPredictiveSearchResult} from '~/lib/search';

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
      limit: $limit
      limitScope: $limitScope
      query: $term
      types: $types
    ) {
      products {
        id
        title
        handle
        trackingParameters
        selectedOrFirstAvailableVariant(
          selectedOptions: []
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
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
          compareAtPrice {
            amount
            currencyCode
          }
        }
      }
      queries {
        text
        trackingParameters
      }
    }
  }
`;

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const term = url.searchParams.get('q') ?? '';
  const limit = Number(url.searchParams.get('limit') ?? 10);
  const isPredictive = url.searchParams.has('predictive');

  if (!term) {
    return {
      type: isPredictive ? 'predictive' : 'regular',
      result: getEmptyPredictiveSearchResult(),
      term,
    };
  }

  const {storefront} = context;

  const data = await storefront.query(PREDICTIVE_SEARCH_QUERY, {
    variables: {
      limit,
      limitScope: 'ALL',
      term,
      types: ['PRODUCT', 'QUERY'],
    },
  });

  const items = data?.predictiveSearch ?? {
    products: [],
    queries: [],
  };
  const total = (items.products?.length ?? 0) + (items.queries?.length ?? 0);

  return {
    type: isPredictive ? 'predictive' : 'regular',
    result: {items, total},
    term,
  };
}

// Full (non-predictive) results page — renders when the user lands on
// /search?q=... directly, e.g. from "View all results".
export default function SearchPage() {
  const {result, term} = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10">
      <h1 className="text-xl font-semibold text-gray-900">
        Search results for &ldquo;{term}&rdquo;
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        {result.total} result{result.total === 1 ? '' : 's'}
      </p>
      {/* Full product grid for the standalone search page can reuse the
          same card markup as HeaderSearch's predictive panel — left as
          a follow-up since it's a separate page layout concern. */}
    </div>
  );
}
