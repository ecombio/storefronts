# 03 — Feature: Ask AI / Agent Studio

## What it is
Turns search into a conversational, RAG-grounded Q&A experience: shoppers ask natural-language questions ("best e-bike for hilly commutes under $2k") and get a generated answer sourced from real catalog data — not a hallucinated LLM guess — with optional follow-up questions in the same thread.

Two implementation paths:
- **`Search + AskAI`** (pre-built component) — keyword hits stay visible in the normal instant-search panel; an AI panel handles broader/fuzzier follow-up queries. Installed via `npx shadcn@latest add @algolia/search-ai`.
- **Agent Studio** (custom) — configure a system prompt, LLM provider, and which Algolia indices the agent can query; more control, more setup.

## Why this is a lower-lift win than Recommend
Unlike Recommend, Ask AI does **not** require Insights events — it retrieves directly from the product/content index. It's realistically shippable without any new event-tracking infrastructure.

## Current groundwork
`app/snippets/AiSearchBar.tsx` already exists with the right prop contract (`value`, `onQueryChange`, `onSearch`, `onFocus`) to sit in front of either implementation path — it's currently just not connected to anything. This means the visual/UX shell doesn't need to be rebuilt, only wired up.

## Open UX question
Does typing in `AiSearchBar` always go conversational, or does it stay a normal instant-search bar with an explicit "Ask AI" toggle? Algolia's own `Search + AskAI` pattern keeps keyword hits primary and AI opt-in per query — recommended default unless there's a reason to diverge.

## Implementation sketch
1. Set up an Agent Studio agent in the Algolia dashboard (system prompt, LLM provider, index scope — likely `products` + articles).
2. Decide: adopt `@algolia/search-ai` wholesale, or keep `AiSearchBar` + `SearchPanel` as-is and add a new `api.ask-ai.tsx` route (matching the `api.cart-recommendations.tsx` pattern) that proxies to the Agent Studio chat endpoint.
3. Wire `AiSearchBar`'s `onSearch` to detect natural-language-style queries (or an explicit toggle) and route to the AI panel vs. the existing `SearchResultsPredictive` flow.

## Data quality prerequisite
Answers are only as good as what's retrievable from the index — product titles, descriptions, specs, price should be well-populated. Worth a quick audit of index field coverage before launch, independent of any code work.
