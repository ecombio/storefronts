// Ported from snippets/breadcrumbs.liquid — picks a "parent" and
// "child" collection for PDP breadcrumbs by excluding the product's
// vendor auto-collection, then taking the largest/smallest by size.

export const BREADCRUMB_COLLECTIONS_TO_FETCH = 20;

// This store's Storefront API version has no `productsCount` field on
// Collection, so size is approximated by fetching up to this many
// product ids per collection. Two collections both at/over this cap
// tie and lose relative ranking — raise if that causes a wrong
// parent/child pick.
export const BREADCRUMB_COLLECTION_PRODUCTS_CAP = 50;

// JS port of Liquid's `| handleize` filter. Doesn't transliterate
// accented characters like Shopify's real handleize does.
function handleize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type BreadcrumbCollectionCandidate = {
  handle: string;
  title: string;
  products?: {nodes?: {id: string}[] | null} | null;
};

export function getBreadcrumbCollections(product: {
  vendor?: string | null;
  collections?: {nodes?: BreadcrumbCollectionCandidate[] | null} | null;
}): {
  parentCollection: BreadcrumbCollectionCandidate | null;
  childCollection: BreadcrumbCollectionCandidate | null;
} {
  const collections = product.collections?.nodes ?? [];
  const vendorHandle = product.vendor ? handleize(product.vendor) : '';
  const sizeOf = (col: BreadcrumbCollectionCandidate) =>
    col.products?.nodes?.length ?? 0;

  let parentCollection: BreadcrumbCollectionCandidate | null = null;
  let largestCount = -1;

  for (const col of collections) {
    if (col.handle === vendorHandle) continue;
    const count = sizeOf(col);
    if (count > largestCount) {
      parentCollection = col;
      largestCount = count;
    }
  }

  let childCollection: BreadcrumbCollectionCandidate | null = null;
  let smallestCount = Infinity;

  for (const col of collections) {
    if (col.handle === vendorHandle) continue;
    if (col.handle === parentCollection?.handle) continue;
    const count = sizeOf(col);
    if (count < smallestCount) {
      childCollection = col;
      smallestCount = count;
    }
  }

  return {parentCollection, childCollection};
}
