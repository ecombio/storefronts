// app/snippets/PromoCarousel.tsx
//
// Amazon-style "sponsored brand" panel: a promo card (brand image + heading)
// on the left, and a horizontally-navigable row of shoppable products on
// the right — pulled from the `custom.sponsored_ads` collection metafield
// (a `promo_carousel` metaobject reference).
//
// Navigation: hover-revealed prev/next arrow buttons scroll the product
// row by one viewport width at a time. The track uses `overflow-x: hidden`
// rather than `auto` — `Element.scrollBy()` still works on a hidden-overflow
// element, so this gives us fully programmatic scrolling with no native
// scrollbar, no drag-to-scroll, and no partially-cut-off trailing card
// "peeking" out to hint at scrollability (that affordance is now the
// arrows themselves). Touch devices can't hover, so arrows stay visible
// there via a `(hover: none)` media query fallback — see promo-carousel.css.
//
// Renders nothing if the metafield/reference is missing or has no products,
// so it's always safe to render unconditionally from the route.
//
// The left-hand brand panel itself lives in ~/snippets/PromoCard.tsx —
// see that file for the field-key assumptions on the promo_card metaobject.

import {useRef} from 'react';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {ProductCard} from '~/snippets/ProductCard';
import {PromoCard} from '~/snippets/PromoCard';
import type {PromoCardData} from '~/snippets/PromoCard';

export type {PromoCardData};

export interface SponsoredAdsData {
  id: string;
  heading?: string | null;
  subheading?: string | null;
  /**
   * 0-based index within the current page's product grid to splice this
   * panel after (0 = before the first product). Merchant-set via the
   * promo_carousel metaobject's "Grid Position" field (key:
   * grid_position). Null/undefined means the merchant hasn't set one —
   * CollectionFeed falls back to its own default position in that case.
   */
  position?: number | null;
  promoCard?: PromoCardData | null;
  products: ProductCardFragment[];
}

interface PromoCarouselProps {
  sponsoredAds?: SponsoredAdsData | null;
}

export function PromoCarousel({sponsoredAds}: PromoCarouselProps) {
  // Hooks must run unconditionally, before the early-return guard below.
  const trackRef = useRef<HTMLDivElement>(null);

  if (!sponsoredAds?.promoCard || sponsoredAds.products.length === 0) {
    return null;
  }

  const {heading, subheading, promoCard, products} = sponsoredAds;

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;

    const firstCard = track.querySelector<HTMLElement>(
      '.promo-carousel__product',
    );
    if (!firstCard) return;

    const gap = parseFloat(getComputedStyle(track).columnGap || '0');
    const cardWidth = firstCard.getBoundingClientRect().width;
    const step = cardWidth + gap;

    const cardsPerView = Math.max(1, Math.floor((track.clientWidth + gap) / step));
    const scrollAmount = cardsPerView * step;

    track.scrollBy({left: direction * scrollAmount, behavior: 'smooth'});
  }

  return (
    <div className="promo-carousel" data-promo-carousel>
      <PromoCard promoCard={promoCard} heading={heading} subheading={subheading} />

      <div className="promo-carousel__products-viewport">
        <div
          className="promo-carousel__products"
          data-promo-carousel-track
          ref={trackRef}
        >
          {products.map((product, index) => (
            <div className="promo-carousel__product" key={product.id}>
              <ProductCard
                product={product}
                loading={index < 4 ? 'eager' : undefined}
                showVendor={false}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="promo-carousel__arrow promo-carousel__arrow--prev"
          aria-label="Scroll to previous products"
          onClick={() => scrollByPage(-1)}
        >
          <ChevronIcon direction="left" />
        </button>
        <button
          type="button"
          className="promo-carousel__arrow promo-carousel__arrow--next"
          aria-label="Scroll to next products"
          onClick={() => scrollByPage(1)}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>
    </div>
  );
}

function ChevronIcon({direction}: {direction: 'left' | 'right'}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'left' ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}