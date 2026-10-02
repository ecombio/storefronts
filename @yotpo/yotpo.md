# Yotpo reviews: project memory

What this is, how it works, why it is built this way, and what is left. Written so you can come back cold and understand it.

Last reviewed: Sep 30, 2026, at commit `384c3fc` (edits to this file are uncommitted). Reviewed: every code file in `@yotpo/` (not the `.bak` backups), `app/api/yotpo/reviews/route.ts`, `components/product-detail/product-detail-section.tsx`. Checked live on Sep 30, 2026: the Level 4 REC product page, the review route (400 and 200), Yotpo's public reviews API, and the Yotpo admin review list. Not reviewed: `.env.example`, `tsconfig.json`, `AGENTS.md`, the README, `lib/product/server`, `lib/shopify/id/server`, `lib/config`, `ExpertReviewsSection`, the Vercel dashboard. Lines marked **(verify)** depend on those.

> **Maintenance rule.** If you change anything in the Yotpo feature (code, env vars, behavior, Jira scope), update this file in the same commit. The exact rules are in section 15. Any AI assistant or human: read section 15 before finishing any Yotpo-related task.

## 1. The 60-second version

- Every product page shows a **star badge** under the title and a **Customer Reviews section** below the description tabs.
- Both read Yotpo's public widget API **on the server**, cached. No Yotpo JavaScript is loaded on the page.
- Customers write reviews in **our own form**. It posts to **our API route**, which validates it and forwards it to Yotpo. On the current Yotpo account, new reviews **publish immediately**.
- If Yotpo is not configured or fails, the review UI simply **disappears**. Pages never break.

## 2. Why it is built this way

- Yotpo's on-site widgets are scripts that bring their own markup and styling. This storefront is headless Next.js, so the components here render the markup themselves and Yotpo is only the data source. (Reason inferred from the code comments.)
- Yotpo documents this approach: its "Headless Integration Guide (API-Based)" targets custom storefronts and says to call the APIs from the backend in Next.js (section 19).
- Server-side fetching plus `'use cache'` keeps reviews in the prerendered page and avoids a client-side request on every visit.
- Failing quiet is deliberate: a missing key or a Yotpo outage must never break the build or render of a page that imports `@yotpo`.
- Ownership (per `AGENTS.md`): the Next.js layer owns this feature (routing, caching, rendering). Yotpo is only an external data source. It never touches the Shopify cart, prices, or customer data.

## 3. The request path

**Showing reviews**

1. A visitor opens `/products/<handle>`.
2. `ProductDetailSection` turns the Shopify GID (`gid://shopify/Product/123`) into the raw number (`123`) with `getNumericShopifyId`. Yotpo needs the number.
3. `StarRating` (under the title, inside `<Suspense>`) calls `getProductRatingSummary(id)`, which calls `getProductReviews(id)`.
4. `fetchProductReviews` is cached. On a miss it calls `GET https://api.yotpo.com/v1/widget/<appKey>/products/<id>/reviews.json?page=1&per_page=50`.
5. `ProductReviews` (inside the `#reviews` wrapper, below the tabs) calls the same function with the same arguments, so it **shares the cache entry**. One Yotpo call serves both.
6. `ProductReviews` hands the data to `ReviewsBrowser`, a client component that does search, rating filter, sort and "Show more" in the browser.

**Collection reviews**

1. `CollectionDetailPage` renders `<CollectionReviews>` at the bottom of `/collections/<handle>`, inside `<Suspense>`.
2. `getCollectionReviewProducts` (`lib/collections/server.ts`, cached) returns the numeric ID, handle and title of the collection's first 24 products.
3. `getCollectionReviews` calls `getProductReviews(id, { perPage: 10 })` for each product, sums the bottomlines, and tags each review with its product.
4. `CollectionReviewsBrowser` (client) shows the summary, rating bars, photo strip, sort, "With customer photos" filter, and the review list.

**Submitting a review**

1. `WriteReviewButton` opens a native `<dialog>` form.
2. On submit it posts JSON to `/api/yotpo/reviews`: `handle, score, name, email, title, content, website`.
3. The route runs these checks in order: declared body size (8 KB), honeypot, field validation, per-IP rate limit.
4. It looks the product up by **handle** on the server (`getProduct`) and derives the numeric ID, title, URL and image itself, so a caller cannot post reviews to arbitrary products.
5. `submitReview` posts to `https://api.yotpo.com/v1/widget/reviews`.
6. The form shows "Thanks for your review. It will appear on this page once it has been approved."

| Route response | Meaning                                                         |
| -------------- | --------------------------------------------------------------- |
| 200 `ok`       | Sent to Yotpo, or a bot filled the honeypot (faked success).    |
| 400            | Validation failed. The message says which field.                |
| 404            | Product handle not found.                                       |
| 413            | Declared body over 8 KB.                                        |
| 429            | Over 5 submissions per 10 minutes from one IP (per instance).   |
| 502            | Yotpo rejected it, or something threw. Details are in the logs. |

Live-tested on Sep 30, 2026: 400 (placeholder handle, short content) and 200 (valid review, which appeared in the Yotpo admin as Published). 404, 413, 429 and 502 have not been exercised live.

## 4. Files

