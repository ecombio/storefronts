# Ecombio Storefront

Headless Shopify storefront for [ecombio.com](https://ecombio.com), built with Next.js on Vercel. Based on the MIT-licensed [Vercel Shop](https://github.com/vercel/shop) template (see `LICENSE`).

| Item             | Where                                                   |
| ---------------- | ------------------------------------------------------- |
| Live site        | https://ecombio.com (`www` redirects to it)             |
| GitHub repo      | https://github.com/ecombio/storefronts (branch `main`)  |
| Vercel project   | https://vercel.com/ecombiology/storefront               |
| Shopify store    | `ecombio.myshopify.com`                                 |
| Checkout         | Hosted by Shopify, currently on `ecombio.myshopify.com` |
| Template docs    | https://shop-docs.labs.vercel.dev                       |
| Routes reference | https://shop-docs.labs.vercel.dev/docs/reference/routes |

## Updating the GitHub repository

Pushes to `main` deploy to production on Vercel automatically, so only push work you are happy to publish.

Open PowerShell and paste the whole block. It asks for the commit message. Paste only the commands, never the `PS C:\...>` prompt, and never paste a token or secret anywhere, including chat.

```powershell
& {
  $msg = Read-Host "Commit message"

  Set-Location C:\Users\Admin\Shopify\Storefronts\Headless

  git pull --rebase --autostash origin main
  if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: pull failed"; return }

  pnpm oxfmt
  pnpm lint
  if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: lint failed"; return }
  pnpm build
  if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: build failed"; return }

  git add -A
  git reset -q -- .env.local .devin
  Write-Host "`nThese changes will be committed and pushed to PRODUCTION:"
  git status --short
  if ((Read-Host "Type y to continue") -ne "y") { Write-Host "STOPPED: nothing pushed (changes are still staged)"; return }

  git commit -m $msg
  if ($LASTEXITCODE -ne 0) { Write-Host "STOPPED: commit failed (nothing to commit?)"; return }

  $t = gh auth token
  $h = "Authorization: Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$t"))
  git -c credential.helper= -c credential.https://github.com.helper= -c "http.extraheader=$h" push origin main
  $pushed = $LASTEXITCODE
  Remove-Variable t, h
  if ($pushed -ne 0) { Write-Host "STOPPED: push failed"; return }

  git ls-remote origin main
  git rev-parse HEAD
  Write-Host "`nIf the two hashes match, it landed. Watch the deploy: https://vercel.com/ecombiology/storefront/deployments"
}
```

What the block does, in order:

1. Pulls the latest `main` (`--autostash` sets aside uncommitted work and restores it).
2. Formats the code, then runs lint and the production build. It stops at the first failure.
3. Stages everything except `.env.local` and `.devin/`, shows the list, and waits for you to type `y`. Anything else cancels before anything is committed or pushed.
4. Commits, pushes with your GitHub CLI login, and prints the remote hash and your local hash. They should match.

After it finishes:

- Watch the build at https://vercel.com/ecombiology/storefront/deployments. If a build fails, the previous deployment stays live. Open the build log, fix the cause, and run the block again. If the cause was an environment variable, fix it in Vercel and use **Redeploy** from the deployment's menu (no new push needed).
- Close the PowerShell window so any leftover variables are cleared.

If something goes wrong:

- **`pnpm` is not recognized:** the terminal has not picked up the pnpm folder yet. Run `$env:Path = "$env:LOCALAPPDATA\pnpm\bin;$env:Path"`, or close VS Code completely and reopen it. A missing `pnpm` does not stop the block by itself, so lint and build are silently skipped. Check `pnpm --version` before typing `y`.
- **Stopped at lint or build:** fix the error it printed, then paste the block again.
- **Push rejected (remote has newer commits):** paste the block again; the pull at the top picks them up.
- **401 or permission error:** run `gh auth status`. If you are logged out, run `gh auth login`, then paste the block again.
- **No error text shown:** PowerShell can hide git's output. Run `git push origin main 2>&1 | Out-String` to see it.
- **A file you did not expect is listed:** answer anything other than `y` at the prompt, then run `git reset <path>` to unstage it.
- Never use `--force` to get past a rejection unless you know exactly what you are overwriting.

Why the push line is unusual: plain `git push` exits with code 128 on this machine because the GitHub CLI credential helper hands nothing to git, so the block passes the `gh` token to git directly. The root cause is not fixed. If plain `git push origin main` starts working, the token lines can be dropped.

`pnpm build` needs the required variables in `.env.local`. With customer accounts enabled, the build fails if any of the three auth variables is missing, on Vercel as well as locally.

For a README-only change, you can skip the checks by pasting a shorter version: keep the pull, `git add README.md`, the commit, the push, and the verify lines.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Fill in `.env.local` with the variables listed below. Never commit it. Customer sign-in needs a public HTTPS origin, so test it on production or through an HTTPS tunnel, not plain `localhost`. Other commands: `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm format`.

## Configuration

Feature flags and site identity live in `lib/config/index.ts`. Keep config keys in alphabetical order.

| Feature                                                                                         | State    |
| ----------------------------------------------------------------------------------------------- | -------- |
| Customer accounts (`auth`)                                                                      | Enabled  |
| Search                                                                                          | Enabled  |
| Product page: bundles, Buy with Shop, complementary products, quantity picker, related products | Enabled  |
| Shop Agent (`agent`), analytics, bot protection, browser agents, Shopify redirects              | Disabled |

Localization is US / EN / `en-US`. The site URL is `https://ecombio.com`; other environments fall back to `http://localhost:3000`.

