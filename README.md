# Ecombio Storefront

Headless Shopify storefront for [ecombio.com](https://ecombio.com), built with Next.js on Vercel. Based on the MIT-licensed [Vercel Shop](https://github.com/vercel/shop) template (see `LICENSE`).

| Item           | Where                                                    |
| -------------- | -------------------------------------------------------- |
| Live site      | https://ecombio.com (`www` redirects to it)              |
| GitHub repo    | https://github.com/ecombio/storefronts                   |
| Vercel project | https://vercel.com/ecombiology/storefront                |
| Shopify store  | `ecombio.myshopify.com` (also hosts checkout)            |
| Template docs  | https://shop-docs.labs.vercel.dev                        |

## Deploying

Work happens on the `headless` branch. `main` is production: every push to `main` deploys on Vercel. Keep `headless` and `main` identical.

Run this in PowerShell. It asks for a commit message, checks, builds, and pushes to both branches. Paste only the commands, never the `PS C:\...>` prompt, and never paste a token anywhere.

```powershell
& {
  $msg = Read-Host "Commit message"
  Set-Location C:\Users\Admin\Shopify\Storefronts\Headless

  $current = git rev-parse --abbrev-ref HEAD
  if ($current -ne "headless") { Write-Host "STOPPED: on '$current', expected 'headless'"; return }

  git pull --rebase --autostash origin main
  if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: pull failed"; return }

  pnpm oxfmt
  pnpm lint
  if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: lint failed"; return }
  pnpm build
  if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: build failed"; return }

  git add -A
  git reset -q -- .env.local .devin
  Write-Host "`nThese changes will be pushed to origin/headless AND origin/main (PRODUCTION):"
  git status --short
  if ((Read-Host "Type y to continue") -ne "y") { Write-Host "STOPPED: nothing pushed (changes are still staged)"; return }

  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: commit failed"; return }
  } else {
    Write-Host "Nothing new to commit, pushing existing commits."
  }

  $t = gh auth token
  $h = "Authorization: Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$t"))
  $auth = @("-c","credential.helper=","-c","credential.https://github.com.helper=","-c","http.extraheader=$h")

  git @auth push -u origin headless
  if ($LASTEXITCODE -ne 0) { Remove-Variable t, h, auth; Write-Host "STOPPED: push to headless failed"; return }
  git @auth push origin headless:main
  $pushed = $LASTEXITCODE
  Remove-Variable t, h, auth
  if ($pushed -ne 0) { Write-Host "STOPPED: push to main failed"; return }

  git ls-remote origin headless main
  git rev-parse HEAD
  Write-Host "`nAll three hashes should match. Deploy: https://vercel.com/ecombiology/storefront/deployments"
}
```

What it does: checks you are on `headless`, pulls `origin/main` (rebase + autostash), runs format, lint, and build (stops on any failure), stages everything except `.env.local` and `.devin/`, waits for `y`, commits (skipped if nothing is staged), then pushes `headless` and `headless:main`.

Rules:

- Never run `git push origin main` directly. Local `main` can be stale and the push gets rejected. Fix it once with `git branch -f main origin/main`.
- Never use `--force` unless you know exactly what you are overwriting.
- Plain `git push` fails with code 128 on this machine (the GitHub CLI credential helper hands nothing to git), which is why the script passes the `gh` token directly.
- For a README-only change, skip lint and build: keep the branch check, pull, `git add README.md`, commit, both pushes, and the verify lines.

Troubleshooting:

- **`pnpm` not recognized:** run `$env:Path = "$env:LOCALAPPDATA\pnpm\bin;$env:Path"` or restart VS Code. Check `pnpm --version` before typing `y`.
- **"Another next build process is already running":** stop stray Node processes (`Stop-Process -Name node -Force`) or delete `.next\lock`, then rerun.
- **Push rejected:** rerun the script; the pull at the top picks up new commits.
- **401 or permission error:** `gh auth status`, then `gh auth login` if logged out.
- **A failed Vercel build leaves the previous deployment live.** Fix the cause and rerun. For env var fixes, change it in Vercel and use **Redeploy**.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Never commit `.env.local`. Customer sign-in needs a public HTTPS origin, so test it on production or through an HTTPS tunnel, not plain `localhost`. Other commands: `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm format`.

## Configuration

Feature flags and site identity live in `lib/config/index.ts` (keep keys alphabetical).

- **Enabled:** customer accounts (`auth`), search, and on product pages: bundles, Buy with Shop, complementary products, quantity picker, related products.
- **Disabled:** Shop Agent (`agent`), analytics, bot protection, browser agents, Shopify redirects.
- Localization is US / EN / `en-US`. Site URL is `https://ecombio.com`; other environments fall back to `http://localhost:3000`.
- Shop Agent is a public chat assistant and every message can incur model charges. Enable it only with a card on file in Vercel AI Gateway, spending limits, and bot protection.