| File                                                   | What it does                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@yotpo/config.ts`                                     | App key, shop domain, API URLs, sizes (50 fetched, 5 shown), cache time (3600 s), brand colors.                                    |
| `@yotpo/client.ts`                                     | Server-only. `getProductReviews`, `getProductRatingSummary`, `submitReview`. Normalizes Yotpo's response.                          |
| `@yotpo/types.ts`                                      | `YotpoReview`, `YotpoBottomline`, `YotpoProductReviews`, `YotpoRatingSummary`.                                                     |
| `@yotpo/index.ts`                                      | The public surface: `StarRating`, `ProductReviews`, `submitReview`, and the types.                                                 |
| `@yotpo/ui.ts`                                         | Client-safe entry for `Star`, `StarRow` and `ratingLabel`. Client components import these from `@/@yotpo/ui`, never from `@yotpo`. |
| `components/ui/carousel.tsx`                           | Shared scroll hook, arrows and progress bar. Used by the review photo strip and expert reviews. Outside `@yotpo/`.                 |
| `@yotpo/yotpo.md`                                      | This file.                                                                                                                         |
| `@yotpo/components/star.tsx`                           | `Star` (one, supports partial fill), `StarRow` (five, each filled by how much of the score reaches it) and `ratingLabel()`.        |
| `@yotpo/components/star-ratings.tsx`                   | `StarRating` badge: stars, score, count, links to `#reviews`. Shows "Write a review" if there are none.                            |
| `@yotpo/components/reviews-widget.tsx`                 | `ProductReviews` server section, plus the empty state.                                                                             |
| `@yotpo/components/reviews-browser.tsx`                | Summary, clickable rating bars, search, rating filter, sort, review cards, "Show more".                                            |
| `@yotpo/components/collection-reviews.tsx`             | `CollectionReviews` server section for a collection page. Renders nothing without reviews.                                         |
| `@yotpo/components/collection-reviews-browser.tsx`     | Summary, rating bars, photo strip, sort, photo filter, review cards with product link.                                             |
| `lib/collections/server.ts`                            | `getCollectionReviewProducts`: the collection's first 24 products for the reviews section. Outside `@yotpo/`.                      |
| `components/collections/collection-page.tsx`           | Places the collection reviews section at the bottom of the page. Outside `@yotpo/`.                                                |
| `@yotpo/components/review-form.tsx`                    | `WriteReviewButton`: star picker, fields, honeypot, posts to the route.                                                            |
| `app/api/yotpo/reviews/route.ts`                       | Validates and forwards new reviews. Outside `@yotpo/`.                                                                             |
| `components/product-detail/product-detail-section.tsx` | Places the badge and the reviews section on the product page. Outside `@yotpo/`.                                                   |
| `tsconfig.json`                                        | Path aliases `@yotpo` and `@yotpo/*`.                                                                                              |

`types.ts.bak` and `components/reviews-browser.tsx.bak` are local backups. The `*.bak*` rule in `.gitignore` should ignore both. **(verify with `git ls-files '@yotpo'`)** Never commit them.

## 5. Configuration

| Variable                           | Read in                          | Purpose                                                                                          |
| ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_YOTPO_APP_KEY`        | `@yotpo/config.ts`               | Yotpo app key. A public identifier, not a secret. Missing means no review UI.                    |
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | `@yotpo/config.ts`               | Already required by the storefront. Sent to Yotpo as `domain`. Must match what Yotpo knows.      |
| `NEXT_PUBLIC_SITE_URL`             | `app/api/yotpo/reviews/route.ts` | Optional. Origin used to build the product link sent to Yotpo. Falls back to the request origin. |

Status of these variables:

- **The live site renders reviews, so Production has the app key.** Preview is unchecked.
- **`.env.example` has none of the Yotpo ones, and `NEXT_PUBLIC_SITE_URL` is in no docs. (verify)** The README and `AGENTS.md` (rule 8) both require a row for every user-configurable variable the code reads. Neither file was read in the last review.
- `NEXT_PUBLIC_SITE_URL` is read outside `@yotpo/`, in `route.ts`. The README describes the site URL as a config value (`https://ecombio.com`, localhost fallback), so the route may be able to use that shared value instead of a new variable. **(verify in `lib/config`)**
- Without `NEXT_PUBLIC_SITE_URL`, the link sent with a review is built from whichever host the visitor used, which could be a preview URL. Whether it is set in Vercel is unchecked.

Find the reads in the Yotpo folders:

```powershell
git grep -n "process.env" -- '@yotpo' 'app/api/yotpo'
```

For a repo-wide check, search for `NEXT_PUBLIC_YOTPO` the same way without the path filter.

## 6. Behavior and decisions

