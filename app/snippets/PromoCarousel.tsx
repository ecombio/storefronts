// app/snippets/PromoCarousel.tsx
//
// Amazon-style "sponsored brand" panel: a promo card (brand image + heading)
// on the left, and a horizontally-scrollable row of shoppable products on
// the right — pulled from the `custom.sponsored_ads` collection metafield
// (a `promo_carousel` metaobject reference).
//
// Renders nothing if the metafield/reference is missing or has no products,
// so it's always safe to render unconditionally from the route.
//
// ⚠️ FIELD-KEY ASSUMPTIONS — CONFIRM AND ADJUST:
// The `promo_card` metaobject's actual field keys haven't been confirmed
// yet. This file (and the matching GraphQL fragment in
// sponsored-ads-fragment.graphql) assumes:
//   - image        (File / image reference)
//   - heading       (single line text)
//   - link_text     (single line text, optional CTA label)
//   - link_url      (single line text or URL, optional CTA target)
// If your real Promo Card definition uses different keys, update the
// `field(key: "...")` calls in the GraphQL fragment file, and update the
// `PromoCardData` interface + JSX below to match.

import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {ProductCardFragment} from 'storefrontapi.generated';
import {ProductCard} from '~/snippets/ProductCard';

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

export interface SponsoredAdsData {
  id: string;
  heading?: string | null;
  subheading?: string | null;
  promoCard?: PromoCardData | null;
  products: ProductCardFragment[];
}

interface PromoCarouselProps {
  sponsoredAds?: SponsoredAdsData | null;
}

export function PromoCarousel({sponsoredAds}: PromoCarouselProps) {
  if (!sponsoredAds?.promoCard || sponsoredAds.products.length === 0) {
    return null;
  }

  const {heading, subheading, promoCard, products} = sponsoredAds;

  return (
    <div className="promo-carousel" data-promo-carousel>
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

      <div className="promo-carousel__products" data-promo-carousel-track>
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
    </div>
  );
}