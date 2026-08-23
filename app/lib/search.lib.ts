import type {PredictiveSearchQuery} from 'storefrontapi.generated';

export type PredictiveSearchResult = NonNullable<
  PredictiveSearchQuery['predictiveSearch']
>;

export type PredictiveSearchReturn = {
  result: {
    items: PredictiveSearchResult;
    total: number;
  };
};

export function getEmptyPredictiveSearchResult(): PredictiveSearchReturn['result'] {
  return {
    items: {articles: [], collections: [], pages: [], products: [], queries: []},
    total: 0,
  };
}

/**
 * Appends Shopify's predictive-search tracking params (`_pos`, `_psid`,
 * `_psq`, `_ss`) plus the raw query (`q`) to a product/collection/etc URL,
 * so click-through data feeds back into Storefront API search relevance.
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  term,
}: {
  baseUrl: string;
  trackingParams?: string | null;
  term: string;
}): string {
  const params = new URLSearchParams();
  if (term) params.set('q', term);
  const url = trackingParams ? `${baseUrl}?${trackingParams}` : baseUrl;
  if (!term) return url;
  const separator = url.includes('?') ? '&' : '?';
  return trackingParams ? url : `${url}${separator}${params.toString()}`;
}
