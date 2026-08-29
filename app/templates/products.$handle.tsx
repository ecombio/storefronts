import {useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  Analytics,
  getSelectedProductOptions,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {useYotpoRefresh} from '~/hooks/useYotpoRefresh';
import {getYotpoBottomline} from '~/lib/yotpo';
import {ReviewsWidget} from '~/sections/ReviewsWidget';
import {ProductMedia} from '~/sections/ProductMedia';
import {ProductDetail} from '~/sections/ProductDetail';

// Reviews widget instance stays on Yotpo's client-side script (needs
// useYotpoRefresh below to init/re-init on mount + route change).
// Star Rating is custom-coded (see StarRating.tsx + lib/yotpo.ts) since
// the client-side Star Rating widget never rendered reliably.
const YOTPO_REVIEWS_INSTANCE_ID = '1332840';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product, shop, shippingPage, refundPage, warrantyPage}] =
    await Promise.all([
      storefront.query(PRODUCT_QUERY, {
        variables: {handle, selectedOptions: getSelectedProductOptions(request)},
      }),
    ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: product});

  const yotpoProductId = product.id.split('/').pop()!;
  const bottomline = await getYotpoBottomline(yotpoProductId);

  const policyFields = product.policyMetafield?.reference;

  return {
    product,
    shopUrl: context.env.PUBLIC_STORE_DOMAIN,
    bottomline,
    shippingHtml:
      readSafeMetafieldHtml(policyFields?.shippingPolicyField) ??
      nullIfBlank(shippingPage?.body) ??
      nullIfBlank(shop?.shippingPolicy?.body),
    refundHtml:
      readSafeMetafieldHtml(policyFields?.returnsRefundsField) ??
      nullIfBlank(refundPage?.body) ??
      nullIfBlank(shop?.refundPolicy?.body),
    // No shop-level equivalent for warranty — falls back to a static
    // contact message, matching the Liquid reference.
    warrantyHtml:
      readSafeMetafieldHtml(policyFields?.warrantyPolicyField) ??
      nullIfBlank(warrantyPage?.body) ??
      '<p>Please contact us for warranty information.</p>',
  };
}

function nullIfBlank(value?: string | null): string | null {
  return value?.trim() ? value : null;
}

/**
 * Renders a metaobject field's value only when its type is something
 * we can safely drop straight into dangerouslySetInnerHTML —
 * multi_line_text_field (plain text, newline-separated) or an
 * html-type field. rich_text_field's `value` is Shopify's rich-text
 * JSON AST, not HTML — Liquid's `metafield_tag` filter converts that
 * automatically, but there's no equivalent here, so we deliberately
 * fall through to the next tier rather than render raw JSON.
 */
function readSafeMetafieldHtml(
  field?: {value: string; type: string} | null,
): string | null {
  if (!field || !field.value.trim()) return null;

  if (field.type === 'multi_line_text_field') {
    return field.value
      .split('\n')
      .map((line) => `<p>${line}</p>`)
      .join('');
  }

  if (field.type === 'html' || field.type === 'single_line_text_field') {
    return field.value;
  }

  // rich_text_field (or anything else unrecognized) — not safely
  // renderable without a JSON-AST-to-HTML parser. Skip it.
  return null;
}

function loadDeferredData({context, params}: Route.LoaderArgs) {
  return {};
}

export default function Product() {
  const {product, shopUrl, bottomline, shippingHtml, refundHtml} =
    useLoaderData<typeof loader>();

  useYotpoRefresh();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;
  const yotpoProductId = product.id.split('/').pop();

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        <ProductMedia
          images={product.images?.nodes ?? []}
          selectedVariantImage={selectedVariant?.image}
          productTitle={title}
        />
        <ProductDetail
          title={title}
          descriptionHtml={descriptionHtml}
          shippingHtml={shippingHtml}
          refundHtml={refundHtml}
          productOptions={productOptions}
          selectedVariant={selectedVariant}
          bottomline={bottomline}
        />
      </div>
      <div>
        <ReviewsWidget
          instanceId={YOTPO_REVIEWS_INSTANCE_ID}
          productId={yotpoProductId}
          productTitle={product.title}
          productUrl={`https://${shopUrl}/products/${product.handle}`}
          imageUrl={selectedVariant?.image?.url}
          price={selectedVariant?.price?.amount}
          currency={selectedVariant?.price?.currencyCode}
          description={product.description}
        />
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
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
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    images(first: 12) {
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
          ...ProductVariant
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
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
    policyMetafield: metafield(namespace: "custom", key: "product_policy") {
      reference {
        ... on Metaobject {
          shippingPolicyField: field(key: "shipping_policy") {
            value
            type
          }
          returnsRefundsField: field(key: "returns_refunds") {
            value
            type
          }
          warrantyPolicyField: field(key: "warranty_policy") {
            value
            type
          }
        }
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
    shop {
      shippingPolicy {
        body
      }
      refundPolicy {
        body
      }
    }
    shippingPage: page(handle: "shipping-policy") {
      body
    }
    refundPage: page(handle: "refund-policy") {
      body
    }
    warrantyPage: page(handle: "warranty") {
      body
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;