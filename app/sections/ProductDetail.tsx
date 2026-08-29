import type {MappedProductOptions} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';
import {StarRating} from '~/snippets/StarRating';
import {ProductPrice} from '~/snippets/ProductPrice';
import {ProductForm} from '~/sections/ProductForm';
import {Description} from '~/snippets/ProductDescription';
import type {YotpoBottomline} from '~/lib/yotpo';

/**
 * Right-hand column of the PDP: title, star rating, price, variant
 * picker + add-to-cart (via ProductForm), and description.
 * Sibling to ProductMedia, which handles the left-hand image/gallery.
 */
export function ProductDetail({
  title,
  descriptionHtml,
  productOptions,
  selectedVariant,
  bottomline,
}: {
  title: ProductFragment['title'];
  descriptionHtml: ProductFragment['descriptionHtml'];
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  bottomline: YotpoBottomline | null;
}) {
  return (
    <div>
      <h1>{title}</h1>
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
      <br />
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
      />
      <br />
      <br />
      <Description descriptionHtml={descriptionHtml} />
    </div>
  );
}
