# 06 — External Growth Data (Semrush / SimilarWeb / Blogs)

## Scope boundary
Algolia is an on-site search/discovery/personalization layer. Traditional SEO, ad placement, backlinks, and social presence are **outside its scope** — the one adjacency is MCP/agentic commerce, covered in [05-feature-mcp-agentic-commerce.md](./05-feature-mcp-agentic-commerce.md). This section tracks the external data ecombio already has, and where it usefully overlaps with the Algolia work rather than duplicating it.

## Available inputs
- **Semrush** — keyword/search-intent data, competitor gap analysis.
- **SimilarWeb** — traffic source mix, audience interests, engagement metrics, competitor benchmarking.
- **Existing blog content** — already indexed in Algolia and surfacing in on-site search results (confirmed via the "Articles" section in search screenshots).

## Where each one overlaps with the Algolia workstream

| Input | On-site benefit (Algolia-relevant) | External benefit (outside Algolia) |
|---|---|---|
| Semrush | Improve synonym config to reduce "no results" queries; validate collection taxonomy against real search language | Flag content gaps for organic SEO and AI-SEO / agentic-commerce content prep |
| SimilarWeb | Engagement metrics (bounce, pages/visit) help decide whether on-site discovery is actually the conversion bottleneck before investing further in Recommend/Ask AI | Traffic-source mix informs whether to prioritize on-site UX vs. paid/landing-page work; competitor overlap can validate what "related products" should mean once Recommend ships |
| Blogs | Content-gap fixes directly improve on-site search relevance (same content indexed in Algolia) | Same content also serves organic SEO and feeds AI shopping assistants (ChatGPT/Perplexity) via structured, contextual product/category information |

## Recommended near-term action
Run a content-gap analysis: cross-reference Semrush high-intent keywords against existing blog coverage and current collection taxonomy. This is valuable independent of any other Algolia work in this PRD, and directly informs:
- Browse/Merchandising rule-building ([04](./04-feature-personalization-analytics-browse.md))
- Ask AI answer quality, since it retrieves from the same indexed content ([03](./03-feature-ask-ai.md))
- MCP/agentic-commerce readiness, since AI shopping assistants also lean on this content ([05](./05-feature-mcp-agentic-commerce.md))

## Explicitly out of scope for this PRD
- Backlink strategy, paid ad spend, social media presence — no connection to Algolia, not covered here.
