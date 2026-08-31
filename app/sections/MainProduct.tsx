// app/sections/MainProduct.tsx
import type {
  MappedProductOptions,
} from '@shopify/hydrogen';
import {StarRating} from '~/snippets/StarRating';
import {ProductMedia} from '~/sections/ProductMedia';
import {ProductPrice} from '~/snippets/ProductPrice';
import {ProductForm} from '~/sections/ProductForm';
import {ProductDescriptionPanels} from '~/snippets/ProductDescriptionPanels';
import {SaleBadge} from '~/snippets/SaleBadge';
import {Breadcrumbs} from '~/snippets/Breadcrumbs';
import type {YotpoReviewsResponse} from '~/lib/yotpo.server';

type BreadcrumbCollection = {
  handle: string;
  title: string;
} | null;

/**
 * MainProduct is presentational only: it renders the primary product
 * detail block (breadcrumbs, media, badge, title, rating, price, add
 * to cart form, and description/policy accordions).
 *
 * It does NOT fetch data, compute the selected variant, or render
 * CustomerReviews / ProductCarousel — those stay in
 * app/templates/products.$handle.tsx, which owns the loader and
 * passes everything this component needs down as props.
 */
export type MainProductProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: any; // ProductFragment (from PRODUCT_QUERY in products.$handle.tsx)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedVariant: any; // ProductVariantFragment
  productOptions: MappedProductOptions[];
  shippingHtml: string | null;
  refundHtml: string | null;
  warrantyHtml: string | null;
  parentCollection: BreadcrumbCollection;
  childCollection: BreadcrumbCollection;
  yotpoReviews: YotpoReviewsResponse | null;
  onReviewsClick: () => void;
  onWriteReviewClick: () => void;
};

export function MainProduct({
  product,
  selectedVariant,
  productOptions,
  shippingHtml,
  refundHtml,
  warrantyHtml,
  parentCollection,
  childCollection,
  yotpoReviews,
  onReviewsClick,
  onWriteReviewClick,
}: MainProductProps) {
  const {title, descriptionHtml} = product;

  return (
    <>
      <Breadcrumbs
        productTitle={title}
        parentCollection={parentCollection}
        childCollection={childCollection}
      />
      <div className="product-layout">
        <ProductMedia
          images={product.images?.nodes ?? []}
          selectedVariantImage={selectedVariant?.image}
          productTitle={title}
        />

        <div className="product-detail">
          <SaleBadge
            price={selectedVariant?.price}
            compareAtPrice={selectedVariant?.compareAtPrice}
          />
          <h1 className="product-detail-title">{title}</h1>
          <StarRating
            averageScore={yotpoReviews?.bottomline.averageScore ?? 0}
            totalReviews={yotpoReviews?.bottomline.totalReviews ?? 0}
            onReviewsClick={onReviewsClick}
            onWriteReviewClick={onWriteReviewClick}
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
      </div>
    </>
  );
}