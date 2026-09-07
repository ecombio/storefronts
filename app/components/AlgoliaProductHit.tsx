import type {Hit} from 'react-instantsearch';
import {Link} from 'react-router';

interface ProductRecord {
  title: string;
  handle: string;
  vendor?: string;
  price?: number;
  image?: string;
  images?: string[];
  featured_image?: string;
}

export function ProductHit({hit}: {hit: Hit<ProductRecord>}) {
  const imageUrl = hit.image ?? hit.featured_image ?? hit.images?.[0];

  return (
    <Link to={`/products/${hit.handle}`} className="product-hit">
      {imageUrl && <img src={imageUrl} alt={hit.title} loading="lazy" />}
      <h3>{hit.title}</h3>
      {hit.vendor && <span className="product-hit-vendor">{hit.vendor}</span>}
      {hit.price != null && (
        <span className="product-hit-price">${hit.price}</span>
      )}
    </Link>
  );
}
