
## app\snippets\ProductCard.tsx

```tsx
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

```

## app\snippets\ProductItem.tsx

```tsx
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export function ProductItem({
  product,
  loading,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment
    | RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  return (
    <Link
      className="product-item"
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      {image && (
        <Image
          alt={image.altText || product.title}
          aspectRatio="1/1"
          data={image}
          loading={loading}
          sizes="(min-width: 45em) 400px, 100vw"
        />
      )}
      <h4>{product.title}</h4>
      <small>
        <Money data={product.priceRange.minVariantPrice} />
      </small>
    </Link>
  );
}

```

## app\snippets\ProductPrice.tsx

```tsx
import {Money} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
}) {
  return (
    <div aria-label="Price" className="product-price" role="group">
      {compareAtPrice ? (
        <div className="product-price-on-sale">
          {price ? <Money data={price} /> : null}
          <s>
            <Money data={compareAtPrice} />
          </s>
        </div>
      ) : price ? (
        <Money data={price} />
      ) : (
        <span>&nbsp;</span>
      )}
    </div>
  );
}

```

## app\snippets\SaleBadge.tsx

```tsx
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

/**
 * "Save X%" badge, shown above the product title when the selected
 * variant has a compareAtPrice higher than its current price.
 * Renders nothing if there's no discount to show.
 */
export function SaleBadge({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2 | null;
  compareAtPrice?: MoneyV2 | null;
}) {
  if (!price || !compareAtPrice) return null;

  const priceAmount = parseFloat(price.amount);
  const compareAmount = parseFloat(compareAtPrice.amount);

  if (!(compareAmount > priceAmount)) return null;

  const percentOff = Math.round((1 - priceAmount / compareAmount) * 100);

  if (percentOff <= 0) return null;

  return <span className="sale-badge">Save {percentOff}%</span>;
}
```

## app\graphql\ProductCardFragment.tsx

```tsx
// app/graphql/ProductCardFragment.tsx
//
// STAGE 3: adds ETA, sponsored, and review-stat metafields.
// Reviews come from the standard `reviews.rating` / `reviews.rating_count`
// metafields (whatever review app syncs those) — no live Yotpo call in
// the collection loader. Confirm namespace/key in Settings > Custom data
// > Products if these come back null.

export const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCard on Product {
    id
    handle
    title
    vendor
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      availableForSale
    }
    etaText: metafield(namespace: "custom", key: "eta_text") {
      value
    }
    sponsored: metafield(namespace: "custom", key: "sponsored") {
      value
    }
    reviewsRating: metafield(namespace: "reviews", key: "rating") {
      value
    }
    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {
      value
    }
  }
` as const;
```

## app\assets\product-card.css

```tsx
/* app/assets/product-card.css */

.product-card,
.product-card *,
.product-card *::before,
.product-card *::after {
  box-sizing: border-box;
}

.product-card {
  --product-card-surface:        #ffffff;
  --product-card-border:         #E5E7EB;
  --product-card-text:           #111827;
  --product-card-text-secondary: #6B7280;
  --product-card-sale:           #DC2626;
  --product-card-save:           #D97706;
  --product-card-radius:         10px;

  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: var(--product-card-radius);
  background: var(--product-card-surface);
  border: 1px solid var(--product-card-border);
  overflow: hidden;
  height: 100%;
}

.product-card__img-zone {
  position: relative;
  flex-shrink: 0;
  background: #F9FAFB;
  overflow: hidden;
  aspect-ratio: 1;
}

.product-card__image-wrapper {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
}

.product-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.product-card__img--primary {
  position: relative;
  z-index: 1;
}

.product-card__img-placeholder {
  width: 100%;
  height: 100%;
  background: #F3F4F6;
}

/* Retargeted from the old inline badge to wrap SaleBadge.tsx's
   `.sale-badge` span, which ships with no positioning of its own. */
