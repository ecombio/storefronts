// app/sections/CollectionCarousel.tsx
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {CollectionCard, type CollectionCardImage} from '~/snippets/CollectionCard';

export interface CollectionCarouselItem {
  id: string;
  title: string;
  image?: CollectionCardImage | null;
  href?: string;
}

export interface CollectionCarouselProps {
  title: string;
  items: CollectionCarouselItem[];
  /** Optional "View all" link next to the heading. */
  viewAllUrl?: string;
  viewAllLabel?: string;
}

export function CollectionCarousel({
  title,
  items,
  viewAllUrl,
  viewAllLabel = 'View all',
}: CollectionCarouselProps) {
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

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, items.length]);

  function scrollByDirection(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;

    const card = el.querySelector<HTMLElement>('.collection-carousel__item');
    const styles = card ? getComputedStyle(el) : null;
    const gap = styles ? parseFloat(styles.columnGap || styles.gap || '0') : 0;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;

    el.scrollBy({left: step * direction, behavior: 'smooth'});
  }

  if (items.length === 0) return null;

  return (
    <section className="collection-carousel" aria-labelledby="collection-carousel-heading">
      <div className="collection-carousel__header">
        <h2 className="collection-carousel__title" id="collection-carousel-heading">
          {title}
        </h2>

        <div className="collection-carousel__controls">
          {viewAllUrl && (
            <Link to={viewAllUrl} className="collection-carousel__view-all">
              {viewAllLabel}
            </Link>
          )}

          <div className="collection-carousel__arrows">
            <button
              type="button"
              className="collection-carousel__arrow collection-carousel__arrow--prev"
              onClick={() => scrollByDirection(-1)}
              disabled={!canScrollPrev}
              aria-label="Scroll to previous categories"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
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
              className="collection-carousel__arrow collection-carousel__arrow--next"
              onClick={() => scrollByDirection(1)}
              disabled={!canScrollNext}
              aria-label="Scroll to next categories"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
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

      <div
        className="collection-carousel__track"
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-label={title}
      >
        {items.map((item) => (
          <div className="collection-carousel__item" key={item.id}>
            <CollectionCard title={item.title} image={item.image} href={item.href} />
          </div>
        ))}
      </div>
    </section>
  );
}
