import {useEffect, useRef, useState} from 'react';
import {Image} from '@shopify/hydrogen';

type GalleryImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
};

/**
 * Left-hand column of the PDP: product media/gallery.
 * Ported from snippets/product-media.liquid + assets/product-media.js.
 * Sibling to ProductDetail, which handles the right-hand column.
 */
export function ProductMedia({
  images,
  selectedVariantImage,
  productTitle,
}: {
  images: GalleryImage[];
  selectedVariantImage?: GalleryImage | null;
  productTitle: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const thumbTrackRef = useRef<HTMLDivElement>(null);

  // When the shopper picks a variant that has its own image, jump the
  // main viewer + active thumbnail to match (mirrors the
  // `variant:changed` listener in product-media.js).
  useEffect(() => {
    if (!selectedVariantImage) return;
    const matchIndex = images.findIndex(
      (img) =>
        (selectedVariantImage.id && img.id === selectedVariantImage.id) ||
        img.url === selectedVariantImage.url,
    );
    if (matchIndex !== -1) setActiveIndex(matchIndex);
  }, [selectedVariantImage, images]);

  // Mirrors product-media.js's ResizeObserver: syncs --gallery-height
  // to the rendered main image height so the thumbnail rail's
  // max-height tracks it (see .product-thumbnails in main-product.css).
  useEffect(() => {
    const viewer = viewerRef.current;
    const gallery = galleryRef.current;
    if (!viewer || !gallery) return;

    const syncHeight = () => {
      const h = viewer.getBoundingClientRect().height;
      if (h > 0) gallery.style.setProperty('--gallery-height', `${h}px`);
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(viewer);
    return () => observer.disconnect();
  }, []);

  function scrollThumbnails(direction: 'up' | 'down') {
    const track = thumbTrackRef.current;
    if (!track) return;
    const amount = track.clientHeight * 0.8;
    track.scrollBy({
      top: direction === 'up' ? -amount : amount,
      behavior: 'smooth',
    });
  }

  if (!images.length) return null;

  const activeImage = images[activeIndex];

  return (
    <div className="product-gallery" ref={galleryRef}>
      {images.length > 1 && (
        <div className="product-thumbnails">
          <button
            type="button"
            className="thumbnail-scroll-arrow thumbnail-scroll-arrow--up"
            aria-label="Scroll thumbnails up"
            onClick={() => scrollThumbnails('up')}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 12.5L10 7.5L15 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="thumbnail-container" ref={thumbTrackRef}>
            {images.map((image, index) => (
              <button
                key={image.id ?? image.url}
                type="button"
                className={`thumbnail-item${index === activeIndex ? ' active' : ''}`}
                aria-label={`View image ${index + 1}`}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                <div className="thumbnail-wrapper">
                  <Image
                    data={{
                      url: image.url,
                      altText: image.altText ?? productTitle,
                    }}
                    width={84}
                    height={84}
                    className="thumbnail-image"
                    loading="lazy"
                    sizes="84px"
                  />
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="thumbnail-scroll-arrow thumbnail-scroll-arrow--down"
            aria-label="Scroll thumbnails down"
            onClick={() => scrollThumbnails('down')}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="product-gallery-main">
        <div className="gallery-viewer" ref={viewerRef}>
          <div className="main-image-container">
            <Image
              data={{
                url: activeImage.url,
                altText: activeImage.altText ?? productTitle,
              }}
              width={787}
              height={787}
              className="main-image"
              loading="eager"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
}