// app/sections/CollectionToolbar.tsx

import {Link, useLocation} from 'react-router';

const TAB_PARAM_NAME = 'tab';

export type CollectionTab = 'products' | 'articles';

interface CollectionToolbarProps {
  activeTab: CollectionTab;
}

const TABS: {id: CollectionTab; label: string}[] = [
  {id: 'products', label: 'Products'},
  {id: 'articles', label: 'Expert Advice'},
];

/**
 * Tab switcher between a collection's product grid and its linked
 * articles (from the collection's `custom.posts` metafield). Tab
 * state lives in the `?tab=` URL param, same pattern CollectionFilters
 * uses for its own params, so it's shareable and needs no client JS.
 */
export function CollectionToolbar({activeTab}: CollectionToolbarProps) {
  const location = useLocation();

  return (
    <div className="collection-toolbar" role="navigation" aria-label="Collection navigation">
      <div className="tab-switcher" role="tablist" aria-label="Collection view">
        {TABS.map((tab) => {
          const params = new URLSearchParams(location.search);
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