The Shop Agent is a public chat assistant and every message can incur model charges. Enable it only with a card on file in Vercel AI Gateway, spending limits, and bot protection.

## ZIP code and delivery estimate

The nav ZIP button opens a modal (`components/nav/zip-code.tsx`, a native `<dialog>`) with two views: update ZIP code, and switch country.

| File                               | Role                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `lib/zip/use-zip-code.ts`          | `useZipCode()` hook and `saveZip()`. Stores the ZIP in `localStorage` (`ecombio-zip`) and notifies every component and tab. |
| `lib/zip/use-country.ts`           | `useCountry()` hook and `saveCountry()`. Stores country and language in `localStorage` (`ecombio-country`).                 |
| `lib/zip/countries.ts`             | The list of countries and languages offered in the picker. Edit it to the markets actually served.                          |
| `components/delivery-estimate.tsx` | The "Ships in..., arrives in..." line under the product price. Reads the ZIP through `useZipCode()`.                        |

Known limits:

- **The delivery estimate is a placeholder.** `HANDLING_DAYS` and `DELIVERY_DAYS` in `delivery-estimate.tsx` are fixed strings, and the ZIP is only echoed back. Every ZIP gets the same promise. Replace them with real numbers, or build a real estimate from handling time (per product, for example a Shopify metafield with Storefront API access enabled), origin, carrier transit time by destination ZIP, and business-day rules in the warehouse time zone.
- **The country and language picker only stores a choice.** It does not change prices, currency, or the site language. Wiring it to Shopify Markets or `next-intl` is a separate task (see Languages and regions).
- **The ZIP form accepts 5-digit US ZIP codes only.**
- **Flag images load from `flagcdn.com`.** Swap them for local SVGs if a strict Content-Security-Policy is added.

## Collection page extras

Collection pages (`/collections/[handle]`) have three additions on top of the template. Each is driven by Shopify data and hides itself when that data is empty.

| Feature                       | What it does                                                                                         | Files                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Products / Expert Advice tabs | Tab bar under the title: `Products (N)` and `Expert Advice (N)`. The Advice tab shows article cards. | `components/collections/collection-tabs.tsx`, `article-grid.tsx` |
| Sub-collection carousel       | Row of image tiles above the product grid, in the results column. Scrolls and snaps, with arrows.    | `components/collections/sub-collection-tiles.tsx`                |
| Product count                 | The number in the Products tab label.                                                                | `getCollectionProductCount` in `lib/collections/server.ts`       |

Data flow: the route (`app/collections/[handle]/page.tsx`) fetches articles, the product count, and sub-collections together and passes them to `CollectionDetailPage` (`components/collections/collection-page.tsx`). The Shopify queries live in `lib/shopify/operations/collections/server.ts`. The cached helpers are `getCollectionArticles` in `lib/blog/server.ts` and `getCollectionSubCollections` in `lib/collections/server.ts`.

### Shopify metafields

