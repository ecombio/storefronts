import type {MappedProductOptions} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import {StarRating} from '~/snippets/StarRating';
import {ProductPrice} from '~/snippets/ProductPrice';
import {ProductForm} from '~/sections/ProductForm';
import {ProductDescriptionPanels} from '~/snippets/ProductDescriptionPanels';
import {SaleBadge} from '~/snippets/SaleBadge';
import type {YotpoBottomline} from '~/lib/yotpo';

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
  productOptions,
  selectedVariant,
  bottomline,
}: {
  title: ProductFragment['title'];
  descriptionHtml: ProductFragment['descriptionHtml'];
  shippingHtml?: string | null;
  refundHtml?: string | null;
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  bottomline: YotpoBottomline | null;
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
        />
      )}
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
          // Warranty panel slots in here once that content has a
          // source (product metafield or policy page) — see the
          // priority order in the reference implementation.
        ]}
      />
    </div>
  );
}