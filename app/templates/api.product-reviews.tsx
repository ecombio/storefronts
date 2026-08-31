// app/templates/api.product-reviews.tsx
import type {Route} from './+types/api.product-reviews';
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
