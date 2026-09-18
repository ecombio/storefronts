// app/components/ProductGallery.tsx
import {useRef, useState, useEffect} from 'react';
import {Image} from '@shopify/hydrogen';
import type {ProductVariantFragment} from 'storefrontapi.generated';

type GalleryImage = {
  id: string;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

/**
 * Swipeable, snap-scrolling image gallery with a pill-dot indicator.
 * Falls back to the selected variant's single image if the product has
 * no `images` connection populated (e.g. a variant-only product).
 */
export function ProductGallery({
  images,
  selectedVariantImage,
}: {
  images: GalleryImage[];
  selectedVariantImage?: ProductVariantFragment['image'];
}) {
  const gallery: GalleryImage[] =
    images.length > 0
      ? images
      : selectedVariantImage
        ? [selectedVariantImage]
        : [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // When the selected variant changes, scroll the gallery to that
  // variant's image if it's one of the product images.
  useEffect(() => {
    if (!selectedVariantImage || !scrollRef.current) return;
    const index = gallery.findIndex((img) => img.id === selectedVariantImage.id);
    if (index >= 0) {
      scrollRef.current.scrollTo({
        left: index * scrollRef.current.clientWidth,
        behavior: 'smooth',
      });
      setActiveIndex(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariantImage?.id]);

  function handleScroll() {
    if (!scrollRef.current) return;
    const index = Math.round(
      scrollRef.current.scrollLeft / scrollRef.current.clientWidth,
    );
    setActiveIndex(index);
  }

  if (gallery.length === 0) {
    return <div className="aspect-[4/5] w-full bg-[#efefef] lg:rounded-sm" />;
  }

  return (
    <>
      {/* Mobile / tablet: swipeable single-image carousel with pill dots. */}
      <div className="relative bg-[#efefef] lg:hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto"
          style={{scrollSnapType: 'x mandatory'}}
          role="region"
          aria-label="Product images"
        >
          {gallery.map((img, i) => (
            <div
              key={img.id}
              className="flex-none w-full aspect-[4/5]"
              style={{scrollSnapAlign: 'center'}}
              aria-hidden={i !== activeIndex}
            >
              <Image
                data={img}
                alt={img.altText || 'Product image'}
                aspectRatio="4/5"
                sizes="(min-width: 480px) 480px, 100vw"
                loading={i === 0 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {gallery.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 shadow-sm">
            {gallery.map((img, i) => (
              <span
                key={img.id}
                className="h-1.5 w-1.5 rounded-full transition-opacity"
                style={{
                  backgroundColor: '#0a0a0a',
                  opacity: i === activeIndex ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/*
        Desktop: no carousel at all — every image is visible at once as a
        stacked 2-up grid, the way a shopper scrolls a PDP with a mouse
        rather than a thumb. Odd image out (if gallery.length is odd)
        spans both columns so nothing looks like a mistake.
      */}
      <div
        className="hidden lg:grid lg:grid-cols-2 lg:gap-2 lg:bg-[#efefef] lg:rounded-sm lg:overflow-hidden"
        role="region"
        aria-label="Product images"
      >
        {gallery.map((img, i) => (
          <div
            key={img.id}
            className={
              gallery.length % 2 === 1 && i === gallery.length - 1
                ? 'col-span-2 aspect-[8/5]'
                : 'aspect-[4/5]'
            }
          >
            <Image
              data={img}
              alt={img.altText || 'Product image'}
              sizes="(min-width: 1024px) 45vw, 100vw"
              loading={i < 2 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </>
  );
}