## Environment variables

Values live in Vercel (Production and Preview) and `.env.local`, never in git. Mark secrets **Sensitive** in Vercel. Changes apply only to new deployments, so redeploy after editing. Every variable the code reads needs a row in `.env.example`.

| Variable                                      | Purpose                                                           |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`            | Required. Shopify store domain.                                   |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Required. Public Storefront API token.                            |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ID`           | Cart attribution for the Headless storefront.                     |
| `CUSTOMER_ACCOUNT_SESSION_SECRET`             | Required with customer accounts. Session encryption secret.       |
| `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID`      | Required with customer accounts. Confidential client ID.          |
| `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_SECRET`  | Required with customer accounts. Confidential client secret.      |
| `SHOPIFY_WEBHOOK_SECRET`                      | Enables `POST /api/webhooks/shopify` (404 without it).            |
| `AI_GATEWAY_API_KEY`                          | Only if Shop Agent is enabled.                                    |

`pnpm build` fails if any of the three auth variables is missing while customer accounts are enabled, locally and on Vercel.

## Customer accounts

Sign-in uses Shopify Customer Accounts through a **Confidential** Customer Account API client on the Headless storefront (a Public client has no secret and will not work). Already set up: callback URI `https://ecombio.com/account/authorize`, logout URI `https://ecombio.com/`.

- Shopify allows no wildcard URIs. Register every preview or tunnel origin that needs sign-in.
- Secrets are server-only and must be identical across every instance of a deployment.
- Rotating `CUSTOMER_ACCOUNT_SESSION_SECRET` signs out all customers.
- Generate a secret without printing it:

```powershell
$b = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); [Convert]::ToBase64String($b) | Set-Clipboard
```

If sign-in fails, compare origin, callback URI, logout URI, store domain, client ID, and client secret character for character. Stray spaces, quotes, or a trailing slash are the usual cause.

## How the storefront works

- **Home:** fixed headline, then the first eight products from `/collections/all`. Point the grid at a Shopify collection to control it.
- **Product pages:** variant choices are in the URL. Data is cached and refreshed by Shopify webhooks. Bundles and complementary products show nothing until they exist in Shopify.
- **Collections and search:** results are live, not cached. Collections and products must be published to the Headless channel. Filters come from Shopify Search & Discovery. Batch size is `PRODUCTS_PER_PAGE` in `lib/collections/index.ts`.
- **Product card:** one shared tile for every grid, so a visual change affects every page.
- **Content:** Shopify Pages at `/pages/[handle]`, policies at `/policies/[handle]`, blogs at `/blogs/category/[categoryHandle]` and `/blogs/articles/[articleHandle]`. Edit them in Shopify. The webhook handler does not refresh them, so edits can stay cached. There is no `/blogs` index.
- **Navigation:** header reads the Shopify `main-menu`; utility links are hardcoded in `components/nav/index.tsx`.
- **Cart and checkout:** one Shopify cart everywhere, remembered in the browser for 14 days. Shopify decides prices, discounts, and availability, and hosts checkout.
- **Blog:** articles are written in Shopify with shortcodes. See `docs/references/articles.md` (writer guide) and `docs/references/pages.md` (route to Shopify template map).

## Collection page extras

Three additions on `/collections/[handle]`, each driven by Shopify data and hidden when empty:

| Feature                       | Files                                                            |
| ----------------------------- | ---------------------------------------------------------------- |
| Products / Expert Advice tabs | `components/collections/collection-tabs.tsx`, `article-grid.tsx` |
| Sub-collection carousel       | `components/collections/sub-collection-tiles.tsx`                |
| Product count in tab label    | `getCollectionProductCount` in `lib/collections/server.ts`       |

Data flows from `app/collections/[handle]/page.tsx` into `CollectionDetailPage`. Queries are in `lib/shopify/operations/collections/server.ts`.

**Metafields** (Settings, Custom data, Collection metafield definitions). Tick **Storefront API access** on each, or the feature stays hidden.

| Metafield                 | Type                | Used for                                |
| ------------------------- | ------------------- | --------------------------------------- |
| `custom.posts`            | List of blog posts  | Expert Advice tab                       |
| `custom.sub_collections`  | List of collections | Carousel tiles                          |
| `custom.after_item_lists` | Page reference      | Content below results (template)        |

Notes:

