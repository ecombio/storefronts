// app/snippets/QuickView.tsx
//
// Listens for the 'quickview:open' CustomEvent dispatched by
// ProductCard.tsx, fetches full product data from
// /api/quickview/:handle, and renders it inside the shared <Aside>
// shell (type="quickview") as a centered modal (see quickview.css).
//
// Also renders a recommendations carousel below the product details,
// split into "You may also like" (RELATED) / "Frequently bought
// together" (COMPLEMENTARY) tabs — using the same deferred
// recommended-products promise + <Suspense>/<Await> pattern as
// products.$handle.tsx, so the modal opens immediately and the
// carousel streams in once ready. If only one intent returns results,
// falls back to a single untabbed carousel. Clicking "Quick view" on
// a recommended product re-dispatches 'quickview:open' with the new
// handle — the listener below is already mounted, so this just swaps
// the modal's contents in place rather than opening a second modal.
//
// Mount this once, globally, in PageLayout.tsx alongside the other
// <Aside> instances (cart, search, mobile) — NOT inside ProductCard.
import {Suspense, useEffect, useRef, useState} from 'react';
import {Await, Link, useFetcher} from 'react-router';
import {Image, Money, getProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {Aside, useAside} from '~/components/Aside';
import {StarRating} from '~/snippets/StarRating';
import {AddToCartButton} from '~/snippets/AddToCartButton';
import {ProductCarousel} from '~/sections/ProductCarousel';
import type {ProductCarouselTab} from '~/sections/ProductCarousel';

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
  const fetcher = useFetcher<{
    product: any;
    recommended: Promise<[ProductCardFragment[], ProductCardFragment[]]>;
  }>();
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
        <QuickViewContent
          product={product}
          recommended={fetcher.data?.recommended}
          onSelectOption={selectOption}
        />
      )}
    </Aside>
  );
}

function QuickViewContent({
  product,
  recommended,
  onSelectOption,
}: {
  product: any;
  recommended?: Promise<[ProductCardFragment[], ProductCardFragment[]]>;
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
    <>
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

      {recommended && (
        <Suspense fallback={null}>
          <Await resolve={recommended} errorElement={null}>
            {([related, complementary]) => {
              const tabs: ProductCarouselTab[] = [];
              if (related.length > 0) {
                tabs.push({
                  id: 'related',
                  label: 'You may also like',
                  products: related,
                });
              }
              if (complementary.length > 0) {
                tabs.push({
                  id: 'complementary',
                  label: 'Frequently bought together',
                  products: complementary,
                });
              }

              if (tabs.length === 0) return null;

              // Only one intent came back — a single tab would just
              // repeat its own label with nothing to switch between,
              // so fall back to an untabbed carousel instead.
              if (tabs.length === 1) {
                return (
                  <ProductCarousel
                    title={tabs[0].label}
                    products={tabs[0].products}
                  />
                );
              }

              return (
                <ProductCarousel title="Recommended for you" tabs={tabs} />
              );
            }}
          </Await>
        </Suspense>
      )}
    </>
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