Define these under Settings, Custom data, Collection metafield definitions. **Tick Storefront API access on each definition**, or the storefront cannot read it and the feature stays hidden.

| Metafield                 | Type                | Used for                                           |
| ------------------------- | ------------------- | -------------------------------------------------- |
| `custom.posts`            | List of blog posts  | Articles on the Expert Advice tab                  |
| `custom.sub_collections`  | List of collections | Tiles in the carousel                              |
| `custom.after_item_lists` | Page reference      | Content shown below the results (template feature) |

Fill the fields in on each collection in Shopify admin (open the collection, then the metafields section). A collection with no posts shows no tab bar. A collection with no sub-collections shows no carousel.

### Behavior worth knowing

- **Tab state is in the URL hash** (`#advice`), not a query parameter, so it never interferes with filters or sort. Filters and sort apply to the Products tab only.
- **Product count.** The Storefront API has no collection total, so `getCollectionProductCount` adds up the counts of the Availability filter (in stock plus out of stock). If that filter is off in Search & Discovery, it falls back to the search total, and if that fails the label shows `Products` with no number. The count is the collection total and does not change as filters are applied.
- **Tile images** use the sub-collection's image, then its first product's image, then a placeholder. Set a proper image on each sub-collection in Shopify.
- **Caching.** The helpers use `cacheLife("max")` and are tagged `collection-<handle>` (plus `articles` for posts), so edits in Shopify can lag until that tag is revalidated. If a change does not show up locally, clear `.next` and restart `pnpm dev`.
- **Product image crop.** `components/collections/results-grid.tsx` crops product images to 5:4 on collection and all-products pages only, using a scoped selector, so the shared product card is unchanged elsewhere. To undo it, remove `[&_[data-slot=product-card-image]]:aspect-5/4` from the two `gridClassName` strings.

Known limits: the Expert Advice tab has no article-type filter or sort, and the tiles render inside the results section, so they appear when the products do.

## Customer accounts

Sign-in uses Shopify Customer Accounts through a **Confidential** Customer Account API client on the Headless storefront (a Public client has no secret and will not work).

Setup, already done:

1. Shopify Admin, Settings, Customer accounts: choose new customer accounts.
2. Sales channels, Headless, the storefront, Customer Account API: set the client type to Confidential.
3. Callback URI `https://ecombio.com/account/authorize` and logout URI `https://ecombio.com/`.
4. Set the three auth variables in Vercel, set `auth.isEnabled` to `true`, and deploy.

Rules:

- Shopify does not allow wildcard URIs. Register every preview or tunnel origin that needs sign-in.
- Secrets are server-only and must be identical across every instance of a deployment.
- Rotating `CUSTOMER_ACCOUNT_SESSION_SECRET` signs out all customers.
- Generate a session secret without printing it, then paste it straight into Vercel:

```powershell
$b = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); [Convert]::ToBase64String($b) | Set-Clipboard
```

Test in an incognito window: open `/account/login`, sign in with the emailed one-time code, check `/account/profile`, `/account/orders`, and `/account/addresses`, then sign out and confirm you return to the storefront as a guest.

If sign-in fails, compare the deployed origin, callback URI, logout URI, store domain, client ID, and client secret character for character. Stray spaces, quotes, or a trailing slash are the usual cause.

## Environment variables

Values live in Vercel (Production and Preview) and `.env.local`, never in git. Mark secrets **Sensitive** in Vercel. Changes only apply to new deployments, so redeploy after editing. Every variable the code reads should have a row in `.env.example`.

| Variable                                      | Purpose                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`            | Required. Shopify store domain.                                                       |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Required. Public Storefront API token.                                                |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ID`           | Cart attribution for the Headless storefront.                                         |
| `CUSTOMER_ACCOUNT_SESSION_SECRET`             | Required while customer accounts are enabled. Session encryption secret you generate. |
| `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID`      | Required while customer accounts are enabled. Confidential client ID.                 |
| `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_SECRET`  | Required while customer accounts are enabled. Confidential client secret.             |
| `SHOPIFY_WEBHOOK_SECRET`                      | Enables `POST /api/webhooks/shopify` (returns 404 without it).                        |
| `AI_GATEWAY_API_KEY`                          | Only needed if Shop Agent is enabled.                                                 |

## How the storefront works

