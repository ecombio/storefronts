# 04 — Feature: AI Personalization, Analytics, Browse/Merchandising Studio

## AI Personalization
Re-ranks search results, recommendations, and category pages **per individual shopper** in real time, based on their own behavior (search history, clicks, purchases) — even without explicit account data.

- **Distinct from Recommend:** Recommend surfaces the same "bought together" suggestions to everyone viewing a given product; Personalization reorders results differently *per shopper*.
- **Same blocker as Recommend:** requires Insights event data. No path to shipping this without event instrumentation first.
- Segmentation (grouping users by shared behavioral traits) is an available/emerging layer on top of this.

## Analytics / Recommendation Analytics
Dashboard-side capability — click-through rate, conversion, no-results-query tracking tied to search performance, plus a newer **Recommendation Analytics** view showing clicks/conversions/revenue per recommendation carousel/placement.

- **No code changes required** to the storefront — this is Algolia dashboard configuration.
- Useful before committing further engineering time to Recommend/Personalization: shows what's actually converting today, and would let us measure any future Recommend rollout against baseline.
- Recommend that this ships **early**, since it's near-zero engineering cost and produces data that informs every other decision in this PRD.

## Browse / Merchandising Studio
Rule-based curation for category/collection pages: pin, boost, or hide specific products per category without a code deploy. Sits under a broader Merchandising Studio dashboard for facet config, banners, and real-time catalog updates.

- **No Insights dependency** — usable today.
- Relevant to ecombio's existing collection pages (`collections.$handle.tsx`, `collections.all.tsx`) — would let merchandising decisions (e.g. "always show GOTRAX first in Electric Scooters") happen without an engineering ticket.
- Natural pairing with the Semrush keyword-gap work in [06-external-growth-seo.md](./06-external-growth-seo.md) — if certain search terms don't map cleanly to current collection taxonomy, Browse rules are the fix.

## Sequencing note
Of the three, **Analytics** and **Browse** have no prerequisites and no event-tracking dependency — both are candidates for near-term shipping. **Personalization** should wait until Insights events exist (same prerequisite as Recommend in [02-feature-recommend.md](./02-feature-recommend.md)).
