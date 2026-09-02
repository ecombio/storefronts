import {liteClient as algoliasearch} from 'algoliasearch/lite';

export interface AlgoliaConfig {
  appId: string;
  searchKey: string;
  indexName: string;
}

export function createAlgoliaClient(config: AlgoliaConfig) {
  return algoliasearch(config.appId, config.searchKey);
}