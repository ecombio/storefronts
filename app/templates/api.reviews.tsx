import type {Route} from './+types/api.reviews';
import {
  getYotpoReviews,
  YOTPO_SORT_OPTIONS,
  type YotpoSortKey,
} from '~/lib/yotpo.server';

/**
 * Resource route (GET) used by CustomerReviews.tsx's "Load more" button
 * and sort changes to fetch additional pages of reviews via
 * fetcher.load(), without a full Remix navigation.
 *
 * Query params: productId (required), page (default 1), sort (one of
 * YOTPO_SORT_OPTIONS' keys, default "top").
 *
 * Merged from the former app/templates/api.product-reviews.tsx so that
 * GET and POST for reviews share a single resource route
 * (/api/reviews), per React Router's loader/action dispatch by method.
 */
export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const page = Number(url.searchParams.get('page') ?? '1');
  const sortKey = (url.searchParams.get('sort') ?? 'top') as YotpoSortKey;

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

  const sortConfig = YOTPO_SORT_OPTIONS[sortKey] ?? YOTPO_SORT_OPTIONS.top;
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
    body = await request.json();
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

  let data: unknown;
  try {
    data = await yotpoRes.json();
  } catch {
    data = null;
  }

  if (!yotpoRes.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data
        ? String((data as {message?: unknown}).message)
        : null) ?? 'Yotpo rejected the review submission';
    return Response.json({error: message}, {status: yotpoRes.status});
  }

  return Response.json({success: true});
}