- **Home:** fixed headline and description in the code, then the first eight products from the relevance-ranked `/collections/all` catalog. It is not a hand-picked list; point the grid at a Shopify collection to control it.
- **Product pages:** variant choices are in the URL. Data is cached and refreshed by Shopify webhooks, so edits can lag until webhooks are registered. Bundles and complementary products show nothing until they exist in Shopify. The delivery estimate line renders under the price (see ZIP code and delivery estimate).
- **Collections and search:** `/collections/[handle]` and `/search` have no toggles. Results are live, not cached. Collections and products must be published to the Headless channel. Filters come from Shopify Search & Discovery. Batch size is `PRODUCTS_PER_PAGE` in `lib/collections/index.ts`. Collection pages also have an Expert Advice tab, a sub-collection carousel, and a product count (see Collection page extras).
- **Product card:** one shared tile for every grid, so a visual change affects every page. Assign an image to each color variant in Shopify so filtered cards show the matching color.
- **Content pages:** Shopify Pages at `/pages/[handle]`, policies at `/policies/[handle]`, blogs at `/blogs/category/[categoryHandle]` and `/blogs/articles/[articleHandle]` (the old `/blogs/[blogHandle]` URLs redirect; see `docs/references/articles.md`). Edit them in Shopify. The webhook handler does not refresh them, so edits can stay cached. There is no `/blogs` index; link to a specific blog. Unknown handles return a 404.
- **Navigation:** the header reads the Shopify `main-menu` (falls back to a single Shop link), with a utility bar, search, cart, ZIP button, and account link. The utility and extra links are hardcoded in `components/nav/index.tsx`. On article pages a reading-progress line runs along the header's bottom edge.
- **Footer:** the store name and a link to every Shopify policy that has content. Social links and menu columns are optional.
- **Cart and checkout:** one Shopify cart is used everywhere and remembered in the browser for up to 14 days. Shopify decides prices, discounts, and availability, and hosts checkout.

## Blog

Articles are written in Shopify and use shortcodes for accordions, buttons, and product strips. See `docs/references/articles.md` for the writer guide and developer notes, and `docs/references/pages.md` for how each route maps to a Shopify template.

## Checkout domain

Checkout runs on `ecombio.myshopify.com`. A branded `checkout.ecombio.com` is planned:

1. Cloudflare DNS: CNAME `checkout` to `shops.myshopify.com`, DNS only (grey cloud). Verify with `Resolve-DnsName checkout.ecombio.com -Type CNAME`.
2. Shopify Admin, Settings, Domains, Connect existing domain: enter `checkout.ecombio.com` and verify.
3. Decide whether to make it the primary domain. Checkout follows the primary domain, and generated Shopify links (discount links, sitemaps, app links) may then point at the checkout subdomain instead of `ecombio.com`.

Do the test order on the current checkout first. The customer-account callback and logout URIs stay on `https://ecombio.com/...` either way.

## Languages and regions

The storefront is single-language: US / EN / `en-US`, clean URLs such as `/products/...`, and copy written inside the component that shows it. There is no central translation file, so to change wording, search the repo for the text you see on the site. After changing a message that depends on a count, check zero, one, and many, plus loading, empty, and error states.

Country and language configure Shopify requests. Locale only controls number and date formatting. Prices use the currency Shopify returns; changing the locale does not convert them. Product and content translations are done in Shopify, not in the code. The country and language picker in the ZIP modal does not yet change any of this.

Options if more languages or regions are needed (each is a skill a coding agent runs; read the skill page first):

- `/vercel-shop:enable-i18n`: next-intl, per-language message catalogs, language-prefixed URLs, and a copy-language switcher. It moves routes under `app/[locale]`, does not translate anything, and does not change the commerce country. After running it, repeat the sign-in and cart tests and confirm the Shopify callback URI still matches.
- `/vercel-shop:enable-shopify-markets`: regional commerce context and Shopify-controlled pricing.
- Third-party translation such as Weglot: its Shopify app is built for Online Store themes. Headless and Next.js support is unverified; ask the vendor before relying on it. Shopify hosts checkout, so its language comes from Shopify.

Do this on a branch, review the diff, run `pnpm lint` and `pnpm build`, and only then merge to `main`.

## Working with a coding agent

