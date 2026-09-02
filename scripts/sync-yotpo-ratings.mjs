// scripts/sync-yotpo-ratings.mjs
//
// Backfills / keeps in sync what Yotpo's paid "Shopify Metafields Sync"
// feature would otherwise do automatically. Run this on a schedule
// while on Yotpo's free plan.
//
// For every product in the store:
//   1. Fetch Yotpo's bottomline (average score + review count) — same
//      endpoint/shape as app/lib/yotpo.server.ts's getYotpoReviews(),
//      just re-implemented here without Hydrogen-specific imports since
//      this runs as a plain Node script, not inside the app.
//   2. Write it into the `reviews.rating` / `reviews.rating_count`
//      metafields via the Admin API's metafieldsSet mutation — the same
//      namespace/key ProductCardFragment already reads via the
//      Storefront API.
//
// Only writes when a product has at least one review, so products with
// zero reviews are left with no metafield — ProductCard's parseRating/
// parseCount already default to 0 for a missing metafield, so there's
// no need to write an explicit zero.
//
// AUTH: Shopify retired static shpat_ tokens for new apps as of
// January 1, 2026. Apps created in the Dev Dashboard (like the one this
// screenshot shows — Client ID / Secret, no visible token) authenticate
// with the client credentials grant instead: exchange Client ID +
// Secret for a token that expires in 24 hours, and re-exchange before
// it expires. getAdminToken() below handles that automatically — every
// caller just awaits it, and it only hits the token endpoint again once
// the cached token is close to expiring.
//
// This only works if the app and the store are in the same Shopify
// organization (both show up under the same org in the Dev Dashboard).
// If you see a `shop_not_permitted` error, that's the mismatch —
// see https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
//
// Required environment variables:
//   SHOPIFY_SHOP            Store subdomain only, e.g. ecombio
//                            (without .myshopify.com)
//   SHOPIFY_CLIENT_ID        From the app's Dev Dashboard Settings page
//   SHOPIFY_CLIENT_SECRET    From the same page
//   YOTPO_APP_KEY             Same value as PUBLIC_YOTPO_APP_KEY in
//                            your Hydrogen .env
//
// Usage:
//   node scripts/sync-yotpo-ratings.mjs

const SHOP = requireEnv('SHOPIFY_SHOP');
const CLIENT_ID = requireEnv('SHOPIFY_CLIENT_ID');
const CLIENT_SECRET = requireEnv('SHOPIFY_CLIENT_SECRET');
const YOTPO_APP_KEY = requireEnv('YOTPO_APP_KEY');

const ADMIN_API_VERSION = '2025-01';
const ADMIN_GRAPHQL_URL = `https://${SHOP}.myshopify.com/admin/api/${ADMIN_API_VERSION}/graphql.json`;
const TOKEN_URL = `https://${SHOP}.myshopify.com/admin/oauth/access_token`;

// Be polite to both APIs — Yotpo's reviews.json endpoint and Shopify's
// cost-based GraphQL throttling both benefit from spacing requests out
// rather than firing hundreds of products' worth of calls at once.
const DELAY_BETWEEN_PRODUCTS_MS = 400;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Client credentials grant -----------------------------------------

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAdminToken() {
  // Refresh a minute early rather than racing the exact expiry instant.
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const {access_token, expires_in} = await res.json();
  cachedToken = access_token;
  tokenExpiresAt = Date.now() + expires_in * 1000;
  return cachedToken;
}

async function adminGraphql(query, variables) {
  const res = await fetch(ADMIN_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': await getAdminToken(),
    },
    body: JSON.stringify({query, variables}),
  });

  if (!res.ok) {
    throw new Error(`Admin API request failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Admin API GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

// --- Products -----------------------------------------------------------

const PRODUCTS_PAGE_QUERY = `#graphql
  query ProductsPage($cursor: String) {
    products(first: 100, after: $cursor) {
      nodes {
        id
        legacyResourceId
        title
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

async function* iterateAllProducts() {
  let cursor = null;

  while (true) {
    const data = await adminGraphql(PRODUCTS_PAGE_QUERY, {cursor});
    for (const product of data.products.nodes) {
      yield product;
    }

    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }
}

/**
 * Mirrors getYotpoReviews()'s bottomline parsing in
 * app/lib/yotpo.server.ts, trimmed to just what this script needs.
 * per_page=1 is intentional — only the bottomline block is used, so
 * there's no reason to pull a full page of review bodies per product.
 */
async function getYotpoBottomline(yotpoProductId) {
  const res = await fetch(
    `https://api-cdn.yotpo.com/v1/widget/${YOTPO_APP_KEY}/products/${yotpoProductId}/reviews.json?per_page=1`,
  );

  if (!res.ok) {
    console.warn(`  Yotpo fetch failed (${res.status}) for product ${yotpoProductId}`);
    return null;
  }

  const data = await res.json();
  const bl = data?.response?.bottomline;
  if (!bl) return null;

  return {
    averageScore: bl.average_score ?? 0,
    totalReviews: bl.total_review ?? 0,
  };
}

const METAFIELDS_SET_MUTATION = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        key
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function writeRatingMetafields(productGid, averageScore, totalReviews) {
  // Matches the JSON shape Shopify's built-in "Rating" metafield type
  // expects, and what ProductCard.tsx's parseRating() already parses:
  // {"value":"4.3","scale_min":"1","scale_max":"5"}
  const ratingValue = JSON.stringify({
    value: averageScore.toFixed(1),
    scale_min: '1',
    scale_max: '5',
  });

  const data = await adminGraphql(METAFIELDS_SET_MUTATION, {
    metafields: [
      {
        ownerId: productGid,
        namespace: 'reviews',
        key: 'rating',
        type: 'rating',
        value: ratingValue,
      },
      {
        ownerId: productGid,
        namespace: 'reviews',
        key: 'rating_count',
        type: 'number_integer',
        value: String(totalReviews),
      },
    ],
  });

  const errors = data.metafieldsSet.userErrors;
  if (errors.length > 0) {
    throw new Error(`metafieldsSet userErrors: ${JSON.stringify(errors)}`);
  }
}

async function main() {
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for await (const product of iterateAllProducts()) {
    processed++;
    const yotpoProductId = String(product.legacyResourceId);

    try {
      const bottomline = await getYotpoBottomline(yotpoProductId);

      if (!bottomline || bottomline.totalReviews === 0) {
        skipped++;
        console.log(`- ${product.title}: no reviews, skipped`);
      } else {
        await writeRatingMetafields(
          product.id,
          bottomline.averageScore,
          bottomline.totalReviews,
        );
        updated++;
        console.log(
          `✓ ${product.title}: ${bottomline.averageScore.toFixed(1)} (${bottomline.totalReviews} reviews)`,
        );
      }
    } catch (error) {
      failed++;
      console.error(`✗ ${product.title}: ${error.message}`);
    }

    await sleep(DELAY_BETWEEN_PRODUCTS_MS);
  }

  console.log(
    `\nDone. ${processed} products checked, ${updated} updated, ${skipped} skipped (no reviews), ${failed} failed.`,
  );
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
