// app/lib/compare.ts
//
// Shared read/write logic for the compare feature. Extracted from the
// copies that previously lived independently in ProductCard.tsx,
// CompareBar.tsx, and templates/compare.tsx — all three had their own
// COMPARE_KEY, COMPARE_MAX, CompareEntry, and get/save functions with
// nothing enforcing they stayed in sync. This is the single source of
// truth all three now import from. Mirrors lib/wishlist.ts exactly.

export const COMPARE_KEY = 'shopify_compare';
export const COMPARE_MAX = 5;

export interface CompareEntry {
  id: string;
  handle: string;
  title: string;
  image: string;
  price: {amount: string; currencyCode: string} | null;
}

export function readCompareList(): CompareEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(COMPARE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeCompareList(list: CompareEntry[]) {
  try {
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently
  }
}

/** Dispatch after any write, so every mounted consumer (ProductCard
 * instances, CompareBar, the /compare page) can update without each
 * one re-implementing the write + broadcast pairing. */
export function broadcastCompareUpdate(items: CompareEntry[]) {
  document.dispatchEvent(
    new CustomEvent('compare:updated', {bubbles: true, detail: {items}}),
  );
}

/**
 * Attempts to add `entry` to the compare list. Returns `false` (and
 * leaves the list untouched) if the list is already at COMPARE_MAX —
 * callers are responsible for surfacing that to the user, since a
 * silent no-op is what caused issue #4 (cap-hit gives no feedback).
 */
export function addToCompare(entry: CompareEntry): {list: CompareEntry[]; added: boolean} {
  const list = readCompareList();
  if (list.some((e) => e.id === entry.id)) {
    return {list, added: true};
  }
  if (list.length >= COMPARE_MAX) {
    return {list, added: false};
  }
  list.push(entry);
  writeCompareList(list);
  broadcastCompareUpdate(list);
  return {list, added: true};
}

export function removeFromCompare(id: string): CompareEntry[] {
  const list = readCompareList().filter((e) => e.id !== id);
  writeCompareList(list);
  broadcastCompareUpdate(list);
  return list;
}