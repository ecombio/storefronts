September

@hydrogen

## Step 1: Setup
mkdir "C:\Users\Admin\Shopify\Storefronts\<new-project-name>" -Force
cd "C:\Users\Admin\Shopify\Storefronts\<new-project-name>"
npx @shopify/create-hydrogen@latest --path . --language ts --styling tailwind --install-deps --shortcut --markets none --git --mock-shop
npm install
npm run dev

## Step 2: Do it

git remote add origin https://github.com/ecombio/storefronts.git
git branch -M main
git add .
git commit -m "Hydrogen storefront setup"
git push origin main --force

## Step 3: Update

git add .
git commit -m "Update Hydrogen project"
git push origin main

@algolia

## 

====
@yotpo

