// app/snippets/ProductCard.tsx
//
// STAGE 1: bare minimum card — image, title, price only. No add-to-cart,
// no wishlist, no compare, no metafields. Once this renders correctly
// on the homepage, move to Stage 2 (see ProductCardFragment.ts and the
// staged rebuild plan in chat).

import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {ProductCardFragment} from 'storefrontapi.generated';

export interface ProductCardProps {
  product: ProductCardFragment;
  showVendor?: boolean;
}

const IMAGE_SIZES =
  '(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';

export function ProductCard({product, showVendor = true}: ProductCardProps) {
  const url = `/products/${product.handle}`;
  const image = product.featuredImage;
  const price = product.priceRange.minVariantPrice;

  return (
    <div className="product-card" data-product-id={product.id} data-product-handle={product.handle}>
      <div className="product-card__img-zone">
        <Link to={url} className="product-card__image-wrapper" aria-label={product.title}>
          {image ? (
            <Image
              data={image}
              className="product-card__img product-card__img--primary"
              loading="lazy"
              sizes={IMAGE_SIZES}
              alt={image.altText ?? product.title}
            />
          ) : (
            <div className="product-card__img-placeholder" aria-hidden="true" />
          )}
        </Link>
      </div>

      <div className="product-card__body">
        {showVendor && product.vendor && (
          <span className="product-card__vendor">{product.vendor}</span>
        )}

        <Link to={url} className="product-card__title" title={product.title}>
          {product.title}
        </Link>

        <div className="product-card__pricing">
          <span className="product-card__price">
            <Money data={price} />
          </span>
        </div>
      </div>
    </div>
  );
}