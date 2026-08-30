/**
 * Thin wrapper around Yotpo's official client-side Star Rating widget div
 * (instance 1332841 — see Yotpo dashboard: Star Rating Widget install
 * snippet). This is separate from `~/snippets/StarRating.tsx`, which is a
 * custom-built React/SVG star rating that hits Yotpo's server-side Bottom
 * Line API instead of relying on this client-side widget.
 *
 * Historical note: the custom StarRating.tsx exists because this official
 * widget "never rendered reliably" (see comment in products.$handle.tsx) —
 * but that was evaluated before `useYotpoRefresh()` existed to re-trigger
 * Yotpo's DOM scan after client-side route navigations. This component is
 * for re-testing that assumption. It relies on `useYotpoRefresh()` already
 * being called once elsewhere on the route (e.g. in products.$handle.tsx)
 * — Yotpo's refreshWidgets()/initWidgets() scans the whole DOM for
 * `.yotpo-widget-instance` nodes, so no additional hook call is needed
 * here.
 *
 * suppressHydrationWarning is required for the same reason as in
 * ReviewsWidget.tsx: without it, React's hydration reconcile detects a
 * mismatch against our empty JSX and wipes out whatever Yotpo already
 * rendered into this node.
 *
 * To compare against the custom StarRating.tsx, swap it in temporarily in
 * ProductDetail.tsx:
 *
 *   {bottomline && (
 *     <YotpoStarRating
 *       instanceId="1332841"
 *       productId={yotpoProductId}
 *     />
 *   )}
 *
 * If this renders reliably in production (including after client-side PDP
 * navigations), it may be worth retiring StarRating.tsx and
 * getYotpoBottomline() in favor of this — trading control/SSR-on-first-
 * paint for less custom code to maintain. If it still doesn't render
 * consistently, that confirms the custom approach remains the right call.
 */

export function YotpoStarRating({
  instanceId,
  productId,
}: {
  instanceId: string;
  productId: string | undefined;
}) {
  return (
    <div
      className="yotpo-widget-instance"
      data-yotpo-instance-id={instanceId}
      data-yotpo-product-id={productId}
      suppressHydrationWarning
    />
  );
}