// app/templates/wishlist.tsx
//
// Client-rendered wishlist page. Reads the same `shopify_wishlist`
// localStorage snapshot that ProductCard.tsx writes to (via
// lib/wishlist.ts) and WishlistBar.tsx mirrors — no server loader,
// since wishlist state is local-only for now (same scope note as
// compare.tsx: only fields cached in the snapshot are shown).
import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {MetaFunction} from 'react-router';
import {
  type WishlistEntry,
  WISHLIST_KEY,
  readWishlist,
  writeWishlist,
  broadcastWishlistUpdate,
} from '~/lib/wishlist';

export const meta: MetaFunction = () => {
  return [{title: 'Wishlist'}];
};

export default function Wishlist() {
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

  function removeItem(id: string) {
    const next = items.filter((entry) => entry.id !== id);
    writeWishlist(next);
    broadcastWishlistUpdate(next);
    setItems(next);
  }

  if (!hydrated) {
    // Avoid an SSR/hydration mismatch: localStorage doesn't exist on the
    // server, so render nothing meaningful until mounted client-side.
    return <div className="wishlist-page" />;
  }

  if (items.length === 0) {
    return (
      <div className="wishlist-page wishlist-page--empty">
        <h1>Wishlist</h1>
        <p>You haven&rsquo;t added any products to your wishlist yet.</p>
        <Link to="/collections/all">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h1>Wishlist</h1>

      <div className="wishlist-grid">
        {items.map((entry) => (
          <div key={entry.id} className="wishlist-grid__item">
            <button
              type="button"
              className="wishlist-grid__remove"
              aria-label={`Remove ${entry.title} from wishlist`}
              onClick={() => removeItem(entry.id)}
            >
              &times;
            </button>
            <Link to={`/products/${entry.handle}`} className="wishlist-grid__link">
              {entry.image ? (
                <img
                  src={entry.image}
                  alt={entry.title}
                  className="wishlist-grid__img"
                />
              ) : (
                <div className="wishlist-grid__img-placeholder" aria-hidden="true" />
              )}
              <span className="wishlist-grid__title">{entry.title}</span>
              {entry.price && (
                <span className="wishlist-grid__price">
                  <Money data={entry.price} />
                </span>
              )}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}