.product-card__badge-slot {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.product-card__badge-slot .sale-badge {
  background: var(--product-card-sale);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 4px;
  pointer-events: none;
  text-transform: uppercase;
}

.product-card__sponsored-label {
  position: absolute;
  top: 8px;
  right: 44px; /* clears the wishlist corner */
  background: #111827;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 4px;
  z-index: 2;
}

.product-card__wishlist-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(4px);
  color: var(--product-card-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  opacity: 0;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.product-card:hover .product-card__wishlist-btn,
.product-card__wishlist-btn[aria-pressed="true"] {
  opacity: 1;
}

.product-card__wishlist-btn[aria-pressed="true"] {
  color: #EF4444;
}

.product-card__wishlist-btn[aria-pressed="true"] .product-card__wishlist-path {
  fill: #EF4444;
  stroke: #EF4444;
}

.product-card__wishlist-btn:hover {
  background: #fff;
  color: #EF4444;
}

@media (hover: none) {
  .product-card__wishlist-btn {
    opacity: 1;
  }
}

.product-card__quickview-btn {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%) translateY(6px);
  opacity: 0;
  pointer-events: none;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  background: #fff;
  color: var(--product-card-text);
  border: 1px solid var(--product-card-border);
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease,
              border-color 0.15s, background 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.product-card__quickview-btn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.product-card__img-zone:hover .product-card__quickview-btn,
.product-card__img-zone:focus-within .product-card__quickview-btn {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}

.product-card__quickview-btn:hover {
  background: var(--product-card-text);
  color: #fff;
  border-color: var(--product-card-text);
}

@media (hover: none) {
  .product-card__quickview-btn {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }
}

.product-card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding: 12px 12px 14px;
  gap: 6px;
}

.product-card__vendor {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--product-card-text-secondary);
  line-height: 1;
}

.product-card__title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--product-card-text);
  text-decoration: none;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}

.product-card__title:hover {
  text-decoration: underline;
}

.product-card__reviews {
  min-height: 18px;
  font-size: 0.75rem;
  max-width: 100%;
  overflow: hidden;
}

.product-card__pricing {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.product-card__price {
  font-size: 1rem;
  font-weight: 700;
  color: var(--product-card-text);
  line-height: 1;
}

.product-card__price--compare {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--product-card-text-secondary);
  line-height: 1.3;
}

.product-card__price--sale {
  color: var(--product-card-sale);
}

.product-card__save-badge {
  display: inline-block;
  align-self: flex-start;
  background: #FEF3C7;
  color: var(--product-card-save);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.product-card__eta {
  font-size: 0.72rem;
  color: var(--product-card-text-secondary);
  line-height: 1.3;
}

.product-card__bottom-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

/* Hardened: the class selector alone was losing to a later-loaded
   global button reset (Tailwind preflight / theme.css), producing the
   oversized plain button seen in testing. `.product-card` scoping plus
   `:where()`-free duplication of the class raises specificity enough
   to win regardless of load order, without resorting to !important on
   every property. If this still loses, the real fix is import order:
   product-card.css must be linked AFTER tailwind.css/theme.css in
   app/root.tsx, since Tailwind's preflight strips button defaults and
   anything loaded after it wins ties on equal specificity. */
.product-card .product-card__atc-btn.product-card__atc-btn {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: #F5C518;
  color: #111;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.product-card .product-card__atc-btn.product-card__atc-btn:hover:not(:disabled) {
  background: #E6B800;
}

.product-card .product-card__atc-btn.product-card__atc-btn:disabled {
  background: var(--product-card-border);
  color: var(--product-card-text-secondary);
  cursor: not-allowed;
}

.product-card__compare-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 0.72rem;
  color: var(--product-card-text-secondary);
  white-space: nowrap;
  user-select: none;
  flex-shrink: 0;
}

.product-card__compare-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.product-card__compare-text {
  line-height: 1;
}

