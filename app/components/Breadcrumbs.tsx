import {Link} from 'react-router';

type BreadcrumbCollection = {
  handle: string;
  title: string;
};

// Parent/child are resolved by the caller (getBreadcrumbCollections in
// products.$handle.tsx): largest non-vendor collection = parent,
// smallest = child. This component just renders what it's given.

export function Breadcrumbs({
  productTitle,
  parentCollection,
  childCollection,
}: {
  productTitle: string;
  parentCollection?: BreadcrumbCollection | null;
  childCollection?: BreadcrumbCollection | null;
}) {
  const crumbs = [parentCollection, childCollection].filter(
    (c): c is BreadcrumbCollection => Boolean(c),
  );

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <div className="breadcrumbs-container">
        <Link to="/">Home</Link>

        {crumbs.map((crumb) => (
          <span key={crumb.handle}>
            <span className="breadcrumb-divider" aria-hidden="true">›</span>
            <Link to={`/collections/${crumb.handle}`}>{crumb.title}</Link>
          </span>
        ))}

        <span className="breadcrumb-divider" aria-hidden="true">›</span>
        <span className="breadcrumb-current" aria-current="page">
          {productTitle}
        </span>
      </div>
    </nav>
  );
}