- **Fails quiet.** No key or any Yotpo error returns `null` and the components render nothing. Errors are logged with `console.error` and never cached (the cached function throws, the public ones catch).
- **Caching.** Tags `yotpo-reviews` and `yotpo-reviews-<productId>`. Fresh 300 s, revalidated after 3600 s, expires after 24 h. A new approved review can take up to an hour to show.
- **Yotpo's public API can lag.** A review can show as Published in the Yotpo admin while the public reviews API still returns 0 for that product (seen on the Aventon Pace 5, Sep 30, 2026). Yotpo describes its public responses as CDN-cached and Create review as asynchronous. The cause is not confirmed.
- **Publishing.** Reviews publish at once on the current Yotpo account. A test review posted through the route showed as Published and Pending reviews showed 0. The success message in `review-form.tsx` and the comment above `submitReview` in `client.ts` both say reviews wait for approval.
- **Timeouts.** Every Yotpo call aborts after 5 s.
- **Collection reviews.** One Yotpo call per product (first 24 products, newest 10 reviews each), six calls at a time. The merged result is cached per collection for 6 hours (tags `yotpo-reviews` and `yotpo-collection-reviews`). If every call fails, or some fail and no reviews came back, nothing is cached and the section is hidden. The cache also carries each product's `yotpo-reviews-<id>` tag, so refreshing a product refreshes its collections. `POST /api/yotpo/webhook?secret=...` (env `YOTPO_WEBHOOK_SECRET`) revalidates the tag of the product in a Yotpo `review_create` or `review_updated` payload, or every `yotpo-reviews` entry when the payload has no product ID. Image changes and deletions by Yotpo support send no webhook, so those appear when the cache expires. Bottomlines are summed for the overall rating and rating bars. The section is hidden when no product has reviews or Yotpo fails.
- **Filters and sort run in the browser** over the 50 fetched reviews. Sort: most recent, highest, lowest, most helpful.
- **Partial stars.** `StarRow` fills each star by how much of the score reaches it, so 4.4 shows four full stars and a 40% star.
- **Empty state.** With no reviews: a "Write a review" link in the badge slot, and a text plus button in the section.
- **Zero reviews from Yotpo.** `star_distribution` comes back `null`. `client.ts` turns each missing bucket into 0.
- **Spam defenses:** honeypot field and an in-memory per-IP limiter (5 per 10 minutes). Yotpo moderation adds a layer only when approval is turned on, and it is not on for the current account. The limiter is per serverless instance, so it only slows casual abuse. The route's own comment recommends a Vercel Firewall rule and/or BotID. The README lists bot protection as disabled. **(verify)**
- **`submitReview` needs a shop domain.** It returns `false` and logs if `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` is empty.
- **Live page check (Level 4 REC, Sep 30, 2026).** Badge under the title shows 4.8 and "5 Reviews". The section shows the 4.8 summary, rating bars (four 5-star, one 4-star), search, rating filter, sort, "Write A Review", and five reviews newest first.

## 7. Gotchas

1. **Numeric ID, not GID.** Passing the GraphQL GID to Yotpo silently returns 0 reviews. Always use `getNumericShopifyId`. Yotpo's product record carries the Shopify numeric ID as `domain_key`.
2. **Suspense is required.** `cacheComponents` is on, so async Server Components (`StarRating`, `ProductReviews`) must be wrapped in `<Suspense>` where used.
3. **`@yotpo` is server-side code in a client-looking package.** `index.ts` re-exports `submitReview` from `client.ts`, which imports `server-only`. Import `@yotpo` only from server components and route handlers. Importing it from a client component breaks the build. Client components import the star pieces from `@/@yotpo/ui` instead.
4. **Two validators.** The form (`review-form.tsx`) and the route (`route.ts`) both enforce limits: title 100, content 10 to 2000, name 60, email 254. Change both together. The route is the one that counts.
5. **Create-review field names.** The live account accepted the `client.ts` payload on Sep 30, 2026: the review appeared in the Yotpo admin under the right product with the right name, title, text and score. Yotpo's create-review reference page has not been read. The error body is logged on rejection.
6. **PowerShell and the `@`.** In PowerShell `@` means splatting, so quote the folder: `git add '@yotpo'`, `git ls-files '@yotpo'`.
7. **Line endings.** Scripts that rewrite a file can switch it from Unix to Windows line endings, which makes git show every line as changed. Edit files in VS Code rather than with scripts, and consider a `.gitattributes` with `* text=auto`.
8. **Don't confuse with Expert Reviews.** `ExpertReviewsSection` in the Description tab is a separate feature, not Yotpo. **(verify what feeds it)** The live Level 4 REC page showed placeholder text in it (`title`, `view_count`, `source_name`) on Sep 30, 2026.
9. **Pushes to `main` deploy to production.** Docs-only pushes are safe; anything in `@yotpo/` should go through the README's push block (format, lint, build).
10. **`@yotpo/index.ts` is a barrel on purpose.** `AGENTS.md` says no barrel files, but `@yotpo` and `@yotpo/*` are path aliases in `tsconfig.json` and the app imports only from `@yotpo`. Do not delete it or rewrite those imports unless that is the task.
11. **Markdown is linted.** `pnpm lint` runs `oxfmt --check`, which also checks `yotpo.md`. After editing this file, run `pnpm oxfmt`, or lint (and the README push block) stops.
12. **Field names differ by endpoint.** Yotpo's `reviews.json` returns `bottomline.total_review`. Its separate `/bottomline` endpoint returns `total_reviews`. `client.ts` reads the first form.
13. **Two hosts serve the same public data.** The code calls `api.yotpo.com`. Yotpo's headless guide lists `api-cdn.yotpo.com` for reads. Only `api.yotpo.com` has been tested here.
14. **Test files in the repo root.** A `body.json` used for route tests shows as untracked in git. Delete it after each test. Never commit it.

## 8. Known limits

- **Only the newest 50 reviews are fetched** (page 1). Search, filters, sort and "Show more" work on those 50. The summary and rating bars count all reviews, so clicking a bar can show fewer reviews than its number.
- **Collection reviews cover only part of the data.** The list holds the newest 10 reviews of each of the collection's first 24 products. The summary and rating bars count all reviews of those products, so clicking a bar can show fewer reviews than its number. Photos and the verified badge read `images_data` and `verified_buyer`, which come from Yotpo's documented sample **(verify against a real response)**. Product page review cards still show text only.
- **Text only.** `YotpoReview` has no fields for photos or video, verified-buyer badges, store replies, sentiment or incentivized flags. Yotpo's documented sample response has all of them (section 18). The real response for a product with reviews has not been inspected. The avatar is a plain circle.
- **Helpful votes are display-only.**
- **No review structured data** (schema markup) for search engines.
- **The form text is wrong for the current account.** It promises approval, and reviews publish at once.
- **No moderation in our code.** Whatever Yotpo is set to do is what happens.
- **Public API lag.** See section 6.
- **Unused `brand` settings** in `config.ts` (`primaryColor`, `textColor`, fonts, `lineSeparatorStyle`). Only `starsColor` is read.
- **Limiter is per instance.** See section 6.
- **Body size check trusts `content-length`.** A request without the header skips it. Low risk, worth knowing.
- **Sorting is only partly checked.** The default order is confirmed on the live page. "Highest rating", "Lowest rating" and "Most helpful" are checked by reading the code, not in a browser.

