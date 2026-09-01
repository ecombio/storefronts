// app/snippets/CompareBar.tsx
//
// Persistent, sticky-bottom bar for the product-compare feature.
// Mounted once, globally, in PageLayout.tsx (same pattern as QuickView)
// — NOT inside ProductCard.tsx.
//
// Data source: the same `shopify_compare` localStorage key that
// ProductCard.tsx's compare checkbox writes to. Kept in sync via:
//   - the in-tab `compare:updated` CustomEvent (fired by ProductCard.tsx
//     on every check/uncheck, and by this component on remove/clear)
//   - the native `storage` event, for cross-tab sync (fires in every
//     OTHER tab when the key changes in one tab — never in the tab that
//     made the change, so no dedupe/loop guard is needed)
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';

const COMPARE_KEY = 'shopify_compare';
const COMPARE_MAX = 5;

interface CompareEntry {
  id: string;
  handle: string;
  title: string;
  image: string;
  price: {amount: string; currencyCode: string} | null;
}

function readCompareList(): CompareEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(COMPARE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeCompareList(list: CompareEntry[]) {
  try {
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently,
    // matches the behavior in ProductCard.tsx
  }
}

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
      document.dispatchEvent(
        new CustomEvent('compare:updated', {
          bubbles: true,
          detail: {items: next},
        }),
      );
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    writeCompareList([]);
    document.dispatchEvent(
      new CustomEvent('compare:updated', {bubbles: true, detail: {items: []}}),
    );
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