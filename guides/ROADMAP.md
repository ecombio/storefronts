# Headless Storefront — Build Roadmap

Based on the current `app/` tree (Shopify Hydrogen + Remix, Tailwind, Algolia, Yotpo, custom AI search).
Files already existing are marked **[scaffolded]** — that means the file is present, not that the feature is finished/tested. Everything else is net-new.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation & Environment
- [ ] Confirm Hydrogen/Remix versions pinned and `package.json` scripts documented (dev, build, preview, typecheck, lint)
- [ ] Environment variables audited: Storefront API token, Customer Account API, Algolia keys, Yotpo keys, any CMS keys
- [ ] `.env` / `.env.example` in sync; secrets in hosting provider (Oxygen/Vercel/etc.), not committed
- [ ] `root.tsx` — confirm global loaders (cart, customer, shop) and error boundary are wired
- [ ] `entry.client.tsx` / `entry.server.tsx` reviewed for streaming/SSR config, CSP headers, nonce handling
- [ ] `routes.ts` audited against `templates/` — every template has a matching route, no orphans
- [ ] Design tokens finalized in `theme.css` / `tailwind.css` (colors, type scale, spacing) — not just defaults

## Phase 1 — Data Layer & Integrations
- [ ] `lib/context.ts` — confirm Storefront/Customer Account clients, cache strategy (CacheLong/CacheShort) applied per query
- [ ] `lib/session.ts` — session/cookie strategy confirmed for cart + customer auth
- [ ] `graphql/ProductCardFragment.tsx`, `CollectionCardFragment.tsx`, `graphql/blog/ArticleQuery.ts` — verify fields match what UI actually renders (no over/under-fetching)
- [ ] `graphql/customer-account/*` — all 5 files (Address, Details, Order, Orders, Update) tested against live Customer Account API
- [ ] `lib/algolia.ts` **[scaffolded]** — index config, replicas for sort, synonyms, facet setup confirmed in Algolia dashboard
- [ ] `lib/yotpo.server.ts` **[scaffolded]** — API auth, review sync, rate limits handled
- [ ] `lib/shoppable-embeds.ts` **[scaffolded]** — define what this powers (UGC/video?) and confirm data source
- [ ] `lib/redirect.ts` **[scaffolded]** — legacy URL / 301 redirect map loaded and tested
- [ ] `lib/orderFilters.ts`, `lib/variants.ts` — logic unit-tested (variant selection, order filtering edge cases)
- [ ] `lib/mock-data/` — confirm mock data is dev/storybook-only, never reachable in prod build

## Phase 2 — Core Commerce Templates
- [ ] `templates/_index.tsx` — homepage sections wired (hero, carousels, grids) and content-editable (metaobjects/CMS)
- [ ] `templates/products.$handle.tsx` — PDP: variants, media gallery, sticky ATC, reviews, description panels all connected
- [ ] `templates/collections.$handle.tsx`, `collections.all.tsx`, `collections._index.tsx` — filtering, sorting, pagination via `PaginatedResourceSection.tsx`
- [ ] `templates/cart.tsx`, `cart.$lines.tsx` — add/update/remove, line item errors, empty state
- [ ] `templates/discount.$code.tsx` — discount code application + invalid-code UX
- [ ] `templates/search.tsx` + `api.predictive-search.tsx` — predictive + full search results parity
- [ ] `templates/$.tsx` (catch-all) — confirms 404 handling and metaobject/page fallback routing

## Phase 3 — Customer Accounts
- [ ] `templates/account_.login.tsx`, `account_.logout.tsx`, `account_.authorize.tsx` — full OAuth/Customer Account API flow tested
- [ ] `templates/account.tsx`, `account._index.tsx`, `account.$.tsx` — account shell + nested routing
- [ ] `templates/account.orders._index.tsx`, `account.orders.$id.tsx` — order history + order detail
- [ ] `templates/account.addresses.tsx` + `graphql/customer-account/CustomerAddressMutations.ts` — add/edit/delete address, default address
- [ ] `templates/account.profile.tsx` + `CustomerUpdateMutation.ts` — profile edit, email/password change flow
- [ ] Guest checkout vs. logged-in flows both verified

## Phase 4 — Content & Blog
- [ ] `templates/blogs._index.tsx`, `blogs.$blogHandle._index.tsx`, `blogs.$blogHandle.$articleHandle.tsx` — blog listing + article render
- [ ] `sections/Article.tsx`, `snippets/ArticleItem.tsx` — rich text/HTML content rendering (images, embeds) sanitized
- [ ] `sections/CollectionArticles.tsx` — related articles on collection pages
- [ ] `templates/pages.$handle.tsx` — generic CMS page template covers About/Contact/etc.
- [ ] `templates/policies.$handle.tsx`, `policies._index.tsx` — legal pages (refund, privacy, TOS) populated from Shopify

## Phase 5 — Search & Discovery
- [ ] `components/ai-search/AiSearchBar.tsx` **[scaffolded]** — define scope (LLM-assisted search?), confirm backend endpoint and fallback if AI search fails
- [ ] `snippets/SearchBar.tsx`, `SearchForm.tsx`, `SearchFormPredictive.tsx` — de-dupe overlapping components, confirm which is canonical
- [ ] `snippets/SearchResults.tsx`, `SearchResultsPredictive.tsx` — Algolia vs. Storefront API results reconciled (pick one source of truth per surface)
- [ ] `sections/SearchPanel.tsx` — mobile/desktop search UX (overlay vs. inline) finalized
- [ ] `sections/CollectionFilters.tsx`, `CollectionToolbar.tsx` — faceted filters mapped to Algolia facets or Storefront filters (not both, unless intentional)