## 9. Where to change things

| I want to...                               | Edit                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Fetch or show more reviews, change caching | `config.ts` (`reviewsFetchLimit`, `reviewsPerPage`, `revalidateSeconds`)                          |
| Change the star color                      | `config.ts` (`brand.starsColor`)                                                                  |
| Change the badge layout                    | `components/star-ratings.tsx`                                                                     |
| Move the badge or the reviews section      | `components/product-detail/product-detail-section.tsx`                                            |
| Add a sort option                          | `SORT_LABELS` and the `switch` in `reviews-browser.tsx`                                           |
| Change form fields or limits               | `review-form.tsx` **and** `route.ts`                                                              |
| Change rate limit numbers                  | `route.ts` (`WINDOW_MS`, `MAX_PER_WINDOW`)                                                        |
| Change what is sent to Yotpo               | `client.ts` (`submitReview`)                                                                      |
| Handle new fields from Yotpo               | `types.ts` and the normalizing block in `fetchProductReviews`                                     |
| Show photos, verified badge, store replies | `types.ts`, the normalizing block in `fetchProductReviews`, `ReviewCard` in `reviews-browser.tsx` |
| Add review schema markup                   | `product-detail-section.tsx`, next to `ProductSchema`, using data from `getProductReviews`        |
| Hold new reviews for approval              | The Yotpo admin setting, then the texts in `review-form.tsx` and `client.ts`                      |
| Refresh reviews sooner                     | Revalidate the cache tag `yotpo-reviews-<productId>`                                              |

## 10. How to test

Everything here runs from a terminal in the repo root (PowerShell). Use `curl.exe`, not `curl`. Never paste a command with `<placeholders>` left in it.

1. **Local:** put `NEXT_PUBLIC_YOTPO_APP_KEY` in `.env.local`, run `pnpm dev`, open a product that has reviews. With no key nothing shows, and that is correct.
2. **Get real values.** This reads the key from `.env.local`, takes the first product link on the homepage, and pulls its numeric ID from the page:

```powershell
$key = ((Get-Content .env.local -Raw) -replace '(?s).*NEXT_PUBLIC_YOTPO_APP_KEY="([^"]+)".*','$1') -replace '\s',''
$h = (curl.exe -s https://ecombio.com | Out-String | Select-String -Pattern '/products/([a-z0-9-]+)' -AllMatches).Matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -First 1
$page = curl.exe -s "https://ecombio.com/products/$h" | Out-String
$id = [regex]::Match($page, 'Product\\?/(\d+)').Groups[1].Value
"handle: $h  id: $id"
```

To test a product that has reviews, set `$h` to its handle and rerun the last three lines.

3. **Does the page render the hooks?** Expect 2 (the `#reviews` wrapper and the badge link):

```powershell
[regex]::Matches($page, 'id="reviews"|href="#reviews"').Count
```

4. **What does Yotpo return?** `total_review` is the count:

```powershell
curl.exe -s "https://api.yotpo.com/v1/widget/$key/products/$id/reviews.json?page=1&per_page=5"
```

5. **Does the route work?** Use an email you own. Expect `{"ok":true}` and `200`. Then delete the review in Yotpo and the file:

```powershell
@'
{"handle":"THE-HANDLE","score":5,"name":"Test","email":"you@example.com","title":"Test review","content":"This is a test review, please ignore.","website":""}
'@ | Set-Content body.json
curl.exe -s -w "`n%{http_code}`n" -H "Content-Type: application/json" -d "@body.json" https://ecombio.com/api/yotpo/reviews
Remove-Item body.json
```

6. **Failure check:** if step 5 returns 502, open the function logs in Vercel and search for "Yotpo". The logged response body says which field Yotpo disliked.
7. **Rate limit:** six quick valid submissions from one IP should return 429 on the sixth (per instance, so it may vary).
8. **Browser only:** sorting, search and the rating filter run client-side. Open a product with several reviews and try each sort option and each filter.

## 11. Jira (project YOTPO)

24 tasks, all created as To Do on Sep 30, 2026. YOTPO-6 and YOTPO-7 have a priority (Highest); the rest have none. The "Proposed" column is a suggestion for the board, not its state.

