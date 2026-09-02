# Product Reviews Sync (Yotpo → Shopify Metafields)

Yotpo's free plan doesn't include the paid "Shopify Metafields Sync" feature, so
`scripts/sync-yotpo-ratings.mjs` backfills the same thing manually: it pulls each
product's rating + review count from Yotpo and writes them into the
`reviews.rating` / `reviews.rating_count` product metafields that `ProductCard`
already reads via `ProductCardFragment`.

Run it on a schedule to keep ratings current as new reviews come in.

## How it works

1. Loops every product in the store via the Admin API (`products` query).
2. For each one, calls Yotpo's bottomline endpoint using the product's
   `legacyResourceId` as the Yotpo product ID.
3. If the product has ≥1 review, writes `reviews.rating` (Shopify's `rating`
   metafield type) and `reviews.rating_count` (`number_integer`) via
   `metafieldsSet`.
4. Products with 0 reviews are left alone — `ProductCard`'s `parseRating`/
   `parseCount` already default to `0` when the metafield is missing, so
   there's nothing to write.

## One-time setup

Auth uses the Dev Dashboard's client credentials grant (Shopify retired static
`shpat_` tokens for new apps as of Jan 1, 2026):

1. [Dev Dashboard](https://dev.shopify.com/dashboard) → your app (e.g. "Yotpo
   Rating Sync") → **Settings** → **Credentials** → copy the **Client ID** and
   **Secret**.
2. Confirm the app has `read_products` + `write_products` scopes, and that it's
   installed on `ecombio` (Shopify admin → Settings → Apps and sales channels).
   Any time scopes change, the store has to re-approve — uninstall/reinstall if
   there's no visible "update access" prompt.

## Required environment variables

| Variable | Value |
|---|---|
| `SHOPIFY_SHOP` | `ecombio` (subdomain only, no `.myshopify.com`) |
| `SHOPIFY_CLIENT_ID` | From Dev Dashboard → Settings → Credentials |
| `SHOPIFY_CLIENT_SECRET` | From Dev Dashboard → Settings → Credentials |
| `YOTPO_APP_KEY` | Same value as `PUBLIC_YOTPO_APP_KEY` in `.env` |

## Manual run

```powershell
$env:SHOPIFY_SHOP = "ecombio"
$env:SHOPIFY_CLIENT_ID = "<client id>"
$env:SHOPIFY_CLIENT_SECRET = "<client secret>"
$env:YOTPO_APP_KEY = "<PUBLIC_YOTPO_APP_KEY value>"

node scripts/sync-yotpo-ratings.mjs
```

## Scheduling it

### Option A — Windows Task Scheduler (simplest, runs on your machine)

1. Save the env vars into a small wrapper script, e.g.
   `scripts/run-yotpo-sync.ps1`:

   ```powershell
   $env:SHOPIFY_SHOP = "ecombio"
   $env:SHOPIFY_CLIENT_ID = "<client id>"
   $env:SHOPIFY_CLIENT_SECRET = "<client secret>"
   $env:YOTPO_APP_KEY = "<PUBLIC_YOTPO_APP_KEY value>"
   Set-Location "C:\Users\Admin\Shopify\Storefronts\Headless"
   node scripts/sync-yotpo-ratings.mjs *>> "$PSScriptRoot\yotpo-sync.log"
   ```

   Don't commit this file if it has real secrets in it — add it to
   `.gitignore`, or better, read the values from a local `.env` file instead
   of hardcoding them.

2. Open **Task Scheduler** → **Create Task**.
3. **Trigger**: Daily, pick a time (e.g. 3:00 AM, low-traffic).
4. **Action**: Start a program →
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\Admin\Shopify\Storefronts\Headless\scripts\run-yotpo-sync.ps1"`
5. Under **Settings**, check "Run task as soon as possible after a scheduled
   start is missed" so it still fires if the machine was asleep.

Downside: only runs while this machine is on.

### Option B — GitHub Actions cron (runs regardless of any machine being on)

If the repo is on GitHub, add `.github/workflows/yotpo-sync.yml`:

```yaml
name: Sync Yotpo Ratings

on:
  schedule:
    - cron: '0 8 * * *'   # daily at 08:00 UTC — adjust as needed
  workflow_dispatch: {}    # lets you trigger it manually from the Actions tab

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node scripts/sync-yotpo-ratings.mjs
        env:
          SHOPIFY_SHOP: ecombio
          SHOPIFY_CLIENT_ID: ${{ secrets.SHOPIFY_CLIENT_ID }}
          SHOPIFY_CLIENT_SECRET: ${{ secrets.SHOPIFY_CLIENT_SECRET }}
          YOTPO_APP_KEY: ${{ secrets.YOTPO_APP_KEY }}
```

Add the three secrets under repo **Settings → Secrets and variables →
Actions**. This is the more reliable option long-term — no dependency on a
specific machine being powered on.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `certificate has expired` | `SHOPIFY_SHOP` was set to the full domain (`ecombio.myshopify.com`) instead of just the subdomain — the script appends `.myshopify.com` itself. |
| `Missing required environment variable` | One of the four env vars wasn't set in the current terminal session — they don't persist between sessions. |
| `Access denied for products field` (`ACCESS_DENIED`) | App is missing `read_products`/`write_products` scopes, **or** the store hasn't re-approved scopes after a change. Fix scopes in Dev Dashboard, then reinstall the app on the store if no approval prompt appears automatically. |
| Rating shows correctly on the product page but not on collection/grid cards | Usually a caching issue on the collection route, or (less commonly) the grid using a different card component/fragment than `ProductCard`/`ProductCardFragment`. |

## Notes for future maintenance

- If you ever upgrade to Yotpo's paid plan and enable their native Metafields
  Sync, this script becomes redundant — turn off the schedule rather than
  running both in parallel.
- The script skips products with 0 reviews rather than writing an explicit
  `0` — this is intentional, don't "fix" it to always write, since
  `parseRating`/`parseCount` already treat a missing metafield as `0`.
