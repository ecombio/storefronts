/**
 * Thin wrapper around Yotpo's official client-side Star Rating widget div
 * (instance 1332841 — see Yotpo dashboard: Star Rating Widget install
 * snippet). This is the sole star-rating implementation — the earlier
 * custom-built ~/snippets/StarRating.tsx (server-side Bottom Line API)
 * was removed in favor of this official widget.
 *
 * It relies on `useYotpoRefresh()` already being called once elsewhere on
 * the route (e.g. in products.$handle.tsx) — Yotpo's refreshWidgets()/
 * initWidgets() scans the whole DOM for `.yotpo-widget-instance` nodes, so
 * no additional hook call is needed here.
 *
 * dangerouslySetInnerHTML={{__html: ''}} (not just suppressHydrationWarning)
 * is required here. Yotpo's async loader script races React's hydration —
 * it can mutate this div's children (inserting its own Vue-rendered nodes,
 * comments, whitespace) before hydration reaches it. suppressHydrationWarning
 * alone only silences *text content* mismatch warnings one level deep; it
 * does not stop React from throwing when it finds unexpected *child nodes*
 * that don't match the empty server render, which previously caused
 * intermittent "Hydration failed" errors that forced the whole page to
 * fall back to full client-side re-rendering. Setting
 * dangerouslySetInnerHTML tells React to treat this node's contents as
 * opaque — it claims the DOM node during hydration but never diffs its
 * children — so it no longer matters whether Yotpo's script has already
 * mutated the div by the time hydration gets there.
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
      dangerouslySetInnerHTML={{__html: ''}}
    />
  );
}