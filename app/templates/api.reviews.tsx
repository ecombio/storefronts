import type {Route} from './+types/api.reviews';
import {
  getYotpoReviews,
  YOTPO_SORT_OPTIONS,
  type YotpoSortKey,
} from '~/lib/yotpo.server';
import {readJson} from '~/lib/utils';

/**
 * Resource route (GET) used by CustomerReviews.tsx's "Load more" button
 * and sort changes to fetch additional pages of reviews via
 * fetcher.load(), without a full Remix navigation.
 *
 * Query params: productId (required), page (default 1, clamped to a
 * finite integer >= 1), sort (one of YOTPO_SORT_OPTIONS' keys, default
 * "top" — validated via real key membership, not a blind cast).
 *
 * Merged from the former app/templates/api.product-reviews.tsx so that
 * GET and POST for reviews share a single resource route
 * (/api/reviews), per React Router's loader/action dispatch by method.
 */

function resolveSortKey(value: string | null): YotpoSortKey {
  return value !== null && value in YOTPO_SORT_OPTIONS
    ? (value as YotpoSortKey)
    : 'top';
}

// Guards against `?page=abc` -> NaN, `?page=0`/negative, and fractional
// values, all of which would otherwise be forwarded to Yotpo as-is.
function resolvePage(value: string | null): number {
  const parsed = Number(value ?? '1');
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const page = resolvePage(url.searchParams.get('page'));
  const sortKey = resolveSortKey(url.searchParams.get('sort'));

  if (!productId) {
    return Response.json({error: 'Missing productId'}, {status: 400});
  }

  const appKey = context.env.PUBLIC_YOTPO_APP_KEY;
  if (!appKey) {
    return Response.json(
      {error: 'Reviews are not configured for this store'},
      {status: 500},
    );
  }

  const sortConfig = YOTPO_SORT_OPTIONS[sortKey];
  const result = await getYotpoReviews(appKey, productId, {
    page,
    sort: sortConfig.sort,
    direction: sortConfig.direction,
  });

  if (!result) {
    return Response.json({error: 'Failed to load reviews'}, {status: 502});
  }

  return Response.json(result);
}

/**
 * Resource route proxying review submissions to Yotpo's Create Review
 * API (POST https://api.yotpo.com/v1/widget/reviews), called from
 * ReviewModal.tsx.
 *
 * Field names below match Yotpo's documented request schema exactly
 * (appkey, sku, product_title, product_url, display_name, email,
 * review_content, review_title, review_score are all required) — see
 * https://apidocs.yotpo.com/reference/create-review. `sku` is Yotpo's
 * name for the product identifier field; it does not have to be an
 * actual SKU, per their docs, so the Shopify product id is passed
 * through as-is.
 *
 * Proxying server-side (rather than posting to Yotpo directly from
 * ReviewModal) keeps this consistent with getYotpoBottomline's
 * server-side fetch pattern and gives a single place to add
 * rate-limiting or validation later if needed. The app key here is
 * already public (it's embedded in the loader <script> src rendered
 * to every visitor in root.tsx), so no secret is involved in this call.
 */
export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({error: 'Method not allowed'}, {status: 405});
  }

  const appKey = context.env.PUBLIC_YOTPO_APP_KEY;
  if (!appKey) {
    return Response.json({error: 'Reviews are not configured for this store'}, {status: 500});
  }

  let body: {
    productId?: string;
    productTitle?: string;
    productUrl?: string;
    productImageUrl?: string;
    score?: number;
    title?: string;
    content?: string;
    displayName?: string;
    email?: string;
  };

  try {
    // request.json() has the same Oxygen-types ambiguity res.json() does
    // (both are just `.json()` methods structurally), so this goes
    // through the same readJson<T> helper as the response-parsing call
    // sites below rather than a bare `await request.json()`.
    body = await readJson<typeof body>(request);
  } catch {
    return Response.json({error: 'Invalid request body'}, {status: 400});
  }

  const {
    productId,
    productTitle,
    productUrl,
    productImageUrl,
    score,
    title,
    content,
    displayName,
    email,
  } = body;

  if (
    !productId ||
    !productTitle ||
    !productUrl ||
    !score ||
    !title ||
    !content ||
    !displayName ||
    !email
  ) {
    return Response.json({error: 'Missing required review fields'}, {status: 400});
  }

  // Presence checks above only confirm `score` is truthy — it could
  // still be a string, a float, or out of Yotpo's 1-5 range. Catch
  // that here with a clear 400 instead of forwarding a bad value and
  // surfacing whatever opaque error Yotpo happens to return for it.
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
    return Response.json(
      {error: 'score must be an integer between 1 and 5'},
      {status: 400},
    );
  }

  let domain: string;
  try {
    domain = new URL(productUrl).hostname;
  } catch {
    return Response.json({error: 'Invalid product URL'}, {status: 400});
  }

  const yotpoRes = await fetch('https://api.yotpo.com/v1/widget/reviews', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      appkey: appKey,
      domain,
      sku: productId,
      product_title: productTitle,
      product_url: productUrl,
      product_image_url: productImageUrl,
      display_name: displayName,
      email,
      review_score: score,
      review_title: title,
      review_content: content,
    }),
  });

  let data: {message?: string} | null;
  try {
    data = await readJson<{message?: string}>(yotpoRes);
  } catch {
    data = null;
  }

  if (!yotpoRes.ok) {
    const message = data?.message ?? 'Yotpo rejected the review submission';
    return Response.json({error: message}, {status: yotpoRes.status});
  }

  return Response.json({success: true});
}
