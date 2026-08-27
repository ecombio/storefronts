import {Link} from 'react-router';

type BreadcrumbCollection = {
  handle: string;
  title: string;
};

/**
 * Ported from snippets/breadcrumbs.liquid.
 *
 * NOTE — simplified vs the Liquid version: the original picked a
 * "parent" (largest) and "child" (smallest) collection by
 * `collection.all_products_count`. The Storefront API doesn't expose
 * per-collection product counts on `product.collections` without an
 * extra query per collection, so this just takes the first two
 * collections in whatever order the API returns them (usually the
 * order they were added to the product). If you need count-based
 * ordering, query `collectionByHandle(handle) { productsCount }` for
 * each and sort client-side, or precompute in the loader.
 */
export function Breadcrumbs({
  productTitle,
  collections,
}: {
  productTitle: string;
  collections?: BreadcrumbCollection[] | null;
}) {
  const [parent, child] = collections ?? [];

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <div className="breadcrumbs-container">
        <Link to="/">Home</Link>

        {parent && (
          <>
            <span className="breadcrumb-divider" aria-hidden="true">
              <span className="divider-line" />
            </span>
            <Link to={`/collections/${parent.handle}`}>{parent.title}</Link>
          </>
        )}

        {child && (
          <>
            <span className="breadcrumb-divider" aria-hidden="true">
              <span className="divider-line" />
            </span>
            <Link to={`/collections/${child.handle}`}>{child.title}</Link>
          </>
        )}

        <span className="breadcrumb-divider" aria-hidden="true">
          <span className="divider-line" />
        </span>
        <span className="breadcrumb-current" aria-current="page">
          {productTitle}
        </span>
      </div>
    </nav>
  );
}
