import type {ProductFragment} from 'storefrontapi.generated';

const YOTPO_INSTANCE_ID = '1332840';

export function ProductReviews({
  product,
  selectedVariant,
  shopUrl,
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  shopUrl: string;
}) {
  return (
    <div
      className="yotpo-widget-instance"
      data-yotpo-instance-id={YOTPO_INSTANCE_ID}
      data-yotpo-product-id={product.id.split('/').pop()}
      data-yotpo-name={product.title}
      data-yotpo-url={`https://${shopUrl}/products/${product.handle}`}
      data-yotpo-image-url={selectedVariant?.image?.url}
      data-yotpo-price={selectedVariant?.price?.amount}
      data-yotpo-currency={selectedVariant?.price?.currencyCode}
      data-yotpo-description={product.description}
    />
  );
}
