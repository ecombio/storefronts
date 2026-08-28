# 1. Create destination and clone the headless branch
mkdir "C:\Users\Admin\Shopify\Storefronts\Headless" -Force
cd "C:\Users\Admin\Shopify\Storefronts\Headless"
git clone --branch headless https://github.com/ecombio/storefronts.git .

# 2. Link to the Ecombio storefront and pull env vars (opens browser login)
npx shopify hydrogen link
npx shopify hydrogen env pull

# 3. Add the missing env var that caused last time's Analytics/hydration bug
Add-Content -Path .env -Value "PUBLIC_CHECKOUT_DOMAIN=ecombio.myshopify.com"

# 4. Install and run
npm install
npm run dev

# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [React Router](https://reactrouter.com/), the modern multi-strategy router for React. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with React Router](https://reactrouter.com/start/framework/routing)

## What's included

- React Router
- Hydrogen
- Oxygen
- Vite
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started (this repo)

**Requirements:**
- Node.js version 22.x or 24.x
- Access to the `ecombio` Shopify shop (ask a teammate for access if you don't have it)

**1. Clone the `headless` branch**

```bash
git clone --branch headless https://github.com/ecombio/storefronts.git
cd storefronts
```

**2. Link the project to the Hydrogen storefront and pull env vars**

```bash
npx shopify hydrogen link
npx shopify hydrogen env pull
```

This logs you into the `ecombio` shop, links to the `Ecombio` storefront (`store.ecombio.com`), and writes a local `.env` file with the required variables:

- `PUBLIC_STOREFRONT_ID`
- `PUBLIC_STOREFRONT_API_TOKEN`
- `PUBLIC_STORE_DOMAIN`
- `PRIVATE_STOREFRONT_API_TOKEN`
- `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`
- `PUBLIC_CUSTOMER_ACCOUNT_API_URL`
- `SHOP_ID`
- `SESSION_SECRET`

**3. Install dependencies**

```bash
npm install
```

**4. Run the dev server**

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

> **Note:** If `npm run dev` shows a warning like `Failed to load environment variables from Shopify... ECONNRESET`, the dev server still starts fine using the local `.env` values — this is a transient network hiccup talking to Shopify's Admin API and can usually be ignored.

## Building for production

```bash
npm run build
```

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