| Task                                       | Jira  | Code and evidence                                                                                                          | Proposed     |
| ------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| YOTPO-1 Kick-start Credits                 | To Do | Yotpo plan benefit (200 credits in month one). Nothing to build.                                                           | Not building |
| YOTPO-2 Automatic Review Requests          | To Do | Emails run inside Yotpo. Free plan: 50 orders a month. Needs orders synced to Yotpo. **(verify what syncs them)**          | Not building |
| YOTPO-3 Reminder Review Requests           | To Do | Follow-ups run inside Yotpo and count against the 500-email cap.                                                           | Not building |
| YOTPO-4 Reviews Import                     | To Do | Yotpo has an import tool (Help Center, beta). Nothing here.                                                                | To Do        |
| YOTPO-5 Email Templates Library            | To Do | The template editor is in the Yotpo admin.                                                                                 | Not building |
| YOTPO-6 Reviews Widget (Highest)           | To Do | Built: `ProductReviews`, `ReviewsBrowser`, `WriteReviewButton`. Live on Level 4 REC. Write path proven. See section 6 lag. | In Progress  |
| YOTPO-7 Star Ratings (Highest)             | To Do | Built: `StarRating`. Live on Level 4 REC: 4.8 and "5 Reviews" under the title.                                             | Done         |
| YOTPO-8 Reviews Sorting                    | To Do | Built, four options, browser-side. Default order confirmed live. Other three not checked in a browser.                     | In Progress  |
| YOTPO-9 Reviews Tab                        | To Do | Not built. Reviews are a section, not a tab. Yotpo has a Reviews Tab widget. **(verify what the task means)**              | To Do        |
| YOTPO-10 Reviews Moderation                | To Do | Handled by Yotpo. Auto-publish is on, so reviews go live at once. No moderation UI here.                                   | In Progress  |
| YOTPO-11 Sentiment and Profanity Check     | To Do | Yotpo offers both (Help Center). Sample reviews carry `sentiment`. Not built here.                                         | To Do        |
| YOTPO-12 Advanced Auto Publish             | To Do | A Yotpo setting (Help Center: Auto-Publishing Reviews). Not built here.                                                    | To Do        |
| YOTPO-13 Review Comments                   | To Do | Store replies: `comment` in Yotpo's sample; App Developer API has comment endpoints. `types.ts` has no field.              | To Do        |
| YOTPO-14 Review Tagging                    | To Do | Not started.                                                                                                               | To Do        |
| YOTPO-15 Pre-defined templates             | To Do | Not started.                                                                                                               | To Do        |
| YOTPO-16 Custom views & filters            | To Do | Partial: search, rating filter, rating bars. No saved or alternate views.                                                  | In Progress  |
| YOTPO-17 Media front-and-center            | To Do | Not started. `types.ts` has no media fields. Yotpo's sample has `images_data`.                                             | To Do        |
| YOTPO-18 SEO Page                          | To Do | Not started. No review schema markup. Yotpo documents an LLM-schema endpoint and rich snippets.                            | To Do        |
| YOTPO-19 Reviews Dashboard                 | To Do | The dashboard is in the Yotpo admin.                                                                                       | Not building |
| YOTPO-20 Email Analytics Dashboard         | To Do | In the Yotpo admin. Yotpo also has an Email Analytics API section.                                                         | Not building |
| YOTPO-21 Live Chat Support                 | To Do | Yotpo support feature, not code. Priority support is listed for Starter.                                                   | Not building |
| YOTPO-22 Reviewer Badges                   | To Do | Not started. Sample reviews carry `verified_buyer`. Help Center has a Reviewer Badges page.                                | To Do        |
| YOTPO-23 Widget Interface Language         | To Do | Not started. Yotpo supports nearly 40 languages in its widgets.                                                            | To Do        |
| YOTPO-24 Read-Only Reviews Widget (Legacy) | To Do | Not built. A legacy Yotpo widget. **(verify whether it is wanted)**                                                        | To Do        |

Proposed totals: 1 Done, 4 In Progress, 19 To Do (7 of those as "Not building").

Groups: displaying (6, 7, 9, 8, 16, 17, 22, 18, 23, 24, 15), collecting (2, 3, 5, 1, 4), managing (10, 11, 12, 14, 13), reporting and support (19, 20, 21).

## 12. Open items, in order

- [ ] **Moderation:** decide between turning on approval in the Yotpo admin, or changing the texts that promise approval (`review-form.tsx` success message, the comment above `submitReview` in `client.ts`).
- [ ] **Delete the test review** in Yotpo: Aventon Pace 5, name "Test", title "Test review".
- [ ] **Public API lag:** rerun section 10 step 4 for the Aventon Pace 5. If `total_review` is still 0 after an hour, open the review in the Yotpo admin and read which product it is attached to.
- [ ] **Sort check in a browser** (YOTPO-8): "Highest rating", "Lowest rating", "Most helpful" on a product with several reviews.
- [ ] **Vercel:** confirm `NEXT_PUBLIC_YOTPO_APP_KEY` for Preview. Set `NEXT_PUBLIC_SITE_URL=https://ecombio.com`, or change the route to use the shared site config. **(verify in `lib/config`)**
- [ ] **`.env.example`:** add rows for `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_YOTPO_APP_KEY` (optional block, alphabetical, after `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ID`). **(verify the file first)**
- [ ] **Vercel Firewall:** add a rate-limit rule on `/api/yotpo/reviews`. Consider BotID. This matters more while reviews publish at once.
- [ ] **Real response check:** save the full `reviews.json` response for Level 4 REC and list which fields the account returns (`verified_buyer`, `images_data`, `comment`, `sentiment`).
- [ ] **Yotpo webhook:** register `review_create` and `review_updated` against `/api/yotpo/webhook` (Yotpo create-webhook API), set `YOTPO_WEBHOOK_SECRET` in Vercel, read the logged field names from a real payload, and confirm which field holds the product ID. **(verify)**
- [ ] **Collection reviews check:** open a collection whose products have reviews. Confirm photos and the verified badge show. If they do not, save a real `reviews.json` response and compare `images_data` and `verified_buyer` with `types.ts`.
- [ ] **Free plan API access:** confirm in the Yotpo admin or pricing page whether Free includes the API secret, before building on the Core or App Developer APIs.
- [ ] **README:** variables table rows, a short Yotpo section pointing here, and a Launch status item.
- [ ] **Jira:** move YOTPO-7 to Done. Move YOTPO-6, 8, 10 and 16 to In Progress. Decide build or skip for the rest.
- [ ] Later: review schema markup (YOTPO-18), verified badge, photos and store replies (YOTPO-22, 17, 13), fetch beyond 50 reviews, half stars, remove unused `brand` settings, try `api-cdn.yotpo.com`, `.gitattributes`.
- [ ] Later: bring `@yotpo` in line with the `AGENTS.md` code style (banner comments, alphabetized exports and config keys, `{Name}Props` interfaces), or record the exceptions here.

