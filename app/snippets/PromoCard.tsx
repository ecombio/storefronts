// app/snippets/PromoCard.tsx
//
// The left-hand brand panel used inside PromoCarousel: image, heading,
// subheading, an optional secondary heading pulled off the promo_card
// metaobject itself, and an optional CTA link. Split out of
// PromoCarousel.tsx so it follows the same one-component-per-file
// pattern as the rest of ~/snippets (ProductCard.tsx, ArticleItem.tsx,
// etc.), and so it can be reused elsewhere if a promo panel is ever
// needed outside the carousel context.
//
// ⚠️ FIELD-KEY ASSUMPTIONS — CONFIRM AND ADJUST:
// See PromoCarousel.tsx for the full note on unconfirmed promo_card
// metaobject field keys (image, heading, link_text, link_url).

import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';

export interface PromoCardData {
  id: string;
  image?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  heading?: string | null;
  linkText?: string | null;
  linkUrl?: string | null;
}

export interface PromoCardProps {
  promoCard: PromoCardData;
  /** Sponsored-ads-level heading — separate from promoCard.heading below. */
  heading?: string | null;
  /** Sponsored-ads-level subheading. */
  subheading?: string | null;
}

export function PromoCard({promoCard, heading, subheading}: PromoCardProps) {
  return (
    <div className="promo-carousel__panel">
      {promoCard.image?.url && (
        <div className="promo-carousel__panel-media">
          <Image
            data={promoCard.image}
            sizes="280px"
            loading="eager"
            className="promo-carousel__panel-image"
          />
        </div>
      )}

      <div className="promo-carousel__panel-text">
        {heading && <h2 className="promo-carousel__heading">{heading}</h2>}
        {subheading && (
          <p className="promo-carousel__subheading">{subheading}</p>
        )}
        {promoCard.heading && (
          <p className="promo-carousel__panel-heading">{promoCard.heading}</p>
        )}
        {promoCard.linkUrl && promoCard.linkText && (
          <Link to={promoCard.linkUrl} className="promo-carousel__cta">
            {promoCard.linkText}
          </Link>
        )}
      </div>
    </div>
  );
}