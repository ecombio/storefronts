import {useEffect, useState} from 'react';
import {CartForm, Image, Money} from '@shopify/hydrogen';
import type {RefObject} from 'react';

type MoneyLike = {amount: string; currencyCode: string};

type StickyVariant = {
  id: string;
  availableForSale: boolean;
  price: MoneyLike;
  compareAtPrice?: MoneyLike | null;
  image?: {url: string; altText?: string | null} | null;
};

/**
 * Ported from snippets/sticky-atc.liquid + assets/sticky-atc.js.
 * Styles live in main-product.css (.sticky-atc, .sticky-atc__*).
 *
 * `atcAnchorRef` should point at whatever element sits where the
 * "primary" Add to Cart control lives — e.g. the wrapping <div> around
 * <ProductForm /> in products.$handle.tsx. The bar shows once that
 * element scrolls out of the viewport.
 *
 * NOTE — simplified vs the Liquid version: this doesn't duplicate
 * ProductForm's full variant/swatch selectors, since ProductForm owns
 * that selection state and this component doesn't have access to it.
 * It just mirrors price/image/availability for whichever variant is
 * currently selected on the page, and offers its own Add to
 * Cart / Buy Now actions for that same variant. If you want swatches
 * in the sticky bar too, lift the option-selection state up to the
 * route and pass a setter down to both ProductForm and this component.
 *
 * "Buy Now" adds the line then redirects via a `redirectTo` form field
 * — this assumes your /cart route action reads `redirectTo` from
 * formData and issues the redirect (the Hydrogen skeleton's default
 * cart action does this; adjust if yours doesn't).
 */
export function StickyAddToCart({
  productTitle,
  selectedVariant,
  atcAnchorRef,
}: {
  productTitle: string;
  selectedVariant: StickyVariant | null | undefined;
  atcAnchorRef: RefObject<HTMLElement>;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = atcAnchorRef.current;
    if (!anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      {threshold: 0},
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [atcAnchorRef]);

  if (!selectedVariant) return null;

  const available = selectedVariant.availableForSale;
  const onSale =
    !!selectedVariant.compareAtPrice &&
    parseFloat(selectedVariant.compareAtPrice.amount) > parseFloat(selectedVariant.price.amount);

  const lines = [{merchandiseId: selectedVariant.id, quantity: 1}];

  return (
    <div className={`sticky-atc${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <div className="sticky-atc__inner">
        <div className="sticky-atc__product">
          {selectedVariant.image && (
            <div className="sticky-atc__image-wrap">
              <Image
                data={selectedVariant.image}
                width={48}
                height={48}
                className="sticky-atc__image"
                loading="lazy"
                sizes="48px"
              />
            </div>
          )}
          <div className="sticky-atc__meta">
            <p className="sticky-atc__title">{productTitle}</p>
            <p className="sticky-atc__price">
              <span className={`sticky-atc__price-current${onSale ? ' sale-price' : ''}`}>
                <Money data={selectedVariant.price} />
              </span>
              {onSale && selectedVariant.compareAtPrice && (
                <span className="sticky-atc__price-compare">
                  <Money data={selectedVariant.compareAtPrice} />
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="sticky-atc__actions">
          <CartForm route="/cart" action={CartForm.ACTIONS.LinesAdd} inputs={{lines}}>
            {(fetcher: {state: string}) => (
              <button
                type="submit"
                className="sticky-atc__cta sticky-atc__cta--atc"
                disabled={!available || fetcher.state !== 'idle'}
              >
                {!available ? 'Sold Out' : fetcher.state !== 'idle' ? 'Adding\u2026' : 'Add to Cart'}
              </button>
            )}
          </CartForm>

          <CartForm route="/cart" action={CartForm.ACTIONS.LinesAdd} inputs={{lines}}>
            {() => (
              <>
                <input type="hidden" name="redirectTo" value="/checkout" />
                <button
                  type="submit"
                  name="checkout"
                  className="sticky-atc__cta sticky-atc__cta--bin"
                  disabled={!available}
                >
                  Buy Now
                </button>
              </>
            )}
          </CartForm>
        </div>
      </div>
    </div>
  );
}
