// app/snippets/ProductCard.tsx

import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {Image, Money, CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import type {FetcherWithComponents} from 'react-router';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {SaleBadge} from '~/snippets/SaleBadge';
import {StarRating} from '~/snippets/StarRating';
import {useAside} from '~/components/Aside';
import {
  type CompareEntry,
  COMPARE_KEY,
  COMPARE_MAX,
  readCompareList,
  addToCompare,
  removeFromCompare,
} from '~/lib/compare';
import {
  type WishlistEntry,
  WISHLIST_KEY,
  readWishlist,
  toggleWishlistEntry,
} from '~/lib/wishlist';

export interface ProductCardProps {
  product: ProductCardFragment;
  showVendor?: boolean;
  loading?: 'eager' | 'lazy';
}

const IMAGE_SIZES =
  '(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';

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
  // Shown briefly on the compare checkbox when COMPARE_MAX is hit, since
  // silently un-checking the box with no explanation (the old behavior)
  // left the user guessing why nothing happened.
  const [compareLimitHit, setCompareLimitHit] = useState(false);

  // Sync on mount AND whenever compare/wishlist changes from anywhere
  // else — another card, CompareBar/WishlistBar's remove buttons, the
  // /compare or /wishlist pages, or another tab via the native `storage`
  // event. Previously this only ran once on mount, so toggling a product
  // off from CompareBar (for example) left this card's checkbox showing
  // checked until the page rerendered or navigated.
  useEffect(() => {
    setIsComparing(readCompareList().some((entry) => entry.id === product.id));
    setIsWishlisted(readWishlist().some((entry) => entry.id === product.id));

    function onCompareUpdated(e: Event) {
      const detail = (e as CustomEvent<{items: CompareEntry[]}>).detail;
      const list = detail?.items ?? readCompareList();
      setIsComparing(list.some((entry) => entry.id === product.id));
    }

    function onWishlistUpdated(e: Event) {
      const detail = (e as CustomEvent<{items: WishlistEntry[]}>).detail;
      const list = detail?.items ?? readWishlist();
      setIsWishlisted(list.some((entry) => entry.id === product.id));
    }

    function onStorage(e: StorageEvent) {
      if (e.key === COMPARE_KEY) {
        setIsComparing(readCompareList().some((entry) => entry.id === product.id));
      }
      if (e.key === WISHLIST_KEY) {
        setIsWishlisted(readWishlist().some((entry) => entry.id === product.id));
      }
    }

    document.addEventListener('compare:updated', onCompareUpdated);
    document.addEventListener('wishlist:updated', onWishlistUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('compare:updated', onCompareUpdated);
      document.removeEventListener('wishlist:updated', onWishlistUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [product.id]);

  function handleCompareChange(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;

    if (checked) {
      const entry: CompareEntry = {
        id: product.id,
        handle: product.handle,
        title: product.title,
        image: image?.url ?? '',
        price: price ? {amount: price.amount, currencyCode: price.currencyCode} : null,
      };
      const {added} = addToCompare(entry);
      if (!added) {
        e.target.checked = false;
        setCompareLimitHit(true);
        window.setTimeout(() => setCompareLimitHit(false), 2500);
        return;
      }
      setIsComparing(true);
    } else {
      removeFromCompare(product.id);
      setIsComparing(false);
    }
  }

  function handleWishlistToggle() {
    const entry: WishlistEntry = {
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: image?.url ?? '',
      price: price ? {amount: price.amount, currencyCode: price.currencyCode} : null,
    };
    const {wishlisted} = toggleWishlistEntry(entry);
    setIsWishlisted(wishlisted);
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
              <span className="product-card__compare-text">
                {compareLimitHit ? `Limit reached (${COMPARE_MAX})` : 'Compare'}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}