/* Mobile tier (<640px) - see theme.css --bp-sm. */
@media (max-width: 639px) {
  .product-card__body {
    padding: 10px 10px 12px;
    gap: 5px;
  }

  .product-card__price {
    font-size: 0.9rem;
  }

  .product-card__bottom-row {
    flex-wrap: wrap;
  }

  .product-card__compare-label {
    flex-basis: 100%;
  }

  .product-card__wishlist-btn {
    opacity: 1;
  }
}

/* Tablet tier (640-1023px) - see theme.css --bp-sm / --bp-lg.
   No values differ from desktop yet - placeholder so tablet isn't
   silently absent per the doc's checklist. Fill in once there's a
   real tablet pass. */
@media (min-width: 640px) and (max-width: 1023px) {
}
```

## app\snippets\QuickView.tsx

```tsx
// app/snippets/QuickView.tsx
//
// Listens for the 'quickview:open' CustomEvent dispatched by
// ProductCard.tsx, fetches full product data from
// /api/quickview/:handle, and renders it inside the shared <Aside>
// shell (type="quickview") as a centered modal (see quickview.css).
//
// Mount this once, globally, in PageLayout.tsx alongside the other
// <Aside> instances (cart, search, mobile) — NOT inside ProductCard.
import {useEffect, useRef, useState} from 'react';
import {Link, useFetcher} from 'react-router';
import {Image, Money, getProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {Aside, useAside} from '~/components/Aside';
import {StarRating} from '~/snippets/StarRating';
import {AddToCartButton} from '~/snippets/AddToCartButton';

// Shopify's standard `reviews.rating` metafield value is a JSON string:
// {"value":"4.3","scale_min":"1","scale_max":"5"}
// (Same parsing logic as ProductCard.tsx — kept local to avoid a
// cross-import; consider extracting to lib/utils.ts if used a third time.)
function parseRating(raw?: string | null): number {
  if (!raw) return 0;
  try {
    return parseFloat(JSON.parse(raw)?.value ?? '0') || 0;
  } catch {
    return 0;
  }
}

function parseCount(raw?: string | null): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function QuickView() {
  const {type, open} = useAside();
  const fetcher = useFetcher<{product: any}>();
  const [handle, setHandle] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{handle: string; trigger?: HTMLElement}>)
        .detail;
      if (!detail?.handle) return;
      triggerRef.current = detail.trigger ?? null;
      setHandle(detail.handle);
      open('quickview');
      fetcher.load(`/api/quickview/${detail.handle}`);
    }
    document.addEventListener('quickview:open', onOpen);
    return () => document.removeEventListener('quickview:open', onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Return focus to whichever "Quick view" button opened the modal
  // once it closes (accessibility).
  useEffect(() => {
    if (type === 'quickview') return;
    triggerRef.current?.focus?.();
  }, [type]);

  const product = fetcher.data?.product;
  const isLoading = !product;

  function selectOption(variantUriQuery: string) {
    if (!handle) return;
    fetcher.load(`/api/quickview/${handle}?${variantUriQuery}`);
  }

  return (
    <Aside type="quickview" heading={product?.title ?? 'Quick view'}>
      {isLoading ? (
        <div className="quickview__loading" role="status">
          Loading…
        </div>
      ) : (
        <QuickViewContent product={product} onSelectOption={selectOption} />
      )}
    </Aside>
  );
}

