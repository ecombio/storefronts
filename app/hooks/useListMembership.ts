// app/hooks/useListMembership.ts
//
// Extracted from ProductCard.tsx, where near-identical ~20-line blocks
// (initial sync, custom-event listener, cross-tab `storage` listener,
// cleanup) were duplicated once for compare and once for wishlist.
// Both lists follow the same shape — a localStorage-backed array of
// {id, ...} entries, mutated via lib/compare.ts or lib/wishlist.ts,
// broadcasting a CustomEvent on every change — so the sync logic only
// needs to be written once, parameterized by which list/event/storage
// key to watch. Anything added later (e.g. "recently viewed") that
// follows the same pattern can reuse this hook directly.

import {useEffect, useState} from 'react';

export function useListMembership<T extends {id: string}>(
  productId: string,
  storageKey: string,
  updatedEventName: string,
  read: () => T[],
) {
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    // Initial sync from the localStorage-backed list.
    setIsMember(read().some((entry) => entry.id === productId));

    // Fired by the list's mutator functions (addToCompare,
    // toggleWishlistEntry, etc.) whenever the list changes, anywhere
    // in the app — another card, CompareBar's remove buttons, the
    // /compare or /wishlist pages.
    function onUpdated(e: Event) {
      const list = (e as CustomEvent<{items: T[]}>).detail?.items ?? read();
      setIsMember(list.some((entry) => entry.id === productId));
    }

    // Cross-tab sync: the native `storage` event fires in *other* tabs
    // when localStorage changes in this one.
    function onStorage(e: StorageEvent) {
      if (e.key === storageKey) {
        setIsMember(read().some((entry) => entry.id === productId));
      }
    }

    document.addEventListener(updatedEventName, onUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener(updatedEventName, onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [productId, storageKey, updatedEventName, read]);

  return [isMember, setIsMember] as const;
}