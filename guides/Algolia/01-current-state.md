# 01 — Current State (Audit)

## Summary
Algolia is scoped to **on-site keyword search only**. Everything "recommendation" or "AI" flavored elsewhere in the app is either Shopify's own engine or cosmetic UI with no model behind it.

## Inventory

| Area | Status | Files | Notes |
|---|---|---|---|
| Search / autocomplete | ✅ Live | `app/lib/algolia.ts`, `SearchPanel.tsx`, `SearchResultsPredictive.tsx` | Real, working Algolia queries — hits, suggestions, and indexed article results all confirmed via screenshots |
| "AI" search bar | 🎨 UI-only | `app/snippets/AiSearchBar.tsx` | Styled component (animated placeholder, "AI" icon, gradient pill) with `onQueryChange`/`onSearch` props — no LLM, no Ask AI, no Agent Studio wired in. Almost certainly built as a visual placeholder ahead of the real integration. |
| PDP recommendations | ✅ Live, Shopify-native | `app/lib/recommendations.server.ts`, `products.$handle.tsx` | Uses Shopify's `productRecommendations` GraphQL API (`intent: RELATED`), rendered via `ProductCarousel` as "You may also like" |
| Cart drawer recommendations | ✅ Live, Shopify-native | `CartRecommendations.tsx`, `api.cart-recommendations.tsx` | Same underlying `getProductRecommendations` helper as PDP |
| Algolia Recommend (FBT / Related / Trending) | ❌ Not implemented | — | No Algolia Recommend models in use anywhere |
| Algolia Insights (event tracking) | ❌ Not implemented | — | Confirmed missing — no click/conversion events currently sent to Algolia |
| Ask AI / Agent Studio | ❌ Not implemented | — | No Agent Studio agent configured; no RAG calls anywhere in the app |
| AI Personalization | ❌ Not implemented | — | Depends on Insights events, which don't exist yet |
| Analytics / Recommendation Analytics | ❌ Not implemented | — | Dashboard-side setup, not yet configured |
| Browse / Merchandising Studio | ❌ Not implemented | — | Collection pages currently code-driven, not rule-driven |
| MCP Server | ❌ Not implemented | — | No agentic-commerce exposure set up |

## Key architectural facts worth remembering
- The Algolia client for search (`algoliasearch/lite` via `liteClient`) is entirely separate from anything Recommend/Ask AI would need — no shared wiring currently exists between them.
- Recommendation data flow today: Shopify Storefront API → `recommendations.server.ts` → deferred loader data → `ProductCarousel` / `CartRecommendations`. Any Algolia Recommend integration would need to either replace or run alongside this path.
- Routing convention: API-style routes live under `app/templates/api.*.tsx` (flat-routes convention), not `app/routes/` — relevant for any new Ask AI or Insights proxy endpoint.
