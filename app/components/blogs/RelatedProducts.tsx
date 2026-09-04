// app/components/blogs/RelatedProducts.tsx
//
// "Related products" sidebar. Editor-curated, not algorithmic — the
// merchant picks the exact products via the article's
// custom.related_products metafield (Settings > Custom data >
// Articles > "Related Products", type: List > Product).
//
// This file only handles: (1) extracting the raw product ids off the
// metafield shape (getRelatedProductIds — call this in the loader,
// before the shoppable-products batch query, so these ids can ride
// along in that same request instead of firing a second one), and
// (2) rendering the resolved ProductCardFragment[] the loader hands
// back. If the merchant's list is empty (or every reference failed
// to resolve), the component renders nothing — no wrapper, no
// heading — so callers never need to gate it with a manual
// conditional.

import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {ProductCardFragment} from 'storefrontapi.generated';

export interface RelatedProductsArticle {
  relatedProducts?: {
    references?: {
      nodes?: Array<{id: string} | null> | null;
    } | null;
  } | null;
}

/**
 * Raw product GIDs (e.g. "gid://shopify/Product/123") off the
 * article's custom.related_products metafield, in the order the
 * merchant arranged them in the list. Returns [] if the metafield is
 * unset or empty — callers don't need to special-case that, an empty
 * array flows straight through to <RelatedProducts /> rendering null.
 */
export function getRelatedProductIds(article: RelatedProductsArticle): string[] {
  const nodes = article.relatedProducts?.references?.nodes ?? [];
  return nodes
    .filter((node): node is {id: string} => Boolean(node?.id))
    .map((node) => node.id);
}

interface RelatedProductsProps {
  products: ProductCardFragment[];
}

export default function RelatedProducts({products}: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <div className="article-related-products">
      <h3 className="article-related-products__heading">Related products</h3>
      <ul className="article-related-products__list">
        {products.map((product) => (
          <li key={product.id} className="article-related-products__item">
            {product.featuredImage && (
              <Image
                data={product.featuredImage}
                sizes="280px"
                aspectRatio="1/1"
                crop="center"
                className="article-related-products__image"
              />
            )}
            <span className="article-related-products__title">
              {product.title}
            </span>
            {product.priceRange?.minVariantPrice && (
              <span className="article-related-products__price">
                {product.priceRange.minVariantPrice.amount}{' '}
                {product.priceRange.minVariantPrice.currencyCode}
              </span>
            )}
            <Link
              to={`/products/${product.handle}`}
              className="article-related-products__cta"
            >
              See product
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}