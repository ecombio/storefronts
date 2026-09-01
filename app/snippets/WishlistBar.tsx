// app/snippets/WishlistBar.tsx
//
// Persistent, sticky-bottom bar for the wishlist feature. Mounted once,
// globally, in PageLayout.tsx — same pattern as CompareBar.tsx.
//
// Data source: the `shopify_wishlist` localStorage key, via lib/wishlist.ts.
// Kept in sync via:
//   - the in-tab `wishlist:updated` CustomEvent (fired by lib/wishlist.ts
//     on every toggle/remove/clear)
//   - the native `storage` event, for cross-tab sync (fires in every
//     OTHER tab when the key changes in one tab — never in the tab that
//     made the change, so no dedupe/loop guard is needed)
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';
import {
  type WishlistEntry,
  WISHLIST_KEY,
  readWishlist,
  writeWishlist,
  broadcastWishlistUpdate,
} from '~/lib/wishlist';

export function WishlistBar() {
  // Start empty on both the server render and the first client render so
  // SSR output matches hydration output (localStorage doesn't exist on
  // the server). The real list loads in the effect below, right after
  // mount, and `hydrated` gates visibility until then to avoid a flash.
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readWishlist());
    setHydrated(true);

    function onWishlistUpdated(e: Event) {
      const detail = (e as CustomEvent<{items: WishlistEntry[]}>).detail;
      setItems(detail?.items ?? readWishlist());
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== WISHLIST_KEY) return;
      setItems(readWishlist());
    }

    document.addEventListener('wishlist:updated', onWishlistUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('wishlist:updated', onWishlistUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => {
      const next = current.filter((entry) => entry.id !== id);
      writeWishlist(next);
      broadcastWishlistUpdate(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    writeWishlist([]);
    broadcastWishlistUpdate([]);
    setItems([]);
  }, []);

  // Hide entirely when empty — including pre-hydration — same as CompareBar.
  if (!hydrated || items.length === 0) return null;

  return (
    <div className="wishlist-bar" role="region" aria-label="Wishlist">
      <ul className="wishlist-bar__list">
        {items.map((entry) => (
          <li key={entry.id} className="wishlist-bar__item">
            <button
              type="button"
              className="wishlist-bar__remove"
              aria-label={`Remove ${entry.title} from wishlist`}
              onClick={() => removeItem(entry.id)}
            >
              &times;
            </button>
            {entry.image ? (
              <img
                src={entry.image}
                alt=""
                className="wishlist-bar__thumb"
                width={32}
                height={32}
              />
            ) : (
              <div
                className="wishlist-bar__thumb wishlist-bar__thumb--placeholder"
                aria-hidden="true"
              />
            )}
            <span className="wishlist-bar__title">{entry.title}</span>
          </li>
        ))}
      </ul>

      <div className="wishlist-bar__actions">
        <button type="button" className="wishlist-bar__clear" onClick={clearAll}>
          Clear all
        </button>
        <Link to="/wishlist" className="wishlist-bar__cta">
          Wishlist ({items.length})
        </Link>
      </div>
    </div>
  );
}