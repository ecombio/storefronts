# 02 — Feature: Algolia Recommend

## What it is
A set of pre-trained ML models layered on the Algolia product index, each answering a different discovery question.

| Model | Question answered | Needs events? |
|---|---|---|
| Frequently Bought Together (FBT) | "What's bought alongside this?" | Yes — conversion events |
| Related Products | "What's similar/adjacent to this?" | Yes — click + conversion events |
| Trending Items | "What's popular right now?" (global or per-facet) | Yes — conversion events over time |
| Looking Similar | "What looks visually like this?" | **No** — image data only |
| Content-based filtering | Attribute-based fallback (category, tags, price) | **No** |

## Current blocker
FBT, Related Products, and Trending all require shopper behavior sent to Algolia via the **Insights API** (view, click, add-to-cart, purchase). This is not implemented (see [01-current-state.md](./01-current-state.md)). Without it, these three models return empty or fall back to weak matching.

**Only Looking Similar and content-based filtering are shippable today with zero new infrastructure.**

## Where it would surface in the UI
- **PDP:** Frequently Bought Together typically sits near Add to Cart as a cross-sell strip; Related Products occupies the "you may also like" slot currently filled by Shopify's native recs.
- **Cart drawer:** Could replace or run alongside the existing `CartRecommendations.tsx` Shopify-native carousel.
- **Category pages:** Trending Items, once event data exists.

## Decision needed
- **Replace** Shopify's native recommendations entirely, or **run alongside** (e.g. Algolia on PDP, Shopify in cart) for comparison?
- Which model(s) to prioritize once Insights is live — FBT (cross-sell revenue) vs. Related (discovery/catalog exposure)?

## Implementation notes (once Insights events exist)
- Package: `react-instantsearch` (v7.9.0+) — the older standalone `@algolia/recommend-react` package is deprecated.
- Components: `<FrequentlyBoughtTogether />`, `<RelatedProducts />`, both children of `<InstantSearch>`, using the same `algoliasearch` client already used for search.
- `objectIDs` prop must match the product's Algolia `objectID` — confirm this maps cleanly to the Shopify product/variant ID used elsewhere in the app.
- CSP note: given the mega-menu image bug was a CSP host-allowlist issue, verify `entry.server.tsx`'s CSP allows Algolia's recommend/insights endpoints (`*.algolia.net`, `*.algolianet.com`) if not already covered by the search integration.

## Dependencies
Requires [Insights event instrumentation] — not yet its own section; tracked as a prerequisite task in [07-roadmap-phasing.md](./07-roadmap-phasing.md).
