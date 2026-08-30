import type {MappedProductOptions} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import {StarRating} from '~/snippets/StarRating';
import {YotpoStarRating} from '~/snippets/YotpoStarRating';
import {ProductPrice} from '~/snippets/ProductPrice';
import {ProductForm} from '~/sections/ProductForm';
import {ProductDescriptionPanels} from '~/snippets/ProductDescriptionPanels';
import {SaleBadge} from '~/snippets/SaleBadge';
import type {YotpoBottomline} from '~/lib/yotpo';

// Yotpo's official Star Rating Widget instance ID — see Yotpo dashboard.
// Used only by YotpoStarRating below, for side-by-side comparison against
// the custom-built StarRating. Not the same instance as the Reviews
// Widget (see YOTPO_REVIEWS_INSTANCE_ID in products.$handle.tsx).
const YOTPO_STAR_RATING_INSTANCE_ID = '1332841';

/**
 * Right-hand column of the PDP: sale badge, title, star rating, price,
 * variant picker + add-to-cart (via ProductForm), and description.
 * Sibling to ProductMedia, which handles the left-hand image/gallery.
 *
 * Styling: see .product-detail rules in assets/main-product.css.
 */
export function ProductDetail({
  title,
  descriptionHtml,
  shippingHtml,
  refundHtml,
  warrantyHtml,
  productOptions,
  selectedVariant,
  bottomline,
  yotpoProductId,
}: {
  title: ProductFragment['title'];
  descriptionHtml: ProductFragment['descriptionHtml'];
  shippingHtml?: string | null;
  refundHtml?: string | null;
  warrantyHtml?: string | null;
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  bottomline: YotpoBottomline | null;
  /** Legacy numeric Yotpo product id — required by YotpoStarRating below.
   *  StarRating (the custom-built one) doesn't need this; it only uses
   *  `bottomline`, which is already resolved server-side. */
  yotpoProductId: string | undefined;
}) {
  return (
    <div className="product-detail">
      <SaleBadge
        price={selectedVariant?.price}
        compareAtPrice={selectedVariant?.compareAtPrice}
      />
      <h1 className="product-detail-title">{title}</h1>
      {bottomline && (
        <StarRating
          averageScore={bottomline.averageScore}
          totalReviews={bottomline.totalReviews}
          onClick={() =>
            document
              .getElementById('reviews')
              ?.scrollIntoView({behavior: 'smooth', block: 'start'})
          }
        />
      )}
      {/* Temporary: side-by-side comparison against Yotpo's official
          Star Rating widget, to re-test whether it now renders reliably
          now that useYotpoRefresh() exists. Remove once the comparison
          is done — keep whichever one wins. */}
      <YotpoStarRating
        instanceId={YOTPO_STAR_RATING_INSTANCE_ID}
        productId={yotpoProductId}
      />
      <ProductPrice
        price={selectedVariant?.price}
        compareAtPrice={selectedVariant?.compareAtPrice}
      />
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
      />
      <ProductDescriptionPanels
        panels={[
          {id: 'description', title: 'Description', html: descriptionHtml},
          {
            id: 'shipping',
            title: 'Shipping Policy',
            html: shippingHtml ?? '',
          },
          {
            id: 'refund',
            title: 'Refund & Return Policy',
            html: refundHtml ?? '',
          },
          {
            id: 'warranty',
            title: 'Warranty',
            html: warrantyHtml ?? '',
          },
        ]}
      />
    </div>
  );
}