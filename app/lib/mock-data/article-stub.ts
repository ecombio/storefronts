// app/lib/mock-data/article-stub.ts
//
// TEMP fixture for local testing of the shoppable-article pipeline.
// Swap the real `context.storefront.query(...)` calls for these in
// `loadCriticalData` to verify rendering (embed injection, hub/spoke
// classes, FAQ deep-linking) without hitting the live Storefront API.
//
// Delete or gate this behind an env check before shipping.

import fs from 'node:fs';
import path from 'node:path';

// Load the raw HTML body from article-content.html (adjust path to taste,
// or inline the string directly if you'd rather not read from disk).
const contentHtml = fs.readFileSync(
  path.join(__dirname, 'article-content.html'),
  'utf-8',
);

export const mockArticle = {
  handle: 'commuter-vs-cruiser-vs-trail-ebikes',
  title: 'Commuter, Cruiser, or Trail — Which Aventon E-Bike Fits You?',
  contentHtml,
  publishedAt: '2026-08-15T09:00:00Z',
  author: {name: 'Jordan Ruiz'},
  image: {
    id: 'gid://shopify/ProductImage/mock-hero',
    url: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/Current-ADV-Blue-Onyx-01.jpg?v=1785374568',
    altText: 'Aventon Current ADV Electric Mountain Bike on a gravel trail',
    width: 2500,
    height: 1661,
  },
  blog: {handle: 'articles'}, // set to 'category' to test the hub variant
  layoutVariant: null as {value: string} | null, // e.g. {value: 'feature'} to test the override
};

export const mockShoppableProductsResponse = {
  nodes: [
    {
      id: 'gid://shopify/Product/9448490696918',
      handle: 'aventon-level-4-rec-electric-commuter-bike',
      title: 'Aventon Level 4 REC Electric Commuter Bike',
      featuredImage: {
        url: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/Level-4-SO-REC-Mate-Black-01.jpg?v=1785374561',
        altText: 'Aventon Level 4 REC Electric Commuter Bike',
      },
      priceRange: {
        minVariantPrice: {amount: '1999.0', currencyCode: 'USD'},
      },
    },
    {
      id: 'gid://shopify/Product/9448490729686',
      handle: 'aventon-level-4-rec-step-through-electric-commuter-bike',
      title: 'Aventon Level 4 REC Step-Through Electric Commuter Bike',
      featuredImage: {
        url: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/Level-4-REC-Glacier-Mint-01.jpg?v=1785374563',
        altText: 'Aventon Level 4 REC Step-Through Electric Commuter Bike',
      },
      priceRange: {
        minVariantPrice: {amount: '1999.0', currencyCode: 'USD'},
      },
    },
    {
      id: 'gid://shopify/Product/9448490631382',
      handle: 'aventon-pace-5-rec-step-through-electric-cruiser-bike',
      title: 'Aventon Pace 5 REC Step-Through Electric Cruiser Bike',
      featuredImage: {
        url: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/Pace-5-REC-Anvil-01_e42b56cd-32b9-4bdc-bc52-c7a16b132112_jpg.png?v=1785374560',
        altText: 'Aventon Pace 5 REC Step-Through Electric Cruiser Bike',
      },
      priceRange: {
        minVariantPrice: {amount: '1799.0', currencyCode: 'USD'},
      },
    },
    {
      id: 'gid://shopify/Product/9448490893526',
      handle: 'aventon-current-adv-electric-mountain-bike',
      title: 'Aventon Current ADV Electric Mountain Bike',
      featuredImage: {
        url: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/Current-ADV-Blue-Onyx-01.jpg?v=1785374568',
        altText: 'Aventon Current ADV Electric Mountain Bike',
      },
      priceRange: {
        minVariantPrice: {amount: '3999.0', currencyCode: 'USD'},
      },
    },
  ],
};