function QuickViewContent({
  product,
  onSelectOption,
}: {
  product: any;
  onSelectOption: (variantUriQuery: string) => void;
}) {
  const {open, close} = useAside();
  const selectedVariant = product.selectedOrFirstAvailableVariant;
  const compareAtPrice = selectedVariant?.compareAtPrice;
  const averageScore = parseRating(product.reviewsRating?.value);
  const totalReviews = parseCount(product.reviewsCount?.value);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const lines = selectedVariant
    ? [{merchandiseId: selectedVariant.id, quantity: 1, selectedVariant}]
    : [];

  const displayImage = selectedVariant?.image ?? product.images?.nodes?.[0];

  return (
    <div className="quickview">
      <div className="quickview__media">
        {displayImage ? (
          <Image
            data={displayImage}
            className="quickview__img"
            sizes="(max-width: 768px) 90vw, 480px"
            alt={displayImage.altText ?? product.title}
          />
        ) : (
          <div className="quickview__img-placeholder" aria-hidden="true" />
        )}
      </div>

      <div className="quickview__body">
        {product.vendor && (
          <span className="quickview__vendor">{product.vendor}</span>
        )}
        <h2 className="quickview__title">{product.title}</h2>

        <div className="quickview__reviews">
          <StarRating
            averageScore={averageScore}
            totalReviews={totalReviews}
            onReviewsClick={() => {
              close();
              window.location.href = `/products/${product.handle}#reviews`;
            }}
          />
        </div>

        <div className="quickview__pricing">
          {compareAtPrice && (
            <span className="quickview__price quickview__price--compare">
              <s>
                <Money data={compareAtPrice} />
              </s>
            </span>
          )}
          {selectedVariant?.price && (
            <span className="quickview__price quickview__price--sale">
              <Money data={selectedVariant.price} />
            </span>
          )}
        </div>

        {productOptions.map((option) => {
          // If there is only a single value in the option values, don't display the option
          if (option.optionValues.length === 1) return null;

          return (
            <div className="product-options" key={option.name}>
              <h5>{option.name}</h5>
              <div className="product-options-grid">
                {option.optionValues.map((value) => {
                  const {
                    name,
                    handle: valueHandle,
                    variantUriQuery,
                    selected,
                    available,
                    exists,
                    isDifferentProduct,
                    swatch,
                  } = value;

                  const optionItemClassName = `product-options-item${
                    selected ? ' product-options-item--selected' : ''
                  }${!available ? ' product-options-item--unavailable' : ''}`;

                  if (isDifferentProduct) {
                    // Combined-listing child product: this option value
                    // lives on a different product/URL, so it must route
                    // there instead of being fetched as a variant of the
                    // current handle.
                    return (
                      <Link
                        key={option.name + name}
                        to={`/products/${valueHandle}?${variantUriQuery}`}
                        className={optionItemClassName}
                        onClick={close}
                      >
                        <QuickViewSwatch swatch={swatch} name={name} />
                      </Link>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={option.name + name}
                      disabled={!exists}
                      className={`${optionItemClassName}${
                        exists && !selected ? ' link' : ''
                      }`}
                      onClick={() => {
                        if (!selected) onSelectOption(variantUriQuery);
                      }}
                    >
                      <QuickViewSwatch swatch={swatch} name={name} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <AddToCartButton
          disabled={!selectedVariant || !selectedVariant.availableForSale}
          onClick={() => open('cart')}
          lines={lines}
        >
          {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
        </AddToCartButton>

        <Link
          to={`/products/${product.handle}`}
          className="quickview__full-details-link"
          onClick={close}
        >
          View full details
        </Link>
      </div>
    </div>
  );
}

function QuickViewSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{backgroundColor: color || 'transparent'}}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
```

## app\lib\variants.ts

```tsx
import {useLocation} from 'react-router';
import type {SelectedOption} from '@shopify/hydrogen/storefront-api-types';
import {useMemo} from 'react';

export function useVariantUrl(
  handle: string,
  selectedOptions?: SelectedOption[],
) {
  const {pathname} = useLocation();

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathname,
      searchParams: new URLSearchParams(),
      selectedOptions,
    });
  }, [handle, selectedOptions, pathname]);
}

export function getVariantUrl({
  handle,
  pathname,
  searchParams,
  selectedOptions,
}: {
  handle: string;
  pathname: string;
  searchParams: URLSearchParams;
  selectedOptions?: SelectedOption[];
}) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
  const isLocalePathname = match && match.length > 0;

  const path = isLocalePathname
    ? `${match![0]}products/${handle}`
    : `/products/${handle}`;

  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });

  const searchString = searchParams.toString();

  return path + (searchString ? '?' + searchParams.toString() : '');
}

```
