// app/sections/CollectionToolbar.tsx

import {useEffect, useRef} from 'react';
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
 *
 * `sticky-under-header` (app/assets/sticky-header.css) sticks this
 * below the header and closes the gap when the header hides on
 * scroll. On top of that, this component measures its OWN rendered
 * height via ResizeObserver and writes it to `--toolbar-height` on
 * <html> — CollectionFilters.tsx reads that var to stick itself below
 * the toolbar rather than underneath/behind it. Without this, the
 * filter panel and the toolbar both compute their sticky offset from
 * only the header's height and end up overlapping once both are
 * stuck (toolbar tabs rendering on top of the filter's "Filters"
 * heading).
 */
export function CollectionToolbar({activeTab}: CollectionToolbarProps) {
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