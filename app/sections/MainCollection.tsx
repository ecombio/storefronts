// app/sections/MainCollection.tsx

import {useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router';
import type {Filter} from '@shopify/hydrogen/storefront-api-types';
import type {ArticleItemFragment} from 'storefrontapi.generated';
import {CollectionFilter} from '~/snippets/CollectionFilter';
import {CollectionFeed} from '~/snippets/CollectionFeed';
import type {ProductsConnection} from '~/snippets/CollectionFeed';

const TAB_PARAM_NAME = 'tab';

// `cursor`/`direction` are written by Hydrogen's getPaginationVariables/
// <Pagination> (see https://shopify.dev/docs/api/hydrogen/utilities/getpaginationvariables).
// `p` is PaginatedResourceSection's own display-only page-number param.
const PAGINATION_PARAM_NAMES = ['cursor', 'direction', 'p'];

export type CollectionTab = 'products' | 'articles';

const TABS: {id: CollectionTab; label: string}[] = [
  {id: 'products', label: 'Products'},
  {id: 'articles', label: 'Expert Advice'},
];

/**
 * Strips pagination state from a set of params. Any link that changes
 * which items are shown (a tab switch) must reset pagination — a cursor
 * is only valid for the exact query context (filters, sort, tab) it was
 * issued under. Reusing it against a changed context can return an empty
 * page or an error from the Storefront API.
 */
function resetPagination(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  PAGINATION_PARAM_NAMES.forEach((name) => next.delete(name));
  return next;
}

interface MainCollectionProps {
  activeTab: CollectionTab;
  filters: Filter[];
  products: ProductsConnection;
  articles: ArticleItemFragment[];
  /** Precomputed "page number -> cursor" map for numbered pagination links; see collections.$handle.tsx. */
  pageCursors?: Record<number, string>;
  /** How many page numbers can be linked to directly. */
  totalKnownPages?: number;
  /** Whether pages exist beyond `totalKnownPages` (shown as an ellipsis). */
  hasMoreBeyondKnownPages?: boolean;
}

export function MainCollection({
  activeTab,
  filters,
  products,
  articles,
  pageCursors,
  totalKnownPages,
  hasMoreBeyondKnownPages,
}: MainCollectionProps) {
  return (
    <div className="main-collection">
      <CollectionToolbar activeTab={activeTab} />

      <div className="collection-layout">
        <CollectionFilter filters={filters} />

        <div className="collection-feed">
          <CollectionFeed
            activeTab={activeTab}
            products={products}
            articles={articles}
            pageCursors={pageCursors}
            totalKnownPages={totalKnownPages}
            hasMoreBeyondKnownPages={hasMoreBeyondKnownPages}
          />
        </div>
      </div>
    </div>
  );
}

function CollectionToolbar({activeTab}: {activeTab: CollectionTab}) {
  const location = useLocation();
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        '--toolbar-height',
        `${entry.contentRect.height}px`,
      );
    });
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={toolbarRef}
      className="collection-toolbar sticky-under-header"
      role="navigation"
      aria-label="Collection navigation"
    >
      <div className="tab-switcher" role="tablist" aria-label="Collection view">
        {TABS.map((tab) => {
          const params = resetPagination(new URLSearchParams(location.search));
          params.set(TAB_PARAM_NAME, tab.id);
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              to={`${location.pathname}?${params.toString()}`}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              prefetch="intent"
              preventScrollReset
              replace
              className={
                isActive
                  ? 'tab-switcher__tab tab-switcher__tab--active'
                  : 'tab-switcher__tab'
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}