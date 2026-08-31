# Yotpo Review Pipeline — Review Log

Scope: `app/lib/yotpo.server.ts`, `app/lib/utils.ts`, `app/templates/api.reviews.tsx`,
`app/templates/products.$handle.tsx`, `app/sections/CustomerReviews.tsx`,
`app/snippets/ReviewModal.tsx`, `app/snippets/StarRating.tsx`,
`app/assets/customer-reviews.css`, `app/assets/star-rating.css`, plus supporting
context (`app/root.tsx`, `app/entry.server.tsx`, `app/routes.ts`).

Last updated: after correcting the `CustomerReviews.tsx` half-star gradient-id fix
(previously logged as done, wasn't), plus `root.tsx` header-resilience/ErrorBoundary
fixes and an `api.reviews.tsx` POST-action timeout.

---

## Fixed

| File | Issue | Fix |
|---|---|---|
| `app/lib/utils.ts` | `readJson<T>()` was typed to accept only `Response`, so `Request.json()` call sites couldn't use it — leaving one inconsistent raw parse. | Widened the parameter to a structural `{json(): Promise<unknown>}` type, covering both `Response` and `Request`. |
| `app/lib/yotpo.server.ts` | `res.json()` was untyped (`unknown`/`any` due to Oxygen's `Response` type conflict), relying entirely on optional chaining for safety. | Replaced with `readJson<T>()` using an inline type mirroring the `.map()` transform's assumed shape. No runtime behavior change — `readJson` is a type-level assertion only. |
| `app/templates/api.reviews.tsx` | `action`'s `body = await request.json()` was the last untyped JSON parse in the stack. | Routed through `readJson<typeof body>(request)`. |
| `app/templates/api.reviews.tsx` | `page` param: `Number(...)` with no guard — `?page=abc` → `NaN`, `?page=0`/negative/fractional all passed through to Yotpo as-is. | Added `resolvePage()`: clamps to a finite integer ≥ 1, defaulting to 1. |
| `app/templates/api.reviews.tsx` | `sortKey` blind-cast (`as YotpoSortKey`) in both loader and action — functionally masked by a `?? YOTPO_SORT_OPTIONS.top` fallback, but not a real validation. | Added `resolveSortKey()`: validates via real key membership (`value in YOTPO_SORT_OPTIONS`). |
| `app/templates/api.reviews.tsx` | `action` validated `score` only for truthiness — a string, float, or out-of-range value would be forwarded to Yotpo and surface as an opaque upstream error. | Added an explicit check: `score` must be an integer in `[1, 5]`, else a clear 400. |
| `app/templates/api.reviews.tsx` | **`action`'s direct `fetch()` to Yotpo's Create Review endpoint had no timeout** — same bug class as `yotpo.server.ts`'s open no-timeout item, but blocking a form submission (hanging client) rather than the PDP. | Wrapped the fetch with `AbortSignal.timeout(10_000)`; a timeout (or any fetch failure) now returns a clear 504 instead of hanging indefinitely. |
| `app/snippets/ReviewModal.tsx` | `res.json()` untyped. | Routed through `readJson<{error?: string}>(res)`. |
| `app/templates/products.$handle.tsx` | **Real bug**: `sortKey` was cast unvalidated (`as YotpoSortKey`) and the *raw* value was returned to the client as `currentSortKey`, even though the Yotpo fetch itself correctly fell back to `top` via `??`. Result: `?sort=bogus` → UI shows "Sort by: undefined", no option selected, and every subsequent "Load more" request carries `sort=bogus` forward. | Added `resolveSortKey()` (same pattern as `api.reviews.tsx`), validated once, and used the *same resolved value* to build the Yotpo request and as `currentSortKey`. |
| `app/templates/products.$handle.tsx` | `readSafeMetafieldHtml`'s `multi_line_text_field` branch built HTML via unescaped string interpolation (`` `<p>${line}</p>` ``) before `dangerouslySetInnerHTML`. Low risk (merchant-authored, not user input) but still unescaped. | Added `escapeHtml()`, applied to interpolated line text. |
| `app/sections/CustomerReviews.tsx` | **Race condition**: a `fetcher.load()` "Load more" request in flight when the user changes sort could land *after* the sort change and get appended onto the new, freshly-sorted list — mixing sort orders, risking duplicate `review.id` React keys. | Added `pendingSortRef`, tracking which sort a "Load more" request was issued under. The fetcher-data effect only applies a response if that sort still matches `currentSortKey`; it's cleared on every fresh `initialData` (sort change) and after every fetcher-data resolution. |
| `app/sections/CustomerReviews.tsx` | `handleLoadMore` built the fetcher URL via string concatenation instead of `URLSearchParams`, inconsistent with how the receiving loader parses it. | Switched to `new URLSearchParams({...})`. |
| `app/sections/CustomerReviews.tsx` | **Same bug class as `StarRating.tsx`'s fix below, live today, not latent — and previously logged here as already fixed, which was incorrect.** `StarIcon`'s half-star gradient id was a hardcoded literal (`'star-half-gradient'`); `Stars`/`StarIcon` renders once in the summary sidebar *and* once per `ReviewCard`, all on the same page, so any two fractional scores on one page produced duplicate SVG ids and `url(#star-half-gradient)` resolved ambiguously — half-filled stars could render wrong. Caught during a follow-up review of the pasted component source, which still showed the unscoped literal. | Scoped the id via `useId()` on `Stars` (`star-half-gradient-${uid}`), threaded down to `StarIcon` as a prop — same pattern as `StarRating.tsx`'s `Star` component. |
| `app/snippets/StarRating.tsx` | Gradient ids were `star-fill-${index}` (0–4) — unique within one instance, but collide if `StarRating` ever renders more than once per page (e.g. a future collection grid). Latent, not yet triggered — `ProductCard.tsx` hasn't been reviewed yet to confirm either way. | Scoped ids via `useId()` per component instance, combined with `index`. |
| `app/snippets/StarRating.tsx` | Styling was entirely inline `style={{}}` objects — no paired stylesheet, unlike every other section/snippet in this scope. | Extracted static styling into `app/assets/star-rating.css` (new file, following `customer-reviews.css`'s conventions); linked globally in `root.tsx` alongside `customerReviewsStyles`. Genuinely dynamic values (gradient `<stop>` offsets, the trigger's conditional cursor) stay inline. |
| `app/root.tsx` | **`loadCriticalData`'s header query (and `loadMenuCollectionImages` after it) had no error handling**, unlike `loadDeferredData`'s footer query, which has an explicit `.catch` fallback — a header hiccup took down the entire site shell (nav included) on every route. | Added `.catch()` to both the `HEADER_QUERY` call and `loadMenuCollectionImages`, degrading to an empty menu / no collection images and logging the error, mirroring the footer's existing pattern. |
| `app/root.tsx` | **`ErrorBoundary` fallback message bug**: `errorMessage` defaulted to `'Unknown error'` but was unconditionally overwritten by `error?.data?.message ?? error.data` in the `isRouteErrorResponse` branch, which could resolve to `undefined` — silently losing the fallback (masked from crashing by a truthy check before render, so not a crash, just a UX gap: no error detail shown at all). | Added a final `?? 'Unknown error'` to the fallback chain so it can no longer resolve to `undefined`. |

---

## Open — flagged, not yet fixed

Intentionally left alone pending confirmation or lower priority; not folded into the fixes above.

- **`CustomerReviews.tsx` — search scope.** `filteredReviews` filters only client-side-loaded `reviews` (pages fetched so far), and the "Load more" button is hidden whenever a search query is active (`hasMore && !query`). A user searching has no way to load further pages to search across them. Unclear if this is intended (client-only search) or a gap — needs a product decision, not just a code fix.
- **`CustomerReviews.tsx` — `SortDropdown` keyboard nav + focus styling.** Hand-rolled `role="listbox"`/`role="option"` widget with click and click-outside handling only, no arrow-key navigation. `customer-reviews.css` also defines `:hover` states throughout but no `:focus`/`:focus-visible` styling anywhere in the section — so even once keyboard nav is added, there's currently no visible focus indicator. Notable a11y inconsistency next to `ReviewModal.tsx`'s much more rigorous focus-trap/keyboard handling in the same codebase.
- **`yotpo.server.ts` — no request timeout.** `fetch()` has no `AbortSignal`/timeout. Since this is called from `products.$handle.tsx`'s **critical** (blocking) loader data, a slow/hanging Yotpo response stalls the entire PDP response. (`api.reviews.tsx`'s POST action had the same gap — now fixed above; this GET-path fetch in `yotpo.server.ts` is the one still open, and it's the higher-severity one since it blocks page load rather than a form submit.)
- **`yotpo.server.ts` — no caching.** Every PDP request re-fetches Yotpo fresh, unlike the GraphQL calls elsewhere in the app (which use `storefront.CacheLong()`).
- **`products.$handle.tsx` — architecture: critical vs. deferred data.** `loadDeferredData` is currently dead scaffolding (`return {}`) while the Yotpo fetch — third-party, no timeout — blocks the whole PDP. Strong candidate to move `yotpoReviews` into deferred data and stream it with `<Suspense>`/`Await`, mirroring how `root.tsx`'s footer query is already deferred with a `.catch` fallback.
- **`products.$handle.tsx` — no error handling around `storefront.query(PRODUCT_QUERY, ...)`.** A transient GraphQL failure throws all the way to the root `ErrorBoundary` as an undifferentiated 500, unlike the explicit 404 handled just below it for a genuinely missing product. (Note: `root.tsx`'s `ErrorBoundary` fallback-message bug that this would have hit is now fixed above — but the underlying missing error handling here is still open.)
- **`entry.server.tsx` — CSP TODOs.** Two explicitly self-flagged temporary items: (1) Yotpo `connectSrc`/`styleSrc`/`fontSrc` entries pending a DevTools check now that the widget script is gone (avatars still load client-side via `imgSrc`, which would stay either way); (2) `picsum.photos`/`fastly.picsum.photos` dev placeholders in `imgSrc`. Comments alone don't block a release — worth turning into tracked tickets.
- **`api.reviews.tsx` — `domain` derived from client-supplied `productUrl` with no cross-check against the actual store domain.** Low-stakes (forwarded to Yotpo as metadata, not used for auth), but worth a note if it's ever relied on for something more sensitive.

---

## Not a bug (confirmed / clarified during review)

- **`readJson<T>()` is not a runtime safety or anti-scraping measure.** It's a type-level assertion only (casts `.json()`'s resolved value to `T`), addressing a specific Oxygen/Hydrogen `Response` typing conflict. It does not validate shape, sanitize, throttle, or reject malformed data — the existing `try/catch` blocks around each call site do all the actual runtime defense, unchanged by this refactor. Flagged explicitly because an earlier (non-Claude) conversation about this codebase described it as a security hardening measure — it isn't.
- **`getBreadcrumbCollections`'s tie-breaking** (first-collection-encountered wins when product counts are capped-equal) is a known, self-documented limitation in `products.$handle.tsx`'s own comments — confirmed risk, not a hidden one, and not changed here.

---

## Files touched by fixes above, packaged together

```
app/lib/utils.ts
app/lib/yotpo.server.ts
app/templates/api.reviews.tsx
app/templates/products.$handle.tsx
app/sections/CustomerReviews.tsx
app/snippets/ReviewModal.tsx
app/snippets/StarRating.tsx
app/assets/star-rating.css
app/root.tsx
```

## Suggested next area

`app/lib/context.ts` (not yet reviewed) — every loader in this stack reads
`context.env.PUBLIC_YOTPO_APP_KEY` / `PUBLIC_STORE_DOMAIN` etc. with a
truthiness check but no schema validation. Whatever types this file assigns
those env vars is what every other file here is implicitly trusting.

`app/snippets/ProductCard.tsx` (not yet reviewed) — the full app tree confirms
this file exists. It's the natural place to check whether `StarRating.tsx`'s
`useId()` gradient-id fix is guarding a real, live collision (per-product-card
ratings rendered in a grid) rather than a hypothetical one — the same way the
`CustomerReviews.tsx` half-star id turned out to be a live bug, not a latent one.

`app/lib/breadcrumbs.ts` vs. the "ported from breadcrumbs.liquid" logic inlined
in `products.$handle.tsx` — worth checking whether the two have drifted.
