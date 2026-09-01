// app/templates/api.cart-recommendations.tsx
//
// MOVED from app/routes/ — routes.ts only scans `templates/` via
// flatRoutes({rootDirectory: 'templates'}), so anything placed in
// app/routes/ is invisible to the router and 404s. This filename
// already matches the flat-route convention used by
// api.quickview.$handle.tsx and api.reviews.tsx in this folder.

import type {Route} from './+types/api.cart-recommendations';
import {getProductRecommendations} from '~/lib/recommendations.server';

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');

  if (!productId) {
    return Response.json({products: []});
  }

  const products = await getProductRecommendations(context, productId, {
    intent: 'RELATED',
  });

  return Response.json({products: products.slice(0, 6)});
}