// app/templates/api.quickview.$handle.tsx
//
// Resource route: GET /api/quickview/:handle
// Returns full product JSON (options, variants, images, review
// metafields) for the QuickView modal, plus a deferred
// `recommended` promise so the recommendations carousel doesn't
// block the modal from opening — same pattern as products.$handle.tsx.
// Trimmed version of the PRODUCT_QUERY in products.$handle.tsx — no
// breadcrumbs, no policy metaobject, since the modal doesn't need them.
import {type LoaderFunctionArgs} from 'react-router';
import {getSelectedProductOptions} from '@shopify/hydrogen';
import {getProductRecommendations} from '~/lib/recommendations.server';

export async function loader({context, params, request}: LoaderFunctionArgs) {
  const {handle} = params;

  if (!handle) {
    throw new Response('Missing product handle', {status: 400});
  }

  const {storefront} = context;

  const {product} = await storefront.query(QUICKVIEW_QUERY, {
    variables: {
      handle,
      selectedOptions: getSelectedProductOptions(request),
    },
  });

  if (!product?.id) {
    throw new Response('Product not found', {status: 404});
  }

  // NOTE: not wrapped in Response.json() — returning a plain object
  // (with `recommended` as an unawaited promise) lets React Router's
  // single-fetch/turbo-stream transport stream it to the fetcher, the
  // same way products.$handle.tsx streams its own `recommended` field.
  // Wrapping in Response.json() would force it to serialize eagerly,
  // which means awaiting it here and blocking the modal on it.
  return {
    product,
    recommended: getProductRecommendations(context, product.id),
  };
}

const QUICKVIEW_VARIANT_FRAGMENT = `#graphql
  fragment QuickViewVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    selectedOptions {
      name
      value
    }
    sku
    title
  }
` as const;

const QUICKVIEW_PRODUCT_FRAGMENT = `#graphql
  fragment QuickViewProduct on Product {
    id
    title
    vendor
    handle
    encodedVariantExistence
    encodedVariantAvailability
    images(first: 6) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...QuickViewVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...QuickViewVariant
    }
    adjacentVariants(selectedOptions: $selectedOptions) {
      ...QuickViewVariant
    }
    reviewsRating: metafield(namespace: "reviews", key: "rating") {
      value
    }
    reviewsCount: metafield(namespace: "reviews", key: "rating_count") {
      value
    }
  }
  ${QUICKVIEW_VARIANT_FRAGMENT}
` as const;

const QUICKVIEW_QUERY = `#graphql
  query QuickView(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...QuickViewProduct
    }
  }
  ${QUICKVIEW_PRODUCT_FRAGMENT}
` as const;