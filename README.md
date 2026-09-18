# September

## @hydrogen

### Step 1: Setup

```powershell
mkdir "C:\Users\Admin\Shopify\Storefronts\<new-project-name>" -Force
cd "C:\Users\Admin\Shopify\Storefronts\<new-project-name>"
npx @shopify/create-hydrogen@latest --path . --language ts --styling tailwind --install-deps --shortcut --markets none --git --mock-shop
npm install
npm run dev
```

### Step 2: Link to Shopify

Scaffolding with `--mock-shop` gets the project running against fake product data immediately, but it still needs to be linked to a real storefront before it'll pull live data.

```powershell
npx shopify hydrogen link
npx shopify hydrogen env pull
```

- `link` associates this local project with a Hydrogen storefront on Shopify (writes `.shopify/project.json`) — it'll open a browser login if you're not already authenticated.
- `env pull` fetches that storefront's `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`, and related env vars into `.env`. This step is separate from `link` and is required — without it you'll keep seeing the "you're seeing mocked products" banner even after linking.

### Step 3: Push to GitHub

```powershell
git remote add origin https://github.com/ecombio/storefronts.git
git branch -M main
git add .
git commit -m "Hydrogen storefront setup"
git push origin main --force
```

### Step 4: Update

```powershell
git add .
git commit -m "Update Hydrogen project"
git push origin main
```

---

## @algolia

_TBD_

---

## @yotpo

_TBD_