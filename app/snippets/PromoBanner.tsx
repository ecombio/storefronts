// app/snippets/PromoBanner.tsx
//
// A wide, single in-feed promotional banner — distinct from PromoCarousel
// (a shoppable row of products) in that PromoBanner has no products of its
// own: it's pure brand/marketing real estate (image + heading/subheading +
// optional CTA) spliced into the products grid the same way PromoCarousel
// is, via a full-row grid item (see products-grid__banner-item in
// promo-banner.css and CollectionFeed's in-feed splice logic in
// collections.$handle.tsx).
//
// Multiple style variants are supported via the `variant` prop, so the
// same component can render as an image+text split banner (either
// direction), a full-bleed background-image banner with overlaid text, or
// a minimal text-only color-block banner with no image at all:
//
//   'split-left'  — image on the left, text block on the right (default)
//   'split-right' — image on the right, text block on the left
//   'full-bleed'  — image fills the whole banner, text overlaid on top
//   'minimal'     — no image; solid/custom background color, text only
//
// ─────────────────────────────────────────────────────────────────────────
// FIELD-KEY NOTE: this maps onto a `promo_banner` metaobject that does not
// yet exist in Admin. Field keys used by PROMO_BANNER_FRAGMENT in
// collections.$handle.tsx (variant, heading, subheading, image, link_text,
// link_url, background_color, text_alignment, grid_position) are
// best-guess, mirroring the naming convention already established by the
// promo_carousel metaobject's PROMO_CARD_FRAGMENT in that same file. Once
// the promo_banner metaobject is created in Admin, confirm these against
// its real field keys and adjust PROMO_BANNER_FRAGMENT there if any
// differ.
//
// PROMO_BANNER_DEMO_DATA below is no longer the render path from
// collections.$handle.tsx (which now sources `banner` from live metafield
// data) — it remains useful only as fallback fixtures for isolated
// component preview/testing of all 4 variants.
// ─────────────────────────────────────────────────────────────────────────
//
// Renders nothing if `banner` itself, or `banner.heading` and
// `banner.image` are BOTH missing (nothing worth showing), so — like
// PromoCarousel — it's always safe to render unconditionally from the
// route.

import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';

export type PromoBannerVariant =
  | 'split-left'
  | 'split-right'
  | 'full-bleed'
  | 'minimal';

export type PromoBannerTextAlignment = 'left' | 'center' | 'right';

const VARIANTS: PromoBannerVariant[] = [
  'split-left',
  'split-right',
  'full-bleed',
  'minimal',
];

const TEXT_ALIGNMENTS: PromoBannerTextAlignment[] = ['left', 'center', 'right'];

export interface PromoBannerData {
  id: string;
  /** Default: 'split-left'. Falls back to the default for anything unrecognized. */
  variant?: PromoBannerVariant | string | null;
  heading?: string | null;
  subheading?: string | null;
  image?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  linkText?: string | null;
  linkUrl?: string | null;
  /**
   * CSS color (hex/named/rgb) for 'minimal' variant's background, and as
   * the base tint behind 'full-bleed's text-scrim gradient. Optional —
   * both variants fall back to their own CSS default when unset.
   *
   * KNOWN LIMITATION: text color is NOT automatically adjusted to stay
   * readable against a custom backgroundColor — 'minimal' always renders
   * with the CSS default (dark) text color regardless of what's passed
   * here. A dark backgroundColor paired with the default dark text will
   * be unreadable (see PROMO_BANNER_DEMO_DATA's 'minimal' example, which
   * deliberately uses a light color for this reason). If merchant-set
   * dark backgrounds are expected once this goes dynamic, this will need
   * either a paired `textColor` field or an automatic contrast check.
   */
  backgroundColor?: string | null;
  /** Default: 'left'. Only meaningful for 'full-bleed' and 'minimal'. */
  textAlignment?: PromoBannerTextAlignment | string | null;
  /**
   * 0-based index within the current page's product grid to splice this
   * banner after (0 = before the first product) — same convention as
   * SponsoredAdsData.position in PromoCarousel. Null/undefined means the
   * merchant hasn't set one; CollectionFeed should fall back to its own
   * default position, same as it already does for sponsoredAds.
   */
  position?: number | null;
}

interface PromoBannerProps {
  banner?: PromoBannerData | null;
}

