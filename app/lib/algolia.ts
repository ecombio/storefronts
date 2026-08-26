import {useEffect, useMemo, useState} from 'react';
import {liteClient as algoliasearch} from 'algoliasearch/lite';
import {createFetchRequester} from '@algolia/requester-fetch';

const DEBOUNCE_MS = 150;

export interface AlgoliaConfig {
  appId: string;
  searchKey: string;
  indexName: string;
}

export interface AlgoliaProductHit {
  objectID: string;
  title: string;
  handle: string;
  image_url?: string;
  price?: number;
  compare_at_price?: number;
}

export function useAlgoliaSearch({
  appId,
  searchKey,
  indexName,
  active,
}: AlgoliaConfig & {active: boolean}) {
  const client = useMemo(
    () =>
      algoliasearch(appId, searchKey, {
        requester: createFetchRequester(),
      }),
    [appId, searchKey],
  );

  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<AlgoliaProductHit[]>([]);
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !term) {
      setHits([]);
      setState('idle');
      setError(null);
      return;
    }

    setState('loading');
    setError(null);

    const timeout = setTimeout(async () => {
      // Without this try/catch, a rejected request (bad index config,
      // network failure, CORS, etc.) left `state` stuck on 'loading'
      // forever — the panel would render its skeleton indefinitely with
      // no way to recover, since nothing ever set it back to 'idle'.
      try {
        const {results} = await client.search([
          {indexName, query: term, hitsPerPage: 8},
        ]);
        const result = results[0];
        setHits('hits' in result ? (result.hits as AlgoliaProductHit[]) : []);
      } catch (err) {
        console.error('Algolia search failed:', err);
        setHits([]);
        setError('Something went wrong loading results. Please try again.');
      } finally {
        setState('idle');
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [term, active, client, indexName]);

  return {term, setTerm, hits, state, error};
}

export function formatMoney(amount?: number) {
  if (amount == null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // adjust to your store's currency
  }).format(amount);
}