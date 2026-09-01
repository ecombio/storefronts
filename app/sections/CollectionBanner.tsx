// app/sections/CollectionBanner.tsx

import {useEffect, useRef} from 'react';
import type {CSSProperties} from 'react';

interface CollectionBannerImage {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export type CollectionBannerImagePosition = 'left' | 'right';
export type CollectionBannerImageHeight =
  | 'extra_small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra_large';
export type CollectionBannerTextAlignment = 'left' | 'center' | 'right';
export type CollectionBannerParallaxDirection = 'vertical' | 'horizontal';

interface CollectionBannerProps {
  title: string;
  descriptionHtml?: string | null;
  /** The collection's native image. Omitting it renders the original text-only banner. */
  image?: CollectionBannerImage | null;
  /** 0-100. Darkens the image so overlaid text stays legible. Default: 0 (no overlay). */
  imageOverlayOpacity?: number;
  /** Which side the image sits on at desktop widths. Default: 'right'. */
  imagePosition?: CollectionBannerImagePosition;
  /** Controls the banner's min-height at desktop widths. Default: 'extra_small'. */
  imageHeight?: CollectionBannerImageHeight;
  /** Default: 'left' (matches the original text-only banner's layout). */
  textAlignment?: CollectionBannerTextAlignment;
  /** Default: false. Automatically skipped for visitors who prefer reduced motion. */
  enableParallax?: boolean;
  /** Default: 'vertical'. Only applies when `enableParallax` is true. */
  parallaxDirection?: CollectionBannerParallaxDirection;
}

const HEIGHT_PX: Record<CollectionBannerImageHeight, number> = {
  extra_small: 320,
  small: 400,
  medium: 480,
  large: 560,
  extra_large: 640,
};

/**
 * Collection page banner: title + rich-text description, with an optional
 * image column (the collection's own image) plus overlay/position/height/
 * alignment/parallax styling. Every image-related prop is optional —
 * a collection with no image and no styling metafields set renders exactly
 * the original plain text-only banner, unchanged.
 *
 * `image`/`descriptionHtml` come straight off the Collection object.
 * The styling props (overlay, position, height, alignment, parallax) come
 * from collection metafields (see collections.$handle.tsx) since a headless
 * storefront has no theme customizer to expose merchant-editable section
 * settings the way a native Shopify theme would.
 */
export function CollectionBanner({
  title,
  descriptionHtml,
  image,
  imageOverlayOpacity = 0,
  imagePosition = 'right',
  imageHeight = 'extra_small',
  textAlignment = 'left',
  enableParallax = false,
  parallaxDirection = 'vertical',
}: CollectionBannerProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const hasImage = Boolean(image?.url);

  useEffect(() => {
    if (!hasImage || !enableParallax) return;

    const el = parallaxRef.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Parallax is a desktop-only embellishment — skip below the `lg`
    // breakpoint both to avoid mobile scroll jank and because the image
    // column collapses to a static stacked block there anyway.
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    if (!desktopQuery.matches) return;

    let rafId = 0;

    function update() {
      rafId = 0;
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      // Distance of the banner's center from the viewport's center,
      // scaled down so the image drifts a few percent rather than
      // tracking scroll 1:1.
      const offset = (viewportCenter - elementCenter) * 0.08;

      el.style.transform =
        parallaxDirection === 'horizontal'
          ? `translateX(${offset}px)`
          : `translateY(${offset}px)`;
    }

    function onScrollOrResize() {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScrollOrResize, {passive: true});
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [hasImage, enableParallax, parallaxDirection]);

  const style = hasImage
    ? ({
        '--collection-banner-height': `${HEIGHT_PX[imageHeight]}px`,
      } as CSSProperties)
    : undefined;

  const className = hasImage
    ? `collection-banner collection-banner--has-image collection-banner--image-${imagePosition} collection-banner--text-${textAlignment}`
    : `collection-banner collection-banner--text-${textAlignment}`;

  return (
    <div className={className} id="collection-banner" style={style}>
      <div className="collection-banner__text">
        <h1 className="collection-title">{title}</h1>
        {descriptionHtml && (
          <div
            className="collection-description rte"
            dangerouslySetInnerHTML={{__html: descriptionHtml}}
          />
        )}
      </div>

      {hasImage && (
        <div className="collection-banner__image-wrap">
          <div ref={parallaxRef} className="collection-banner__image-parallax">
            <img
              className="collection-banner__image"
              src={image!.url}
              alt={image!.altText ?? ''}
              width={image!.width ?? undefined}
              height={image!.height ?? undefined}
              loading="eager"
              fetchPriority="high"
            />
          </div>
          {imageOverlayOpacity > 0 && (
            <div
              className="collection-banner__image-overlay"
              style={{opacity: imageOverlayOpacity / 100}}
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
}