/**
 * Narrows a possibly-unvalidated string (metafield values are always raw
 * strings) to one of `allowed`, falling back to `fallback` for anything
 * missing or not recognized — same pattern as collections.$handle.tsx's
 * own toEnum() helper for CollectionBanner's text-alignment metafield.
 */
function toEnum<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(raw ?? '')
    ? (raw as T)
    : fallback;
}

export function PromoBanner({banner}: PromoBannerProps) {
  if (!banner || (!banner.heading && !banner.image)) {
    return null;
  }

  const variant = toEnum(banner.variant, VARIANTS, 'split-left');
  const textAlignment = toEnum(
    banner.textAlignment,
    TEXT_ALIGNMENTS,
    'left',
  );

  const hasCta = Boolean(banner.linkUrl && banner.linkText);

  const textBlock = (
    <div className="promo-banner__text">
      {banner.heading && (
        <h2 className="promo-banner__heading">{banner.heading}</h2>
      )}
      {banner.subheading && (
        <p className="promo-banner__subheading">{banner.subheading}</p>
      )}
      {hasCta && (
        <Link to={banner.linkUrl as string} className="promo-banner__cta">
          {banner.linkText}
        </Link>
      )}
    </div>
  );

  const image = banner.image?.url ? (
    <div className="promo-banner__media">
      <Image
        data={banner.image}
        sizes={variant === 'full-bleed' ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
        loading="eager"
        className="promo-banner__image"
      />
    </div>
  ) : null;

  return (
    <div
      className={`promo-banner promo-banner--${variant} promo-banner--text-${textAlignment}`}
      data-promo-banner
      style={
        banner.backgroundColor
          ? ({'--promo-banner-bg': banner.backgroundColor} as React.CSSProperties)
          : undefined
      }
    >
      {variant === 'minimal' ? (
        textBlock
      ) : variant === 'full-bleed' ? (
        <>
          {image}
          <div className="promo-banner__scrim" aria-hidden="true" />
          {textBlock}
        </>
      ) : variant === 'split-right' ? (
        <>
          {textBlock}
          {image}
        </>
      ) : (
        // split-left (default)
        <>
          {image}
          {textBlock}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DEMO DATA — fixtures for isolated component preview/testing only.
//
// One hardcoded PromoBannerData object per variant, so all 4 layouts can
// still be dropped into a scratch route or story to sanity-check a CSS
// change without needing live merchant metafield data. Not used by
// collections.$handle.tsx's render path.
// ─────────────────────────────────────────────────────────────────────────

export const PROMO_BANNER_DEMO_DATA: Record<PromoBannerVariant, PromoBannerData> = {
  'split-left': {
    id: 'demo-split-left',
    variant: 'split-left',
    heading: 'Gear up for the ride',
    subheading: 'New arrivals across bikes, scooters, and accessories.',
    image: {
      url: 'https://cdn.shopify.com/s/files/1/placeholder/promo-split-left.jpg',
      altText: 'Rider on an electric bike',
      width: 1200,
      height: 900,
    },
    linkText: 'Shop new arrivals',
    linkUrl: '/collections/all',
  },
  'split-right': {
    id: 'demo-split-right',
    variant: 'split-right',
    heading: 'Trade in, level up',
    subheading: 'Get credit toward your next ride with our trade-in program.',
    image: {
      url: 'https://cdn.shopify.com/s/files/1/placeholder/promo-split-right.jpg',
      altText: 'Electric scooter parked outdoors',
      width: 1200,
      height: 900,
    },
    linkText: 'Learn more',
    linkUrl: '/pages/trade-in',
  },
  'full-bleed': {
    id: 'demo-full-bleed',
    variant: 'full-bleed',
    heading: 'End of season sale',
    subheading: 'Up to 30% off select models — this week only.',
    image: {
      url: 'https://cdn.shopify.com/s/files/1/placeholder/promo-full-bleed.jpg',
      altText: 'Electric bike on a mountain trail',
      width: 1600,
      height: 900,
    },
    linkText: 'Shop the sale',
    linkUrl: '/collections/sale',
    textAlignment: 'left',
  },
  minimal: {
    id: 'demo-minimal',
    variant: 'minimal',
    heading: 'Free shipping on orders over $99',
    subheading: 'No code needed — applied automatically at checkout.',
    backgroundColor: '#FEF3C7', // light — see KNOWN LIMITATION note above PromoBannerData
    textAlignment: 'center',
  },
};