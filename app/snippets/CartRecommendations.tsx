import {useEffect, useState} from 'react';
import {useFetcher, Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {ProductCardFragment} from 'storefrontapi.generated';

export function CartRecommendations({
  productId,
}: {
  productId: string | null;
}) {
  const fetcher = useFetcher<{products: ProductCardFragment[]}>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!productId) return;
    fetcher.load(
      `/api/cart-recommendations?productId=${encodeURIComponent(productId)}`,
    );
    setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const products = fetcher.data?.products ?? [];
  if (!productId || products.length === 0) return null;

  const product = products[index] as any;
  const image = product?.featuredImage;
  const price = product?.priceRange?.minVariantPrice;

  return (
    <div className="cart-recommendations">
      <div className="cart-recommendations-header">
        <h3>You may like</h3>
        {products.length > 1 && (
          <div className="cart-recommendations-nav">
            <button
              type="button"
              aria-label="Previous recommendation"
              onClick={() =>
                setIndex((i) => (i - 1 + products.length) % products.length)
              }
            >
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                <path
                  d="M6.5 1L2 6l4.5 5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next recommendation"
              onClick={() => setIndex((i) => (i + 1) % products.length)}
            >
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                <path
                  d="M1.5 1L6 6l-4.5 5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <Link
        to={`/products/${product.handle}`}
        className="cart-recommendations-card"
      >
        <div className="cart-recommendations-image">
          {image && (
            <Image
              data={image}
              aspectRatio="14/17"
              width={112}
              height={136}
              loading="lazy"
            />
          )}
        </div>
        <div className="cart-recommendations-info">
          <p className="cart-recommendations-name">{product.title}</p>
          {price && (
            <p className="cart-recommendations-price">
              <Money data={price} />
            </p>
          )}
        </div>
        <span className="cart-recommendations-zoom" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M9.5 9.5L13 13"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </Link>
    </div>
  );
}