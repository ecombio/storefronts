# Algolia — Capabilities & ecombio Status

_Working reference doc — what Algolia can do, and where ecombio's Hydrogen/Remix storefront actually stands today._

---

## 1. Current state in ecombio's codebase

| Area | Status | File(s) |
|---|---|---|
| **Search / autocomplete** | ✅ Live, working | `app/lib/algolia.ts`, `SearchPanel.tsx`, `SearchResultsPredictive.tsx` |
| **"AI" search bar** | 🎨 UI-only — no AI wired up | `app/snippets/AiSearchBar.tsx` |
| **PDP recommendations ("You may also like")** | ✅ Live, but on **Shopify's native** `productRecommendations` API — not Algolia | `app/lib/recommendations.server.ts`, `products.$handle.tsx` |
| **Cart drawer recommendations** | ✅ Live, also Shopify-native | `CartRecommendations.tsx`, `api.cart-recommendations.tsx` |
| **Algolia Recommend (FBT / Related / Trending)** | ❌ Not implemented | — |
| **Algolia Insights (event tracking)** | ❌ Not implemented — confirmed missing | — |
| **Ask AI / Agent Studio** | ❌ Not implemented | — |

**Key takeaway:** Algolia is currently scoped to on-site keyword search only. Everything "recommendation" or "AI" flavored elsewhere in the app is either Shopify's own engine or cosmetic UI with no model behind it yet.

---

## 2. Algolia product catalog (what's available, if we want it)

### Recommend
ML-driven product recommendations, trained on your index + behavioral events.

| Model | What it does | Needs events? |
|---|---|---|
| Frequently Bought Together | Cross-sell — "bought together" | Yes (conversions) |
| Related Products | "You may also like" style | Yes (clicks + conversions) |
| Trending Items | Popular sitewide or per-category | Yes (conversions) |
| Looking Similar | Visually similar items (image-based) | **No** |
| Content-based filtering | Attribute-based fallback (category, tags, price) | **No** |

⚠️ **Blocker:** FBT / Related / Trending need real shopper events sent via Algolia's Insights API (view, click, add-to-cart, purchase). We don't have this instrumented. Until it exists, only **Looking Similar** and plain **content-based filtering** would return anything meaningful.

### Ask AI / Agent Studio
Turns search into a conversational, RAG-grounded Q&A experience layered on top of your product index — answers questions in natural language using real catalog data (no hallucination), with optional follow-ups. Ships as a pre-built `Search + AskAI` component (keyword hits stay visible, AI handles broader/fuzzier intent) or as a custom Agent Studio agent (system prompt + LLM provider + which indices it can query).

- **No event data required** — works off the catalog directly, so this is realistically shippable sooner than Recommend.
- ecombio's `AiSearchBar.tsx` already has the right UI contract (`onQueryChange`/`onSearch`) to sit in front of this — it just isn't connected to anything yet.

### AI Personalization
Re-ranks search results, recommendations, and category pages **per shopper** in real time based on their own behavior — distinct from Recommend, which is the same for everyone viewing a given product. Also needs event data.

### Analytics / Recommendation Analytics
Dashboards for CTR, conversions, no-results queries, and (newer) per-carousel recommendation performance (clicks/conversions/revenue by placement). Read-only insight layer — doesn't require code changes to your storefront, mostly dashboard config.

### Browse / Merchandising Studio
Rule-based curation for category/collection pages — pin, boost, or hide products per category without a deploy. Non-engineers can manage this once set up. No behavioral event dependency.

### MCP Server (Agentic Commerce)
Lets AI assistants (ChatGPT, Claude, Perplexity, etc.) query your Algolia index directly, surfacing your products inside their chat interfaces. This is the one Algolia feature that touches "external exposure" — but it's narrow: it only helps if those platforms actually call your MCP endpoint, and it's unrelated to Google SEO, ads, or general online presence.

---

## 3. What Algolia does **not** do

Traditional SEO, ad placement, backlinks, social presence, and general "online exposure" are outside Algolia's scope entirely — it's an on-site search/discovery/personalization layer, not a marketing platform. The one adjacency is the MCP/agentic-commerce piece above.

External exposure work (Semrush, SimilarWeb, blog content) is a **separate workstream** from anything Algolia does, though there's overlap worth exploiting:
- **Semrush keyword data** → can improve Algolia's synonym config / reduce on-site "no results" queries, and flag content gaps for the AI-SEO/agentic-commerce play.
- **SimilarWeb traffic/engagement data** → helps decide whether on-site discovery (search/recs) is actually the conversion bottleneck, or whether the issue is elsewhere.
- **Existing blogs** → already indexed in Algolia and surfacing in search results ("Articles" section) — so content-gap work also directly improves on-site search relevance, not just external SEO.

---

## 4. Realistic next steps, ranked by effort

1. **Lowest lift, no prerequisites:** Ship **Looking Similar** on PDPs, or set up **Browse/Merchandising rules** for collection pages.
2. **Medium lift, no event data needed:** Wire `AiSearchBar.tsx` to a real **Ask AI / Agent Studio** agent — UI groundwork already exists.
3. **Bigger lift, needs new infra:** Instrument **Insights events** (view/click/add-to-cart/purchase) — unlocks Recommend's FBT/Related/Trending and AI Personalization, but requires time to accumulate meaningful data before results are good.
4. **Parallel, non-code track:** Content-gap analysis using Semrush + SimilarWeb + existing blog inventory — improves both external SEO and on-site search relevance simultaneously.
