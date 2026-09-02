import {useState} from 'react';
import {
  InstantSearch,
  SearchBox,
  Hits,
  HierarchicalMenu,
  RefinementList,
  Pagination,
  SortBy,
  useInstantSearch,
} from 'react-instantsearch';
import {createAlgoliaClient, type AlgoliaConfig} from '~/lib/algolia';
import {ProductHit} from '~/snippets/AlgoliaProductHit';

interface AlgoliaInstantSearchProps {
  algolia: AlgoliaConfig;
  term: string;
}

export default function AlgoliaInstantSearch({
  algolia,
  term,
}: AlgoliaInstantSearchProps) {
  const searchClient = createAlgoliaClient(algolia);
  const [facetsOpen, setFacetsOpen] = useState(false);

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={algolia.indexName}
      initialUiState={{
        [algolia.indexName]: {
          query: term,
        },
      }}
    >
      <div className="search-layout">
        <button
          type="button"
          className="search-facets-toggle"
          onClick={() => setFacetsOpen((open) => !open)}
          aria-expanded={facetsOpen}
        >
          Filters
        </button>

        <aside
          className="search-facets"
          data-open={facetsOpen ? 'true' : 'false'}
        >
          <div className="search-facets-header">
            <span>Filters</span>
            <button
              type="button"
              className="search-facets-close"
              onClick={() => setFacetsOpen(false)}
              aria-label="Close filters"
            >
              ×
            </button>
          </div>
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
          <div className="search-results-toolbar">
            <SearchBox />
            <SortBy items={[{label: 'Relevance', value: algolia.indexName}]} />
          </div>
          <SearchResultsBody />
        </main>
      </div>
    </InstantSearch>
  );
}

/**
 * Separate component (rather than inline in the tree above) so it can call
 * useInstantSearch() — that hook needs to be a descendant of <InstantSearch>,
 * it can't be called in the same component that renders the provider.
 *
 * Handles three states explicitly instead of letting <Hits> silently render
 * nothing for all of them:
 *  - stalled/loading: a lightweight loading line (search is genuinely slow,
 *    not stuck)
 *  - zero results: an actual "no results" message instead of blank space
 *  - results: the normal <Hits> grid
 */
function SearchResultsBody() {
  const {results, status} = useInstantSearch();
  const nbHits = results?.nbHits ?? 0;
  const isSearching = status === 'stalled' || status === 'loading';

  if (isSearching && nbHits === 0) {
    return <p className="search-status">Searching…</p>;
  }

  if (!isSearching && nbHits === 0) {
    return (
      <div className="search-empty">
        <p className="search-empty-title">
          No results for &ldquo;{results?.query}&rdquo;
        </p>
        <p className="search-empty-hint">
          Try a different search term, or check the spelling.
        </p>
      </div>
    );
  }

  return (
    <>
      <Hits hitComponent={ProductHit} />
      <Pagination />
    </>
  );
}