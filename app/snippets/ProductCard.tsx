// app/snippets/ProductCard.tsx

import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {Image, Money, CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import type {FetcherWithComponents} from 'react-router';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {SaleBadge} from '~/snippets/SaleBadge';
import {StarRating} from '~/snippets/StarRating';
import {useAside} from '~/components/Aside';

export interface ProductCardProps {
  product: ProductCardFragment;
  showVendor?: boolean;
  loading?: 'eager' | 'lazy';
}

const IMAGE_SIZES =
  '(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';

const COMPARE_KEY = 'shopify_compare';
const COMPARE_MAX = 5;
const WISHLIST_KEY = 'shopify_wishlist';

interface CompareEntry {
  id: string;
  handle: string;
  title: string;
  image: string;
  price: string;
}

interface WishlistEntry {
  id: string;
  handle: string;
}

function getCompareList(): CompareEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(COMPARE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveCompareList(list: CompareEntry[]) {
  try {
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently
  }
}

function getWishlistList(): WishlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveWishlistList(list: WishlistEntry[]) {
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable — fail silently
  }
}

// Shopify's standard `reviews.rating` metafield value is a JSON string:
// {"value":"4.3","scale_min":"1","scale_max":"5"}
function parseRating(raw?: string | null): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return parseFloat(parsed?.value ?? '0') || 0;
  } catch {
    return 0;
  }
}

function parseCount(raw?: string | null): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
}

function handleQuickViewClick(
  e: React.MouseEvent<HTMLButtonElement>,
  handle: string,
) {
  document.dispatchEvent(
    new CustomEvent('quickview:open', {
      bubbles: true,
      detail: {handle, trigger: e.currentTarget},
    }),
  );
}

export function ProductCard({product, showVendor = true, loading = 'lazy'}: ProductCardProps) {
  const url = `/products/${product.handle}`;
  const image = product.featuredImage;
  const price = product.priceRange.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;
  const variant = product.selectedOrFirstAvailableVariant;
  const navigate = useNavigate();
  const {open: openAside} = useAside();

  const etaText = product.etaText?.value;
  const isSponsored = product.sponsored?.value === 'true';
  const averageScore = parseRating(product.reviewsRating?.value);
  const totalReviews = parseCount(product.reviewsCount?.value);

  const [isComparing, setIsComparing] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const compareList = getCompareList();
    setIsComparing(compareList.some((entry) => entry.id === product.id));

    const wishlist = getWishlistList();
    setIsWishlisted(wishlist.some((entry) => entry.id === product.id));
  }, [product.id]);

  function handleCompareChange(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    const list = getCompareList();
    const idx = list.findIndex((entry) => entry.id === product.id);

    if (checked) {
      if (list.length >= COMPARE_MAX) {
        e.target.checked = false;
        return;
      }
      list.push({
        id: product.id,
        handle: product.handle,
        title: product.title,
        image: image?.url ?? '',
        price: price ? `${price.amount} ${price.currencyCode}` : '',
      });
    } else if (idx !== -1) {
      list.splice(idx, 1);
    }

    saveCompareList(list);
    setIsComparing(checked);
    document.dispatchEvent(
      new CustomEvent('compare:updated', {bubbles: true, detail: {items: list}}),
    );
  }

  function handleWishlistToggle() {
    const list = getWishlistList();
    const idx = list.findIndex((entry) => entry.id === product.id);
    const next = !isWishlisted;

    if (next) {
      if (idx === -1) list.push({id: product.id, handle: product.handle});
    } else if (idx !== -1) {
      list.splice(idx, 1);
    }

    saveWishlistList(list);
    setIsWishlisted(next);
    document.dispatchEvent(
      new CustomEvent('wishlist:toggle', {
        bubbles: true,
        detail: {productId: product.id, wishlisted: next},
      }),
    );
  }

  const lines: Array<OptimisticCartLineInput> = variant
    ? [{merchandiseId: variant.id, quantity: 1}]
    : [];

  return (
    <div className="product-card" data-product-id={product.id} data-product-handle={product.handle}>
      <div className="product-card__img-zone">
        {isSponsored && (
          <span className="product-card__sponsored-label">Sponsored</span>
        )}

        <Link to={url} className="product-card__image-wrapper" aria-label={product.title}>
          {image ? (
            <Image
              data={image}
              className="product-card__img product-card__img--primary"
              loading={loading}
              sizes={IMAGE_SIZES}
              alt={image.altText ?? product.title}
            />
          ) : (
            <div className="product-card__img-placeholder" aria-hidden="true" />
          )}
        </Link>

        <span className="product-card__badge-slot">
          <SaleBadge price={price} compareAtPrice={compareAtPrice} />
        </span>

        <button
          type="button"
          className="product-card__wishlist-btn"
          aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          aria-pressed={isWishlisted}
          data-wishlist-btn
          onClick={handleWishlistToggle}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              className="product-card__wishlist-path"
              d="M9 15.5S2 11 2 6a4 4 0 0 1 7-2.65A4 4 0 0 1 16 6c0 5-7 9.5-7 9.5z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          type="button"
          className="product-card__quickview-btn"
          aria-label={`Quick view ${product.title}`}
          data-quickview-btn
          data-product-handle={product.handle}
          onClick={(e) => handleQuickViewClick(e, product.handle)}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <ellipse cx="7.5" cy="7.5" rx="6" ry="4.5" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          Quick view
        </button>
      </div>

      <div className="product-card__body">
        {showVendor && product.vendor && (
          <span className="product-card__vendor">{product.vendor}</span>
        )}

        <Link to={url} className="product-card__title" title={product.title}>
          {product.title}
        </Link>

        <div className="product-card__reviews">
          <StarRating
            averageScore={averageScore}
            totalReviews={totalReviews}
            onReviewsClick={() => navigate(`${url}#reviews`)}
          />
        </div>

        <div className="product-card__pricing">
          {compareAtPrice && (
            <span className="product-card__price product-card__price--compare">
              <s><Money data={compareAtPrice} /></s>
            </span>
          )}
          <span className="product-card__price product-card__price--sale">
            <Money data={price} />
          </span>
        </div>

        {etaText && (
          <div className="product-card__eta" aria-label="Estimated delivery">
            <span>{etaText}</span>
          </div>
        )}

        {variant && (
          <div className="product-card__bottom-row">
            <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
              {(fetcher: FetcherWithComponents<any>) => (
                <button
                  type="submit"
                  className="product-card__atc-btn"
                  disabled={!variant.availableForSale || fetcher.state !== 'idle'}
                  onClick={() => {
                    if (variant.availableForSale) openAside('cart');
                  }}
                >
                  {variant.availableForSale ? 'Add to cart' : 'Sold out'}
                </button>
              )}
            </CartForm>

            <label className="product-card__compare-label">
              <input
                type="checkbox"
                className="product-card__compare-checkbox"
                checked={isComparing}
                onChange={handleCompareChange}
                aria-label={`Compare ${product.title}`}
              />
              <span className="product-card__compare-text">Compare</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
