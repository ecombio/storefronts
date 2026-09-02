# 05 — Feature: MCP Server / Agentic Commerce

## What it is
Algolia's **MCP (Model Context Protocol) Server** lets external AI assistants — ChatGPT, Claude, Perplexity, Gemini, Amazon Q, Microsoft Copilot, Salesforce Agentforce — query a defined set of Algolia indices directly, surfacing ecombio's products inside their own chat interfaces rather than relying on stale training data or guesses.

Two variants:
- **Algolia Public MCP** — application-scoped, exposes selected indices/Recommend models to external, customer-facing AI assistants. This is the one relevant to storefront exposure.
- **Algolia Productivity MCP** — user-scoped, internal team use (analytics questions, search optimization) — not customer-facing, out of scope for this PRD.

## Why this is the one Algolia feature that touches "external exposure"
Everything else in this PRD affects on-site discovery. MCP is the exception — it's about being findable *inside third-party AI shopping surfaces*. But it's a narrow mechanism, not a replacement for SEO:
- Only works if the AI platform in question actually calls ecombio's MCP endpoint — adoption across ChatGPT/Perplexity/etc. is still early and uneven.
- Improves discoverability inside AI chat assistants specifically — does **not** improve Google organic ranking, ad performance, or general web presence.
- No separate MCP fee — usage counts toward the existing Algolia plan.

## Relationship to broader "AI-SEO" / agentic commerce landscape
MCP is one piece of a larger emerging space that also includes OpenAI's Agentic Commerce Protocol (ChatGPT Instant Checkout), Google's Universal Commerce Protocol, and Perplexity's Merchant Program — these are platform-specific integrations, separate from Algolia, that would need their own scoping if pursued.

## Prerequisites
- A well-populated, accurate product index (same data-quality bar as Ask AI in [03-feature-ask-ai.md](./03-feature-ask-ai.md)).
- Decision on which indices/models to expose publicly (likely `products`; consider whether pricing/inventory fields are safe to expose to third-party agents).

## Recommendation
Lowest priority in this PRD — genuine upside is real but currently unproven/early-stage across the AI platforms themselves, and has no bearing on the more immediate on-site discovery gaps (Recommend, Ask AI) covered elsewhere. Revisit once those are shipped and platform adoption of MCP-style integrations matures.
