// app/sections/SubCollections.tsx

import {useRef, useState, useEffect, useCallback} from 'react';
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {SubCollectionItemFragment} from 'storefrontapi.generated';

interface SubCollectionsProps {
  collections: SubCollectionItemFragment[];
  shape?: 'square' | 'circle';
}

/**
 * Horizontally-scrollable row of linked collection cards, driven by a
 * collection's `custom.sub_collections` metafield (a list of Collection
 * references). Rendered directly above the product grid in the
 * "Products" tab panel — shows automatically when sub-collections
 * exist, renders nothing when the list is empty.
 *
 * Nav arrows only appear once there are more than 4 items (matching
 * the original snippet), and disable themselves at either end of the
 * scrollable track based on live scroll position.
 */
export function SubCollections({collections, shape = 'square'}: SubCollectionsProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollPrev(track.scrollLeft > 1);
    setCanScrollNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (!track) return;

    track.addEventListener('scroll', updateScrollState, {passive: true});
    window.addEventListener('resize', updateScrollState);

    return () => {
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateScrollState, collections.length]);

  if (!collections.length) {
    return null;
  }

  function scrollByAmount(direction: 'prev' | 'next') {
    const track = trackRef.current;
    if (!track) return;
    const amount = track.clientWidth * 0.8 * (direction === 'prev' ? -1 : 1);
    track.scrollBy({left: amount, behavior: 'smooth'});
  }

  const showNav = collections.length > 4;

  return (
    <div className={`sub-collections sub-collections--${shape}`} data-sub-collections>
      <div className="sub-collections__track" ref={trackRef} data-sub-collections-track>
        {collections.map((sc) => (
          <Link key={sc.id} to={`/collections/${sc.handle}`} className="sub-collections__item">
            <span className="sub-collections__media">
              {sc.image && (
                <Image
                  data={sc.image}
                  sizes="120px"
                  loading="lazy"
                  className="sub-collections__image"
                />
              )}
            </span>
            <span className="sub-collections__title">{sc.title}</span>
          </Link>
        ))}
      </div>

      {showNav && (
        <>
          <button
            type="button"
            className="sub-collections__nav sub-collections__nav--prev"
            onClick={() => scrollByAmount('prev')}
            disabled={!canScrollPrev}
            aria-label="Scroll left"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            type="button"
            className="sub-collections__nav sub-collections__nav--next"
            onClick={() => scrollByAmount('next')}
            disabled={!canScrollNext}
            aria-label="Scroll right"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </>
      )}
    </div>
  );
}