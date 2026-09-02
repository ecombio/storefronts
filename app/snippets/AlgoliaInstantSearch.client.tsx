import {
  InstantSearch,
  SearchBox,
  Hits,
  HierarchicalMenu,
  RefinementList,
  Pagination,
  SortBy,
} from 'react-instantsearch';
import {createAlgoliaClient, type AlgoliaConfig} from '~/lib/algolia';
import {ProductHit} from '~/snippets/AlgoliaProductHit';

interface AlgoliaInstantSearchProps {
  algolia: AlgoliaConfig;
  term: string;
}

/**
 * This file is suffixed `.client.tsx` on purpose. React Router's Vite
 * plugin (same convention as Remix) excludes any `*.client.tsx` file from
 * the server bundle entirely — it's only ever imported in the browser.
 *
 * That means `react-instantsearch` (which pulls in `instantsearch.js`,
 * which depends on the CJS-only `algoliasearch-helper` package) never gets
 * loaded by MiniOxygen's server/worker runtime at all. No `require()` call
 * from that dependency chain can ever execute server-side, so this
 * sidesteps the "ReferenceError: require is not defined" issue regardless
 * of Vite/mini-oxygen version or noExternal configuration.
 */
export default function AlgoliaInstantSearch({
  algolia,
  term,
}: AlgoliaInstantSearchProps) {
  const searchClient = createAlgoliaClient(algolia);

  return (
    <InstantSearch searchClient={searchClient} indexName={algolia.indexName}>
      <div className="search-layout">
        <aside className="search-facets">
          <h3>Category</h3>
          <HierarchicalMenu
            attributes={[
              'category.lvl0',
              'category.lvl1',
              'category.lvl2',
              'category.lvl3',
              'category.lvl4',
              'category.lvl5',
            ]}
          />
          <h3>Price</h3>
          <RefinementList attribute="price_range" />
          <h3>Brand</h3>
          <RefinementList attribute="vendor" />
        </aside>
        <main className="search-results">
          <SearchBox defaultRefinement={term} />
          <SortBy items={[{label: 'Relevance', value: algolia.indexName}]} />
          <Hits hitComponent={ProductHit} />
          <Pagination />
        </main>
      </div>
    </InstantSearch>
  );
}