/**
 * Thin wrapper around Yotpo's client-side "Reviews" widget div (instance
 * 1332840 — see Yotpo dashboard: Reviews Widget install snippet).
 * Yotpo's async loader script (in root.tsx) finds this div by its
 * data-yotpo-instance-id and injects its own rendered markup into it.
 * useYotpoRefresh() (called in the parent route) tells that script to
 * init/re-init this instance on mount + route change.
 *
 * Named YotpoReviewsWidget (rather than ReviewsWidget) to pair clearly
 * with ~/snippets/YotpoStarRating.tsx — both wrap official Yotpo
 * client-side widgets, as distinct from the custom-built
 * ~/snippets/StarRating.tsx.
 *
 * suppressHydrationWarning is required: without it, React's hydration
 * reconcile detects a mismatch against our empty JSX and wipes out
 * whatever Yotpo already rendered into this node.
 */

export function YotpoReviewsWidget({
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
  productId: string | undefined;
  productTitle: string;
  productUrl: string;
  imageUrl: string | undefined;
  price: string | undefined;
  currency: string | undefined;
  description: string | null | undefined;
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
      data-yotpo-description={description}
      suppressHydrationWarning
    />
  );
}