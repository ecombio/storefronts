// app/snippets/ProductCard.tsx
//
// The site's real, interactive product card: image, price, rating,
// wishlist toggle, compare checkbox, quick-view trigger, and an add-
// to-cart form. Used directly in collection/search grids, and portaled
// into shoppable-embed slots inside blog articles (see Article.tsx).

import {useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {Image, Money, CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import type {FetcherWithComponents} from 'react-router';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {SaleBadge} from '~/snippets/SaleBadge';
import {StarRating} from '~/snippets/StarRating';
import {useAside} from '~/components/Aside';
import {hasDiscount} from '~/lib/pricing';
import {useListMembership} from '~/hooks/useListMembership';
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
  // Whether to show the vendor/brand name above the title.
  showVendor?: boolean;
  // Image loading strategy — 'eager' for above-the-fold cards (e.g.
  // the first row of a grid), 'lazy' (default) for everything else.
  loading?: 'eager' | 'lazy';
}

// Responsive image size hints matching common grid breakpoints, so the
// browser fetches an appropriately-sized image rather than the largest
// available at every viewport width.
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
    // Malformed/unexpected metafield value — fail closed to 0 rather
    // than throwing and breaking the whole card.
    return 0;
  }
}

// Parses the reviews-count metafield (plain numeric string) safely.
function parseCount(raw?: string | null): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
}

// Dispatches a DOM CustomEvent that some higher-level listener (a
// global QuickView modal controller, presumably) picks up to open the
// quick-view panel for this product. Decoupled via events rather than
// a prop-drilled callback, so ProductCard doesn't need to know about
// the modal system directly.
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

  // Optional custom metafields/extras this card conditionally renders.
  const etaText = product.etaText?.value;
  const isSponsored = product.sponsored?.value === 'true';

  // Memoized: JSON.parse + parseFloat on every render was wasted work
  // since these metafield values only change when `product` itself
  // does (a new product entirely — this card never gets a live patch
  // to just the review fields).
  const averageScore = useMemo(
    () => parseRating(product.reviewsRating?.value),
    [product.reviewsRating?.value],
  );
  const totalReviews = useMemo(
    () => parseCount(product.reviewsCount?.value),
    [product.reviewsCount?.value],
  );

  // Compare/wishlist membership + cross-tab/cross-component sync,
  // previously ~40 lines of duplicated useEffect logic — see
  // hooks/useListMembership.ts.
  const [isComparing, setIsComparing] = useListMembership<CompareEntry>(
    product.id,
    COMPARE_KEY,
    'compare:updated',
    readCompareList,
  );
  const [isWishlisted, setIsWishlisted] = useListMembership<WishlistEntry>(
    product.id,
    WISHLIST_KEY,
    'wishlist:updated',
    readWishlist,
  );

  // Shown briefly on the compare checkbox when COMPARE_MAX is hit, since
  // silently un-checking the box with no explanation (the old behavior)
  // left the user guessing why nothing happened.
  const [compareLimitHit, setCompareLimitHit] = useState(false);

  // Handles the compare checkbox toggling on/off.
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
        // Compare list is full (COMPARE_MAX reached) — revert the
        // checkbox and show the limit message instead of silently
        // failing.
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

  // Handles the wishlist heart button — toggleWishlistEntry flips the
  // stored state and reports back whether the product ended up
  // wishlisted or not, so this stays a single source of truth.
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

  // Cart line to add — empty array if there's no valid variant (e.g.
  // the product has no purchasable variant at all), which effectively
  // disables the add-to-cart form below.
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
            // No product image — render an empty placeholder box so
            // card layout/height stays consistent within a grid.
            <div className="product-card__img-placeholder" aria-hidden="true" />
          )}
        </Link>

        <span className="product-card__badge-slot">
          <SaleBadge price={price} compareAtPrice={compareAtPrice} />
        </span>

        {/* Wishlist toggle — reflects isWishlisted via aria-pressed for
            assistive tech, in addition to the visual state. */}
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

        {/* Quick-view trigger — dispatches the quickview:open event
            handled elsewhere rather than owning any modal state here. */}
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
          {/* Clicking the rating jumps to the reviews section on the
              full product page via a URL hash. */}
          <StarRating
            averageScore={averageScore}
            totalReviews={totalReviews}
            onReviewsClick={() => navigate(`${url}#reviews`)}
            hideWriteReview
          />
        </div>

        <div className="product-card__pricing">
          {/* FIXED: was a bare truthy check on `compareAtPrice`, which
              is an object with amount "0.00" (not null) when Shopify
              has no real compare-at price set — that rendered a
              nonsensical struck-through "$0.00". hasDiscount() checks
              the object exists AND its amount actually exceeds price,
              matching the same check SaleBadge.tsx already used. */}
          {hasDiscount(price, compareAtPrice) && (
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
            {/* CartForm handles the actual cart mutation; the render
                prop gives access to the fetcher so the button can
                reflect in-flight/disabled state. */}
            <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
              {(fetcher: FetcherWithComponents<any>) => (
                <button
                  type="submit"
                  className="product-card__atc-btn"
                  disabled={!variant.availableForSale || fetcher.state !== 'idle'}
                  onClick={() => {
                    // Open the cart aside immediately on click (rather
                    // than waiting for the mutation to resolve) for a
                    // snappier feel — only when the item is actually
                    // available to add.
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