## Phase 6 — Reviews & Social Proof
- [ ] `snippets/YotpoReviewsWidget.tsx`, `ReviewsWidget.tsx` — confirm one is legacy/removable
- [ ] `snippets/YotpoStarRating.tsx`, `StarRating.tsx` — consistent star component used across PDP + PLP cards
- [ ] `snippets/ReviewModal.tsx` — write-a-review flow tested end-to-end
- [ ] `hooks/useYotpoRefresh.ts` **[scaffolded]** — confirm it re-fetches reviews correctly on client nav (Remix SPA transitions)

## Phase 7 — Design System & Components
- [ ] `components/ui/` — **currently empty**. Decide: shared primitives (Button, Input, Badge, Modal) live here — build them and migrate ad-hoc styles in sections/snippets to use them
- [ ] `components/PageLayout.tsx`, `Aside.tsx` — confirm these wrap every template consistently (header/footer/cart aside slide-out)
- [ ] Audit `assets/*.css` — 20+ component-scoped CSS files alongside Tailwind; decide on one styling strategy going forward (Tailwind-first, CSS modules for complex components, or hybrid — document the rule)
- [ ] `sections/Header.tsx` + `config/Header.constants.ts` + `snippets/HeaderMenu.tsx`, `MenuDrawer.tsx`, `HeaderSearch.tsx`, `HeaderUtility.tsx` — mobile nav, mega-menu, utility icons (account/cart/search) all responsive
- [ ] `sections/Footer.tsx` — nav, newsletter signup, socials, legal links
- [ ] `snippets/RegionPicker.tsx` — localization/currency switcher wired to actual markets config
- [ ] `sections/AnnouncementBar.tsx`, `SlideShow.tsx`, `ImageCarousel.tsx`, `ProductCarousel.tsx`, `CollectionCarousel.tsx`, `BenefitGrid.tsx`, `FeatureGrid.tsx` — confirm these are CMS/metaobject-driven, not hardcoded content
- [ ] `sections/StickyAddToCart.tsx` — scroll behavior + variant sync with main PDP form tested on mobile
- [ ] `sections/MockShopNotice.tsx` — confirm this is dev-only and stripped from production build

## Phase 8 — SEO, Performance & Accessibility
- [ ] `templates/sitemap.$type.$page[.xml].tsx`, `[sitemap.xml].tsx`, `[robots.txt].tsx` — generate correctly, submitted to Search Console post-launch
- [ ] Meta tags, canonical URLs, OpenGraph/Twitter cards on every template
- [ ] Structured data (Product, BreadcrumbList via `snippets/Breadcrumbs.tsx` + `lib/breadcrumbs.ts`, Article, FAQ if applicable)
- [ ] Image optimization — Shopify CDN transforms used consistently in `ProductImage.tsx`, `ImageCard.tsx`
- [ ] Lighthouse pass on Home, PLP, PDP, Cart, Search (target 90+ mobile perf)
- [ ] Core Web Vitals checked with real product data volume (not 3-item mock catalog)
- [ ] Accessibility pass: keyboard nav through header/menu/cart aside, focus traps in `Aside.tsx` and `ReviewModal.tsx`, alt text audit, color contrast on `theme.css` palette
- [ ] `highlight.css` / `snippets/Highlight.tsx` — confirm search term highlighting doesn't break screen readers

## Phase 9 — Testing & QA
- [ ] Unit tests for `lib/utils.ts`, `orderFilters.ts`, `variants.ts`, `breadcrumbs.ts`
- [ ] Integration tests for cart mutations, discount application, customer auth flow
- [ ] Cross-browser check (Safari iOS especially, for cart aside / sticky ATC)
- [ ] Error boundary / 404 / 5xx states tested for every template
- [ ] Empty states: empty cart, empty search results, empty collection, no reviews yet

## Phase 10 — Deployment & Launch
- [ ] Hosting confirmed (Oxygen vs. alternative) with preview deployments per PR
- [ ] Staging environment mirrors prod data (or close to it) for final QA
- [ ] Redirect map (`lib/redirect.ts`) loaded with actual legacy-site URLs before DNS cutover
- [ ] Analytics wired (GA4/Shopify Analytics/Meta Pixel) and events verified (view_item, add_to_cart, purchase)
- [ ] Search Console + sitemap submitted
- [ ] Rollback plan documented for launch day

## Phase 11 — Post-Launch
- [ ] Monitor Core Web Vitals + error rates first 2 weeks
- [ ] Content team enabled to edit metaobject-driven sections without dev involvement
- [ ] Backlog groomed from launch-day findings
- [ ] A/B testing framework considered for PDP/PLP conversion work

---

### How to use this
Work top-to-bottom by phase, but Phases 1–3 (data layer + core commerce) block almost everything else — prioritize those first. Phase 7 (`components/ui/`) is worth doing early too, since it's currently empty and everything else references ad-hoc styling until it exists.