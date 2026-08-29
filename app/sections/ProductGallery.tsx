import {useEffect, useRef, useState} from 'react';
import {Image} from '@shopify/hydrogen';

type GalleryImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
};

/**
 * Ported from snippets/product-media.liquid + assets/product-media.js.
 * Replaces <ProductImage /> in products.$handle.tsx.
 *
 * Requires `images(first: N) { nodes { id url altText } }` on the
 * product query (see updated PRODUCT_FRAGMENT below) — the original
 * skeleton fragment only fetched the variant's single `image`.
 */
export function ProductGallery({
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

  if (!images.length) return null;

  const activeImage = images[activeIndex];

  return (
    <div className="product-gallery" ref={galleryRef}>
      {images.length > 1 && (
        <div className="product-thumbnails">
          <div className="thumbnail-container">
            {images.map((image, index) => (
              <div
                key={image.id ?? image.url}
                className={`thumbnail-item${index === activeIndex ? ' active' : ''}`}
                tabIndex={0}
                role="button"
                aria-label={`View image ${index + 1}`}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveIndex(index);
                  }
                }}
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
              </div>
            ))}
          </div>
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
