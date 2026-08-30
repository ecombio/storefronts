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
 * client-side widgets.
 *
 * dangerouslySetInnerHTML={{__html: ''}} (not just suppressHydrationWarning)
 * is required here — same reasoning as YotpoStarRating.tsx. Yotpo's async
 * loader script races React's hydration and can mutate this div's children
 * before hydration reaches it; suppressHydrationWarning alone doesn't stop
 * React from throwing on unexpected child nodes, only on mismatched text
 * content one level deep. This was confirmed to intermittently break
 * YotpoStarRating.tsx with a full-page hydration failure — applying the
 * same fix here preemptively, since this component has the identical
 * architecture and is exposed to the same race.
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
      dangerouslySetInnerHTML={{__html: ''}}
    />
  );
}