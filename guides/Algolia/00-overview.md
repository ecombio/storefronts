# 00 — Overview

## Problem statement
ecombio's Hydrogen/Remix storefront has Algolia installed for on-site keyword search only. Product recommendations, "AI" search branding, and category curation either run on separate systems (Shopify's native recommendation API) or don't exist yet, despite UI scaffolding suggesting otherwise (e.g. `AiSearchBar.tsx`). This creates a gap between what the storefront *looks like* it does and what it *actually* does, and leaves unused capacity in the Algolia platform we're already paying for.

## Goals
- Establish a single source of truth for what Algolia currently powers vs. what's aspirational.
- Evaluate each unused Algolia capability (Recommend, Ask AI, Personalization, Analytics, Browse, MCP) against real prerequisites and effort.
- Sequence adoption so we ship what's achievable now, and instrument what's needed for the rest.
- Keep a clear boundary between what Algolia can affect (on-site discovery) and what it can't (external SEO, ads, general online presence).

## Non-goals
- This is not a redesign of the storefront's search UI.
- This is not a commitment to build every feature listed — it's a scoping/decision document.
- This does not cover Shopify-side theme or admin configuration.

## Glossary
| Term | Meaning |
|---|---|
| **Hit** | A single search/recommendation result returned by Algolia |
| **Index** | The Algolia dataset (here: `products`, likely also articles) queried by search/recommend |
| **Insights API** | Algolia's event-tracking endpoint (view, click, add-to-cart, purchase) that trains Recommend/Personalization models |
| **Intent** | Shopify's native recommendation parameter (`RELATED`, `COMPLEMENTARY`) — not an Algolia concept |
| **FBT** | Frequently Bought Together (an Algolia Recommend model) |
| **RAG** | Retrieval-Augmented Generation — how Ask AI/Agent Studio grounds answers in real catalog data |
| **MCP** | Model Context Protocol — lets external AI assistants (ChatGPT, Claude, etc.) query an Algolia index directly |

## Related sections
See [01-current-state.md](./01-current-state.md) for the implementation audit this PRD is built on.
