// app/lib/wishlist.ts
//
// Shared read/write logic for the wishlist feature. Single source of
// truth for the storage key and entry shape — previously this logic
// was duplicated inline in ProductCard.tsx with a thinner {id, handle}
// entry; centralizing it here (and upgrading the entry shape to match
// CompareEntry) so ProductCard, the header's Wishlist icon
// (Header.tsx), and the /wishlist page all read/write the same thing
// the same way.

export const WISHLIST_KEY = 'shopify_wishlist';

export interface WishlistEntry {
  id: string;
  handle: string;
  title: string;
  image: string;
  price: {amount: string; currencyCode: string} | null;
}

export function readWishlist(): WishlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeWishlist(list: WishlistEntry[]) {
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently,
    // matches the behavior in lib/compare.ts / ProductCard.tsx
  }
}

/** Dispatch after any write, so every mounted consumer (ProductCard
 * instances, the header's Wishlist icon, the /wishlist page) can
 * update without each one re-implementing the write + broadcast
 * pairing. */
export function broadcastWishlistUpdate(items: WishlistEntry[]) {
  document.dispatchEvent(
    new CustomEvent('wishlist:updated', {bubbles: true, detail: {items}}),
  );
}

export function toggleWishlistEntry(
  entry: WishlistEntry,
): {list: WishlistEntry[]; wishlisted: boolean} {
  const list = readWishlist();
  const idx = list.findIndex((e) => e.id === entry.id);
  const wishlisted = idx === -1;

  if (wishlisted) {
    list.push(entry);
  } else {
    list.splice(idx, 1);
  }

  writeWishlist(list);
  broadcastWishlistUpdate(list);
  return {list, wishlisted};
}