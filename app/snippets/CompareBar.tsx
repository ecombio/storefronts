// app/snippets/CompareBar.tsx
//
// Persistent, sticky-bottom bar for the product-compare feature.
// Mounted once, globally, in PageLayout.tsx (same pattern as QuickView)
// — NOT inside ProductCard.tsx.
//
// Data source: the `shopify_compare` localStorage key, via lib/compare.ts
// (previously this file had its own duplicated copy of the read/write
// logic — now shared with ProductCard.tsx and templates/compare.tsx).
// Kept in sync via:
//   - the in-tab `compare:updated` CustomEvent (fired by lib/compare.ts
//     on every add/remove/clear)
//   - the native `storage` event, for cross-tab sync (fires in every
//     OTHER tab when the key changes in one tab — never in the tab that
//     made the change, so no dedupe/loop guard is needed)
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';
import {
  type CompareEntry,
  COMPARE_KEY,
  readCompareList,
  writeCompareList,
  broadcastCompareUpdate,
  COMPARE_MAX,
} from '~/lib/compare';

export function CompareBar() {
  // Start empty on both the server render and the first client render so
  // SSR output matches hydration output (localStorage doesn't exist on
  // the server). The real list loads in the effect below, right after
  // mount, and `hydrated` gates visibility until then to avoid a flash.
  const [items, setItems] = useState<CompareEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readCompareList());
    setHydrated(true);

    function onCompareUpdated(e: Event) {
      const detail = (e as CustomEvent<{items: CompareEntry[]}>).detail;
      setItems(detail?.items ?? readCompareList());
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== COMPARE_KEY) return;
      setItems(readCompareList());
    }

    document.addEventListener('compare:updated', onCompareUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('compare:updated', onCompareUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => {
      const next = current.filter((entry) => entry.id !== id);
      writeCompareList(next);
      broadcastCompareUpdate(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    writeCompareList([]);
    broadcastCompareUpdate([]);
    setItems([]);
  }, []);

  // Hide entirely when empty — including pre-hydration — per spec.
  if (!hydrated || items.length === 0) return null;

  return (
    <div className="compare-bar" role="region" aria-label="Product comparison">
      <ul className="compare-bar__list">
        {items.map((entry) => (
          <li key={entry.id} className="compare-bar__item">
            <button
              type="button"
              className="compare-bar__remove"
              aria-label={`Remove ${entry.title} from compare`}
              onClick={() => removeItem(entry.id)}
            >
              &times;
            </button>
            {entry.image ? (
              <img
                src={entry.image}
                alt=""
                className="compare-bar__thumb"
                width={32}
                height={32}
              />
            ) : (
              <div
                className="compare-bar__thumb compare-bar__thumb--placeholder"
                aria-hidden="true"
              />
            )}
            <span className="compare-bar__title">{entry.title}</span>
          </li>
        ))}
      </ul>

      <div className="compare-bar__actions">
        <button type="button" className="compare-bar__clear" onClick={clearAll}>
          Clear all
        </button>
        <Link to="/compare" className="compare-bar__cta">
          Compare ({items.length}/{COMPARE_MAX})
        </Link>
      </div>
    </div>
  );
}