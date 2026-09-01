// app/templates/compare.tsx
//
// Client-rendered compare table. Reads the same `shopify_compare`
// localStorage snapshot that ProductCard.tsx writes to (via
// lib/compare.ts) and CompareBar.tsx mirrors — no server loader, since
// compare state is local-only for now.
//
// Scope note: only fields already cached in the compare snapshot (title,
// image, price) are shown. Richer attributes (vendor, options,
// description, availability) would need a loader that re-fetches full
// product data by handle — worth adding later if this needs to be more
// than a lightweight side-by-side.
import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {MetaFunction} from 'react-router';
import {
  type CompareEntry,
  COMPARE_KEY,
  readCompareList,
  writeCompareList,
  broadcastCompareUpdate,
} from '~/lib/compare';

export const meta: MetaFunction = () => {
  return [{title: 'Compare products'}];
};

export default function Compare() {
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

  function removeItem(id: string) {
    const next = items.filter((entry) => entry.id !== id);
    writeCompareList(next);
    broadcastCompareUpdate(next);
    setItems(next);
  }

  if (!hydrated) {
    // Avoid an SSR/hydration mismatch: localStorage doesn't exist on the
    // server, so render nothing meaningful until mounted client-side.
    return <div className="compare-page" />;
  }

  if (items.length === 0) {
    return (
      <div className="compare-page compare-page--empty">
        <h1>Compare products</h1>
        <p>You haven&rsquo;t added any products to compare yet.</p>
        <Link to="/collections/all">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="compare-page">
      <h1>Compare products</h1>

      <table className="compare-table">
        <thead>
          <tr>
            <th scope="col" className="compare-table__row-label" />
            {items.map((entry) => (
              <th scope="col" key={entry.id} className="compare-table__col">
                <button
                  type="button"
                  className="compare-table__remove"
                  aria-label={`Remove ${entry.title} from compare`}
                  onClick={() => removeItem(entry.id)}
                >
                  &times;
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Image</th>
            {items.map((entry) => (
              <td key={entry.id}>
                {entry.image ? (
                  <img
                    src={entry.image}
                    alt={entry.title}
                    className="compare-table__img"
                  />
                ) : (
                  <div className="compare-table__img-placeholder" aria-hidden="true" />
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Product</th>
            {items.map((entry) => (
              <td key={entry.id}>
                <Link to={`/products/${entry.handle}`}>{entry.title}</Link>
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">Price</th>
            {items.map((entry) => (
              <td key={entry.id}>
                {entry.price ? <Money data={entry.price} /> : '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}