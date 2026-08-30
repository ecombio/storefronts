// app/snippets/ReviewsWidget.tsx

/**
 * Renders the container div Yotpo's loader script scans for and
 * populates client-side with the full reviews widget (list, photos,
 * "Write a review" form, etc). This is the Hydrogen equivalent of the
 * Liquid snippet Yotpo's install instructions ask you to paste into
 * product.liquid — same data-yotpo-* attributes, built from Storefront
 * API data instead of Liquid's product/shop objects.
 *
 * Named ReviewsWidget rather than YotpoReviewsWidget so a future
 * reviews-provider swap doesn't require a rename — only the internals
 * and data-yotpo-* attributes are vendor-specific.
 *
 * Yotpo's loader script (injected once in root.tsx) attaches to any
 * element with a matching data-yotpo-instance-id at load time. Because
 * Hydrogen is an SPA under the hood, useYotpoRefresh() re-triggers that
 * scan on every client-side route change — the loader only runs once
 * by default and won't notice this div on its own after navigation.
 *
 * data-yotpo-prevent-load-rs="true" stops Yotpo from also rendering its
 * own star-rating summary line inside this widget, since that's already
 * handled by the separate <StarRating /> component above it on the
 * page — without this you get two star rows.
 */
export function ReviewsWidget({
  instanceId,
  productId,
  productTitle,
  productUrl,
  imageUrl,
  price,
  currency,
  description,
}: {
  instanceId: string;
  productId?: string;
  productTitle: string;
  productUrl: string;
  imageUrl?: string;
  price?: string;
  currency?: string;
  description?: string | null;
}) {
  return (
    <div
      className="yotpo-widget-instance"
      data-yotpo-instance-id={instanceId}
      data-yotpo-product-id={productId}
      data-yotpo-name={productTitle}
      data-yotpo-url={productUrl}
      data-yotpo-image-url={imageUrl}
      data-yotpo-price={price}
      data-yotpo-currency={currency}
      data-yotpo-description={description ?? ''}
      data-yotpo-section-id="product"
      data-yotpo-cart-product-id=""
      data-yotpo-prevent-load-rs="true"
    />
  );
}