Optional; the template builds and deploys without it. To install the template plugins in a supported agent:

```bash
npx plugins add vercel/shop --scope project --yes
npx plugins add vercel/vercel-plugin --scope project --yes
npx plugins add Shopify/shopify-ai-toolkit --scope project --yes
```

Useful commands: `/vercel-shop:enable-shopify-menus`, `/vercel-shop:enable-i18n`, `/vercel-shop:enable-shopify-markets`, `/vercel-shop:enable-analytics`, `/vercel-shop:build-shop`, `/vercel-shop:update-shop`.

Rules from the template's agent guide:

- Prices, availability, cart totals, and customer identity always come from Shopify responses; do not reimplement them.
- Cart changes go through the Hydrogen handlers, not Server Actions, and never invalidate public caches.
- Customer session refresh happens only in the Hydrogen handlers registered in `proxy.ts`.
- Every configurable `process.env` variable needs a row in `.env.example`.
- This Next.js version has breaking changes; read `node_modules/next/dist/docs/` before changing framework code.
- Review every agent change with `git diff` before committing.

## Launch status

Done:

- [x] Shopify Headless channel, storefront token, Storefront API permissions
- [x] Products published to Headless; Search & Discovery filters configured
- [x] Deployed on Vercel; `ecombio.com` is primary, `www` redirects to it
- [x] GitHub repo connected to Vercel; pushes to `main` deploy to production
- [x] Cloudflare DNS and email records reviewed
- [x] Ecombio branding and root-domain canonicals
- [x] Customer accounts: Shopify client, callback and logout URIs, env vars, and deployment
- [x] Webhooks: product and collection webhooks registered in Shopify (JSON, API version 2026-07) to https://ecombio.com/api/webhooks/shopify; SHOPIFY_WEBHOOK_SECRET set in Production; unsigned requests return 401
- [x] ZIP code modal with switch country view, and delivery estimate line under the product price (placeholder numbers)
- [x] Collection pages: Products / Expert Advice tabs, sub-collection carousel, product count
- [x] Blog articles: left-aligned header with tag chips, full-width hero, Contents sidebar, back-to-top button, header reading-progress line, "You may like" cards
- [x] Docs: `docs/references/articles.md` (writing articles) and `docs/references/pages.md` (routes and Shopify template map)

Remaining:

- [ ] Collections: fill in Posts and Sub Collections on every collection that should show them, with Storefront API access ticked
- [ ] Delivery estimate: replace the placeholder handling and delivery days with real numbers, or build the ZIP-based estimate
- [ ] Country and language picker: connect it to Shopify Markets / i18n, or hide it until it does something
- [ ] Sign-in test: `/account/login` redirects to Shopify with `redirect_uri=https://ecombio.com/account/authorize` (verified). Still to confirm in a browser: sign in with the emailed code, check profile, orders, addresses, and logout
- [ ] Cart test: add, change quantity, remove, discount code, cart carries over after sign-in
- [ ] Checkout test: full test order on the live site, including Shop Pay
- [ ] Branded checkout domain: finish `checkout.ecombio.com` (see Checkout domain)
- [ ] Product pages: set up bundles and complementary products in Shopify, or disable their flags in `lib/config/index.ts`
- [ ] Home page: check the headline copy and which eight products show; consider featuring a collection
- [ ] Blog: set `author_profile` on every post, add featured images, unpublish test posts (such as "BLOGGLE")
- [ ] Content: fill in every store policy, check the footer links, and confirm edits (such as the contact-information email) appear on the live site
- [ ] Shopify fixes: product description typo, confirm collections are published to Headless
- [ ] DNS: DMARC record and the `store.ecombio.com` proxy setting
- [ ] Check `.env.example` lists the auth variables and `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ID`
- [ ] Spot-check `/sitemap.xml`, `/robots.txt`, and `/llms.txt` on the live site
- [ ] Remove `AI_GATEWAY_API_KEY` from Vercel until Shop Agent is enabled

Later / optional:

- [ ] Shop Agent (card on file in Vercel AI Gateway, spending limits, bot protection)
- [ ] Vercel Web Analytics
- [ ] Shopify-managed footer menus (the header already reads `main-menu`)
- [ ] Multiple languages or regions (see Languages and regions)
- [ ] "Pairs Well With" products and bundles in Shopify
