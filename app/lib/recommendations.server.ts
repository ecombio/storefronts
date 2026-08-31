// app/lib/recommendations.server.ts

import {CacheShort} from '@shopify/hydrogen';
import {PRODUCT_CARD_FRAGMENT} from '~/graphql/ProductCardFragment';
import type {HydrogenContext} from '~/lib/context';
import type {
  ProductCardFragment,
  ProductRecommendationsQuery,
  ProductRecommendationIntent,
} from 'storefrontapi.generated';

const PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations(
    $productId: ID!
    $intent: ProductRecommendationIntent
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId, intent: $intent) {
      ...ProductCard
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

export interface GetProductRecommendationsOptions {
  intent?: ProductRecommendationIntent;
}

export function getProductRecommendations(
  context: HydrogenContext,
  productId: string,
  {intent = 'RELATED'}: GetProductRecommendationsOptions = {},
): Promise<ProductCardFragment[]> {
  return context.storefront
    .query(PRODUCT_RECOMMENDATIONS_QUERY, {
      variables: {productId, intent},
      cache: CacheShort(),
    })
    .then((data: ProductRecommendationsQuery) =>
      (data.productRecommendations ?? []).filter(
        (product) => product.id !== productId,
      ),
    )
    .catch((error: Error) => {
      console.error(
        `[recommendations] ${intent} lookup failed for product ${productId}:`,
        error,
      );
      return [];
    });
}