## 13. Glossary

- **App key (`appkey`):** Yotpo's public ID for our store. Goes in the public API URL.
- **Store ID and secret:** used by Yotpo's Core API. The secret is never public and never goes in client code.
- **Bottomline:** Yotpo's summary block: total review count, average score, star distribution.
- **Star distribution:** how many reviews gave 1, 2, 3, 4 and 5 stars. Drives the rating bars.
- **Handle:** the URL slug of a product (`/products/<handle>`). The form sends this, never an ID.
- **GID vs numeric ID:** Shopify's GraphQL ID (`gid://shopify/Product/123`) versus the plain `123` that Yotpo wants.
- **Moderation:** Yotpo can hold new reviews until approved. Off on the current account.
- **Auto-publish:** new reviews go live without approval. On for the current account.
- **Honeypot:** a hidden form field real people leave empty and bots fill in.
- **Kickstart Credits:** bonus review request emails Yotpo gives new accounts.
- **Syndication:** Yotpo sharing reviews to other sites (Google, Meta, retailers).
- **Visual UGC:** Yotpo's customer photo and video product. Not used here.
- **`'use cache'` and `cacheTag`:** Next.js caching for server functions, with tags used to refresh specific entries.
- **`cacheComponents`:** the Next.js mode this project uses. It requires `<Suspense>` around async server components.
- **`server-only`:** an import that makes the build fail if the file is pulled into client code.

## 14. Not in this repo

- `yotpo-on-site-widgets.md` (plan tiers, API findings, roadmap) does not show up in `git ls-files`. If it still exists, keep it somewhere you will find it, and link it here. Notes from earlier sessions say the Yotpo plan is Free and that "v0.3.0 test calls" against the live account are pending. The route and read tests in section 10 were run on Sep 30, 2026. **(verify the plan in the Yotpo admin)**

## 15. Keeping this file current (rules for any AI assistant and humans)

This file is the project's memory for the Yotpo feature. It is only useful if it matches the code. Follow these rules whenever you work on anything Yotpo-related.

### When the rules apply

Any change that touches one of these:

- anything under `@yotpo/`
- `app/api/yotpo/**`
- the Yotpo parts of `components/product-detail/product-detail-section.tsx` (`StarRating`, `ProductReviews`, `numericProductId`, the `#reviews` wrapper)
- the `@yotpo` aliases in `tsconfig.json`
- any environment variable the Yotpo code reads, in `.env.example`, the README, or Vercel
- Yotpo behavior a visitor can see (what shows, where, when, and what the form says)
- the Yotpo Jira project (YOTPO), when a task is finished, dropped, or redefined
- the Yotpo account settings (plan, moderation, auto-publish)

If none of these apply, do not edit this file.

### What to do, in order

1. **Read this whole file before you change code**, so you know the decisions already made and do not undo them.
2. **Make the code change.**
3. **Before you finish, reopen this file** and update every section the change affects, using the table below. Do it in the same commit as the code, never as a follow-up.
4. **Update the header line.** Change the "Last reviewed" date to today's date. Put in the short commit hash once it exists. If you only reviewed some files, list which.
5. **Say what you changed in your final reply:** one line per section edited. If you decided no doc change was needed, say why in one line.

### Which section to update

| If you changed...                                     | Update these sections                                 |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Any file, added, renamed, deleted, or its job changed | 4 (Files), and 3 (request path) if the flow changed   |
| How reviews are fetched, cached, or normalized        | 3, 6 (Behavior), 8 (Known limits), 18 if fields moved |
| Form fields, validation, limits, or the route         | 3 (response codes), 6, 7 (gotcha 4), 9                |
| Rate limiting or spam protection                      | 6, 8, 12 (Open items)                                 |
| Any `process.env` read                                | 5 (Configuration), 12, and the three places below     |
| Where or how the badge or section appears on the page | 3, 4, 9                                               |
| Something that fixes a limitation                     | Remove it from 8, note it in 6 if it changes behavior |
| Something that adds a limitation or a workaround      | Add it to 8 or 7                                      |
| A Jira task finished, dropped, or redefined           | 11 (Jira), 12                                         |
| A to-do in section 12 was done                        | Tick it or delete it. Add new to-dos you create.      |
| A new term that a newcomer would not know             | 13 (Glossary)                                         |
| Yotpo plan, account settings, endpoints, or fields    | 16 to 19, and 6 or 8 if behavior changed              |

### Environment variables: keep three places in sync

Whenever a Yotpo-related variable is added, renamed, removed, or changes meaning, update all three in the same commit:

1. Section 5 of this file.
2. `.env.example` (optional block, alphabetical, with a short comment).
3. The README environment variables table.

Find every read across the repo, not just the Yotpo folder:

```powershell
git grep -n "process.env" -- '@yotpo' 'app/api/yotpo'
```

Never write real keys, tokens, or secrets into this file, `.env.example`, or the README. Use placeholders.

### Accuracy rules