- Tab state lives in the URL hash (`#advice`), so it never interferes with filters or sort.
- The Storefront API has no collection total, so the count sums the Availability filter. It falls back to the search total, then to a bare `Products` label.
- Tile images use the sub-collection image, then its first product's image, then a placeholder.
- Helpers use `cacheLife("max")` with tags `collection-<handle>` and `articles`. If a change does not show locally, clear `.next` and restart.
- Product images are cropped to 5:4 on collection pages only, via `components/collections/results-grid.tsx`. To undo, remove `[&_[data-slot=product-card-image]]:aspect-5/4` from the two `gridClassName` strings.

## ZIP code and delivery estimate

The nav ZIP button opens a modal (`components/nav/zip-code.tsx`) to set a ZIP or switch country. State lives in `localStorage` via `lib/zip/use-zip-code.ts` (`ecombio-zip`) and `lib/zip/use-country.ts` (`ecombio-country`). Countries are listed in `lib/zip/countries.ts`. The estimate line is `components/delivery-estimate.tsx`.

Known limits:

- **The delivery estimate is a placeholder.** `HANDLING_DAYS` and `DELIVERY_DAYS` are fixed strings, so every ZIP gets the same promise.
- **The country and language picker only stores a choice.** It does not change prices, currency, or language.
- The ZIP form accepts 5-digit US ZIP codes only.
- Flag images load from `flagcdn.com`; swap for local SVGs if a strict CSP is added.

## Checkout domain

Checkout runs on `ecombio.myshopify.com`. A branded `checkout.ecombio.com` is planned:

1. Cloudflare DNS: CNAME `checkout` to `shops.myshopify.com`, DNS only (grey cloud).
2. Shopify Admin, Settings, Domains, connect `checkout.ecombio.com` and verify.
3. Decide whether to make it primary. Checkout follows the primary domain, and generated Shopify links may then point at the checkout subdomain.

Test an order on the current checkout first. Customer-account URIs stay on `https://ecombio.com/...` either way.

## Languages and regions

The storefront is single-language (US / EN / `en-US`) with copy inside each component; there is no translation file. Country and language configure Shopify requests; locale only controls number and date formatting. Prices use the currency Shopify returns. Product and content translations happen in Shopify.

For more languages or regions, use the template skills (read the skill page first): `/vercel-shop:enable-i18n`, `/vercel-shop:enable-shopify-markets`. Do it on a branch, run `pnpm lint` and `pnpm build`, review the diff, then merge. Weglot is built for Online Store themes and is unverified for headless.

## Working with a coding agent

Optional. To install the template plugins:

```bash
npx plugins add vercel/shop --scope project --yes
npx plugins add vercel/vercel-plugin --scope project --yes
npx plugins add Shopify/shopify-ai-toolkit --scope project --yes
```

Rules:

- Prices, availability, cart totals, and customer identity come from Shopify responses; do not reimplement them.
- Cart changes go through the Hydrogen handlers, not Server Actions.
- Customer session refresh happens only in the Hydrogen handlers registered in `proxy.ts`.
- Every `process.env` variable needs a row in `.env.example`.
- This Next.js version has breaking changes; read `node_modules/next/dist/docs/` before changing framework code.
- Review every agent change with `git diff` before committing.

## Launch status

Done: Headless channel and tokens, products published, Vercel deploy with `ecombio.com` primary, GitHub connected, DNS reviewed, branding and canonicals, customer accounts, Shopify webhooks (signed, API 2026-07), ZIP modal, collection page extras, blog layout, docs.

Remaining:

- [ ] Fill in Posts and Sub Collections on collections that need them (Storefront API access ticked)
- [ ] Replace placeholder delivery estimate with real numbers
- [ ] Connect the country/language picker to Markets, or hide it
- [ ] Browser tests: sign-in (profile, orders, addresses, logout), cart (add, quantity, remove, discount), full test order including Shop Pay
- [ ] Branded checkout domain (`checkout.ecombio.com`)
- [ ] Bundles and complementary products in Shopify, or disable the flags
- [ ] Home page: check headline and the eight products shown
- [ ] Blog: `author_profile` on every post, featured images, unpublish test posts
- [ ] Content: fill every store policy, check footer links
- [ ] DNS: DMARC record and `store.ecombio.com` proxy setting
- [ ] `.env.example` lists the auth variables and `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ID`
- [ ] Spot-check `/sitemap.xml`, `/robots.txt`, `/llms.txt` live
- [ ] Remove `AI_GATEWAY_API_KEY` from Vercel until Shop Agent is enabled

Later: Shop Agent, Vercel Web Analytics, Shopify-managed footer menus, multiple languages or regions.