// app/sections/ProductCarousel.tsx
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {ProductCard} from '~/snippets/ProductCard';
import type {ProductCardFragment} from 'storefrontapi.generated';

export interface ProductCarouselProps {
  title: string;
  products: ProductCardFragment[];
  /** Optional "View all" link next to the heading, e.g. a collection URL. */
  viewAllUrl?: string;
  viewAllLabel?: string;
}

export function ProductCarousel({
  title,
  products,
  viewAllUrl,
  viewAllLabel = 'View all',
}: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // 1px tolerance for sub-pixel rounding at the scroll bounds.
    setCanScrollPrev(el.scrollLeft > 1);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollState, {passive: true});

    // Re-check on resize/layout changes too — e.g. rotating a tablet
    // changes how many cards fit and whether "next" is still possible.
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, products.length]);

  function scrollByDirection(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;

    // Scroll by roughly one card's width (including its gap) rather than
    // a fixed pixel amount, so the "one card at a time" feel holds up
    // across breakpoints without a hardcoded card width.
    const card = el.querySelector<HTMLElement>('.product-carousel__item');
    const styles = card ? getComputedStyle(el) : null;
    const gap = styles ? parseFloat(styles.columnGap || styles.gap || '0') : 0;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;

    el.scrollBy({left: step * direction, behavior: 'smooth'});
  }

  if (products.length === 0) return null;

  return (
    <section className="product-carousel" aria-labelledby="product-carousel-heading">
      <div className="product-carousel__header">
        <h2 className="product-carousel__title" id="product-carousel-heading">
          {title}
        </h2>

        <div className="product-carousel__controls">
          {viewAllUrl && (
            <Link to={viewAllUrl} className="product-carousel__view-all">
              {viewAllLabel}
            </Link>
          )}

          <div className="product-carousel__arrows">
            <button
              type="button"
              className="product-carousel__arrow product-carousel__arrow--prev"
              onClick={() => scrollByDirection(-1)}
              disabled={!canScrollPrev}
              aria-label="Scroll to previous products"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M11 4.5 6.5 9l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="product-carousel__arrow product-carousel__arrow--next"
              onClick={() => scrollByDirection(1)}
              disabled={!canScrollNext}
              aria-label="Scroll to next products"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M7 4.5 11.5 9 7 13.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="product-carousel__track" ref={trackRef} tabIndex={0} role="group" aria-label={title}>
        {products.map((product) => (
          <div className="product-carousel__item" key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
