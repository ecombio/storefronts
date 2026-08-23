import {liteClient as algoliasearch} from 'algoliasearch/lite';

export const searchClient = algoliasearch(
  import.meta.env.PUBLIC_ALGOLIA_APP_ID,
  import.meta.env.PUBLIC_ALGOLIA_SEARCH_KEY,
);

export const ALGOLIA_INDEX_NAME =
  import.meta.env.PUBLIC_ALGOLIA_INDEX_NAME || 'shopify_products';