- Only state what you have read in the code. If you did not read the code behind a statement, mark it **(verify)** and say so in your reply.
- Remove a **(verify)** marker only after you have read the code that proves it.
- Do not guess what Yotpo's API does. If the code comment or the live behavior is the only evidence, say that.
- Facts about Yotpo itself (sections 16 to 19) come from Yotpo's own docs or from the live tests named in this file. Say which. Mark anything from neither **(verify)**.
- When code and this file disagree, the code is right. Fix the file, and mention the mismatch in your reply.
- Follow the comment rules in `AGENTS.md`: code comments are terse one-line guardrails, and explanations belong in this file. Before you trim or remove a long comment in `@yotpo`, make sure its facts are here. Do not strip comments as a side effect of unrelated work, and keep every comment you leave accurate.
- Where this file and `AGENTS.md` disagree, `AGENTS.md` wins, except for the exceptions recorded in section 7 (gotcha 10).

### Style rules

- Make small, targeted edits. Do not rewrite sections the change did not affect.
- Describe what is, not what changed. Avoid "now", "previously", "updated to". Git history is the changelog. (This follows the `AGENTS.md` rule to describe the product rather than the change.)
- Keep the section numbers, table layouts, and plain wording. Short sentences, no marketing language.
- Use the same terms as the code (`StarRating`, `ProductReviews`, `bottomline`, `handle`).
- Edit with your file-editing tools, and keep the file's existing line endings. Do not rewrite the whole file with a PowerShell script. That once converted `.gitignore` to Windows line endings.
- Keep the file under about 350 lines. If it grows past that, move detail into a separate file and link it. Sections 16 to 19 are reference material and the first to move.

### Before you finish: checklist

- [ ] Did I read this file before changing code?
- [ ] Did I update every section the change affects?
- [ ] Are the "Last reviewed" date and hash current?
- [ ] If an env var changed: are section 5, `.env.example`, and the README all updated?
- [ ] Are the Known limits (section 8) and Open items (section 12) still true?
- [ ] Are there new **(verify)** markers, and did I mention them in my reply?
- [ ] Are the code and this file in the same commit?
- [ ] Did I run `pnpm oxfmt` after editing this file? (`pnpm lint` fails on unformatted Markdown.)

### How these rules reach each tool

This section is the single source of truth. Everything else only points here, so the rules cannot drift apart.

| Where                                                                                  | Reaches                                                                 |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| This file, section 15                                                                  | The canonical rules.                                                    |
| `AGENTS.md` (the Yotpo block)                                                          | Coding agents that read `AGENTS.md`.                                    |
| One-line comments at the top of `@yotpo/index.ts` and `app/api/yotpo/reviews/route.ts` | Any model that opens those files, in any tool.                          |
| The prompt below                                                                       | Chat tools that cannot see the repo.                                    |
| Optional one-line pointer files (for example `CLAUDE.md` containing `@AGENTS.md`)      | Tools that read their own instruction file. Add only for tools you use. |

### Prompt to paste into any AI chat

Use this with any assistant that cannot read the repo. Paste it first, then this file, then the code files involved.

```text
You are changing the Yotpo reviews feature of a Next.js storefront.

1. I will paste yotpo.md. Read all of it before proposing any change, and follow its section 15.
2. Make the code change, then also output the full text of every yotpo.md section the change affects.
3. If an environment variable is added, renamed, or removed, also give the exact new rows for .env.example and the README variables table.
4. State only what you can see in the code I paste. Mark anything else (verify).
5. Describe what is, not what changed. No "now" or "previously".
6. Never include real keys, tokens, or secrets.
7. End with: the list of yotpo.md sections you changed, and any (verify) markers you added.
```

## 16. Yotpo at a glance

Source for this section: Yotpo Help Center (section 19). Plan details are from the Free & Starter Plans FAQ, last updated Jan 2025.

- **Product lines:** Reviews, Loyalty & Referrals, Visual UGC, Subscriptions, Discover. This project uses Reviews only.
- **Collect:** automatic and reminder review request emails, targeted requests, custom questions, photo and video uploads, discounts for reviewing, imports.
- **Manage:** moderation (manual, auto-publish, human moderation), sentiment and profanity checks, store replies, tagging, incentivized flags, exports and reports.
- **Display:** reviews widget, star rating, Q&A, carousel, media gallery, reviews tab, badge, reviewer badges, smart filters, SEO page. This project replaces all of these with its own components.
- **Distribute:** syndication to Google Shopping, Meta, Walmart, Target, Macy's, Bloomingdale's, TikTok Shop and the Shop app. Rich snippets for Google.
- **Analyze:** Reviews, Emails, Photos and Conversion dashboards. Insights and Reviews Atlas analyze review content and need a plan that includes them.
- **Integrations:** Klaviyo, Mailchimp, Gorgias, Zendesk, Shopify Flow, Zapier, and many more.

**Free plan**

- Automatic review request emails for up to 50 orders a month, up to 500 outgoing emails including follow-ups.
- 200 Kickstart Credits in the first month.
- Help Center and in-app guides. Priority support is listed for Starter.
- Over the order limit, review request emails are capped until you upgrade.
- You own your reviews and can export them after cancelling.
- The FAQ says nothing about API access on Free. **(verify in the Yotpo admin)**
- Trust and scale claims from the FAQ: SOC 2 Type 2 audit, GDPR compliant, nearly 40 widget languages, no right-to-left yet.

## 17. The APIs and hosts

