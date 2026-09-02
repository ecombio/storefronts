# 07 — Roadmap / Phasing

Ranked by effort and dependency, not strict priority — pick based on team bandwidth and business goals.

## Phase 0 — No prerequisites, near-zero engineering cost
- [ ] Enable **Analytics** dashboard (CTR, conversions, no-results queries) — informs every later decision ([04](./04-feature-personalization-analytics-browse.md))
- [ ] Run **Semrush + blog content-gap analysis** — independent value, feeds later phases ([06](./06-external-growth-seo.md))

## Phase 1 — Low engineering lift, no Insights dependency
- [ ] Ship **Looking Similar** on PDPs (image-based, zero events needed) ([02](./02-feature-recommend.md))
- [ ] Set up **Browse/Merchandising Studio** rules for category pages ([04](./04-feature-personalization-analytics-browse.md))
- [ ] Wire `AiSearchBar.tsx` to a real **Ask AI / Agent Studio** agent — UI groundwork already exists ([03](./03-feature-ask-ai.md))

## Phase 2 — Requires new infrastructure
- [ ] Instrument **Insights API events** (product view, click, add-to-cart, purchase) across the storefront — this is the single biggest unlock in this PRD ([02](./02-feature-recommend.md))
- [ ] Let events accumulate — realistically days to weeks depending on traffic before models produce good results

## Phase 3 — Unlocked by Phase 2
- [ ] Frequently Bought Together + Related Products (Algolia Recommend) — decide replace-vs-alongside Shopify's native recs first ([02](./02-feature-recommend.md))
- [ ] Trending Items
- [ ] AI Personalization ([04](./04-feature-personalization-analytics-browse.md))

## Phase 4 — Revisit later
- [ ] MCP Server / agentic commerce exposure — genuine upside, but platform adoption (ChatGPT/Perplexity/etc.) is still early; lowest urgency ([05](./05-feature-mcp-agentic-commerce.md))

## Open decisions to resolve before Phase 2/3
- Replace Shopify's native recommendations entirely, or run Algolia Recommend alongside for comparison?
- Which Recommend model to prioritize first once event data exists — FBT (cross-sell revenue) or Related Products (discovery)?
- Does `AiSearchBar` route to AI conversationally by default, or via an explicit toggle?