| API           | Host and path                             | Auth                 | Use                                                                               |
| ------------- | ----------------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| Public (UGC)  | `api.yotpo.com`, `api-cdn.yotpo.com`      | App key in the URL   | Read reviews and ratings, post reviews. This project uses it.                     |
| Core          | `api.yotpo.com/core/v3/stores/{store_id}` | Store secret, token  | Sync orders, products, customers, fulfillments, webhooks. 5 requests/s per store. |
| App Developer | `develop.yotpo.com` docs                  | OAuth access token   | Publish/unpublish reviews, review comments, top and best reviews, Q&A, webhooks.  |
| Loyalty       | `loyaltyapi.yotpo.com` docs               | Loyalty key and GUID | Points and rewards. Not relevant here.                                            |

**Hosts**

| Host                                    | What it is                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `api.yotpo.com`                         | Public and Core API. The project calls it today.                                                         |
| `api-cdn.yotpo.com`                     | CDN host for public reads, listed in the headless guide. Untested here.                                  |
| `cdn-yotpo-images-production.yotpo.com` | Review and product images. Needed in the image config if photos are shown. **(verify in `next.config`)** |
| `yap.yotpo.com`                         | The Yotpo admin app (billing, settings, moderation, keys).                                               |
| `apidocs.yotpo.com`                     | UGC API docs.                                                                                            |
| `core-api.yotpo.com`                    | Core API docs.                                                                                           |
| `develop.yotpo.com`                     | App Developer API docs.                                                                                  |
| `support.yotpo.com`                     | Help Center.                                                                                             |
| `yotpo.com/go/...`                      | Short tracking links inside API responses. Ignore them.                                                  |

**Notes**

- Yotpo describes public API responses as CDN-accelerated and cached, and the Create review call as asynchronous.
- Public reads take `page` and `per_page`. Core endpoints use cursor paging with `limit` (max 100).
- Docs sites serve a Markdown copy of any page when `.md` is added to its URL, and an `llms.txt` index at the root.
- The Insights API needs a plan that includes Yotpo Insights.
- Merchant endpoints need a secret that must stay on the server. Which calls the Free plan allows is unchecked. **(verify)**

## 18. Review data fields

From Yotpo's documented sample response for `reviews.json`. The real account response for a product with reviews has not been inspected. **(verify)**

| Field                                              | In `YotpoReview`? | Notes                                   |
| -------------------------------------------------- | ----------------- | --------------------------------------- |
| `id`, `score`, `title`, `content`, `created_at`    | Yes               |                                         |
| `votes_up`, `votes_down`                           | Yes               | Only `votes_up` is shown.               |
| `user.display_name`                                | Yes               | Can be empty for anonymous users.       |
| `verified_buyer`                                   | No                | Real-customer flag.                     |
| `images_data` (`thumb_url`, `original_url`)        | No                | Customer photos.                        |
| `comment` (`content`, `created_at`)                | No                | Store reply.                            |
| `sentiment`                                        | No                | Number from Yotpo's sentiment analysis. |
| `is_incentivized`, `incentive_type`                | No                | Marks reviews given for a reward.       |
| `custom_fields`                                    | No                | Answers to custom review questions.     |
| `product_id`, `source_review_id`, `user.user_type` | No                |                                         |

**Bottomline:** `total_review`, `average_score`, `star_distribution` (keys 1 to 5), `total_organic_reviews`, `organic_average_score`, `custom_fields_bottomline`. The code reads the first three.

**Observed on the live account (Aventon Pace 5, 0 reviews, Sep 30, 2026):** status 200, `bottomline` with zeros and `star_distribution: null`, `pagination.total: 0`, a `products` entry whose `domain_key` is the Shopify numeric ID, and `reviews: []`. The response also carried `found_filtered_reviews`, `grouping_data`, `syndication_data` and `product_tags`.

## 19. Sources and what to read next

**Read on Sep 30, 2026**

- Headless Integration Guide: `https://apidocs.yotpo.com/docs/yotpo-headless-integration-guide-api-based`
- UGC docs index and storefront and merchant endpoint lists: `https://apidocs.yotpo.com/llms.txt`, `.../reference/reviews-storefront/llms.txt`, `.../reference/reviews-merchant/llms.txt`
- API table of contents: `https://apidocs.yotpo.com/reference/table-of-contents`
- App Developer API index: `https://develop.yotpo.com/llms.txt`
- Core API: `https://core-api.yotpo.com/reference/`, `https://core-api.yotpo.com/docs`, `https://core-api.yotpo.com/reference/guidelines-and-conventions`
- Help Center index: `https://support.yotpo.com/llms.txt`
- Free & Starter Plans FAQ: `https://support.yotpo.com/docs/free-growth-plans-faq.md`
- Making reviews discoverable by AI platforms: `https://support.yotpo.com/docs/making-your-reviews-discoverable-by-ai-platforms` (partly read)

**Not read yet, in priority order**

1. Create review reference: `https://apidocs.yotpo.com/reference/create-review.md`
2. LLM schema endpoint: `https://apidocs.yotpo.com/reference/retrieve-llm-schema.md`
3. Help Center: `auto-publishing-reviews`, `moderating-reviews`, `yotpo-reviews-rich-snippets`, `setting-up-yotpo-reviews-on-a-headless-platform`, `finding-your-yotpo-app-key-and-secret-key` (all under `https://support.yotpo.com/docs/<slug>.md`)
4. Upload images with reviews: `https://apidocs.yotpo.com/reference/upload-images-with-reviews.md`
5. Search reviews: `https://apidocs.yotpo.com/reference/search-reviews.md`
6. Publish/unpublish and review comments: `https://develop.yotpo.com/reference/publishunpublish-reviews.md`, `https://develop.yotpo.com/reference/comment-on-a-review.md`
7. Yotpo pricing page, for what each plan includes.
