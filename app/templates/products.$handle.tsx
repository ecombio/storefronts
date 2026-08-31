// app/templates/products.$handle.tsx
import {Suspense, useState} from 'react';
import {useLoaderData, Await} from 'react-router';
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
import {
  getYotpoReviews,
  YOTPO_SORT_OPTIONS,
  type YotpoSortKey,
} from '~/lib/yotpo.server';
import {getProductRecommendations} from '~/lib/recommendations.server';
import {ReviewModal} from '~/snippets/ReviewModal';
import {CustomerReviews} from '~/sections/CustomerReviews';
import {ProductCarousel} from '~/sections/ProductCarousel';
import {MainProduct} from '~/sections/MainProduct';

const BREADCRUMB_COLLECTIONS_TO_FETCH = 20;
const BREADCRUMB_COLLECTION_PRODUCTS_CAP = 50;

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
  const criticalData = await loadCriticalData(args);
  const deferredData = loadDeferredData(args, criticalData.product.id);
  return {...deferredData, ...criticalData};
}

function resolveSortKey(value: string | null): YotpoSortKey {
  return value !== null && value in YOTPO_SORT_OPTIONS
    ? (value as YotpoSortKey)
    : 'top';
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront, env} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product, shop, shippingPage, refundPage, warrantyPage}] =
    await Promise.all([
      storefront.query(PRODUCT_QUERY, {
        variables: {
          handle,
          selectedOptions: getSelectedProductOptions(request),
          breadcrumbCollectionsFirst: BREADCRUMB_COLLECTIONS_TO_FETCH,
          breadcrumbCollectionProductsCap: BREADCRUMB_COLLECTION_PRODUCTS_CAP,
        },
      }),
    ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: product});

  const yotpoProductId = product.id.split('/').pop()!;

  const url = new URL(request.url);
  const sortKey = resolveSortKey(url.searchParams.get('sort'));
  const sortConfig = YOTPO_SORT_OPTIONS[sortKey];

  const yotpoReviews = env.PUBLIC_YOTPO_APP_KEY
    ? await getYotpoReviews(env.PUBLIC_YOTPO_APP_KEY, yotpoProductId, {
        sort: sortConfig.sort,
        direction: sortConfig.direction,
      })
    : null;

  const policyFields = product.policyMetafield?.reference;
  const {parentCollection, childCollection} = getBreadcrumbCollections(product);

  return {
    product,
    shopUrl: context.env.PUBLIC_STORE_DOMAIN,
    parentCollection,
    childCollection,
    yotpoReviews,
    currentSortKey: sortKey,
    shippingHtml:
      readSafeMetafieldHtml(policyFields?.shippingPolicyField) ??
      nullIfBlank(shippingPage?.body) ??
      nullIfBlank(shop?.shippingPolicy?.body),
    refundHtml:
      readSafeMetafieldHtml(policyFields?.returnsRefundsField) ??
      nullIfBlank(refundPage?.body) ??
      nullIfBlank(shop?.refundPolicy?.body),
    warrantyHtml:
      readSafeMetafieldHtml(policyFields?.warrantyPolicyField) ??
      nullIfBlank(warrantyPage?.body) ??
      '<p>Please contact us for warranty information.</p>',
  };
}

function loadDeferredData({context}: Route.LoaderArgs, productId: string) {
  return {
    recommended: getProductRecommendations(context, productId),
  };
}

function handleize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type BreadcrumbCollectionCandidate = {
  handle: string;
  title: string;
  products?: {nodes?: {id: string}[] | null} | null;
};

function getBreadcrumbCollections(product: {
  vendor?: string | null;
  collections?: {nodes?: BreadcrumbCollectionCandidate[] | null} | null;
}): {
  parentCollection: BreadcrumbCollectionCandidate | null;
  childCollection: BreadcrumbCollectionCandidate | null;
} {
  const collections = product.collections?.nodes ?? [];
  const vendorHandle = product.vendor ? handleize(product.vendor) : '';
  const sizeOf = (col: BreadcrumbCollectionCandidate) =>
    col.products?.nodes?.length ?? 0;

  let parentCollection: BreadcrumbCollectionCandidate | null = null;
  let largestCount = -1;

  for (const col of collections) {
    if (col.handle === vendorHandle) continue;
    const count = sizeOf(col);
    if (count > largestCount) {
      parentCollection = col;
      largestCount = count;
    }
  }

  let childCollection: BreadcrumbCollectionCandidate | null = null;
  let smallestCount = Infinity;

  for (const col of collections) {
    if (col.handle === vendorHandle) continue;
    if (col.handle === parentCollection?.handle) continue;
    const count = sizeOf(col);
    if (count < smallestCount) {
      childCollection = col;
      smallestCount = count;
    }
  }

  return {parentCollection, childCollection};
}

function nullIfBlank(value?: string | null): string | null {
  return value?.trim() ? value : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readSafeMetafieldHtml(
  field?: {value: string; type: string} | null,
): string | null {
  if (!field || !field.value.trim()) return null;

  if (field.type === 'multi_line_text_field') {
    return field.value
      .split('\n')
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('');
  }

  if (field.type === 'html' || field.type === 'single_line_text_field') {
    return field.value;
  }

  return null;
}

export default function Product() {
  const {
    product,
    shopUrl,
    shippingHtml,
    refundHtml,
    warrantyHtml,
    parentCollection,
    childCollection,
    yotpoReviews,
    currentSortKey,
    recommended,
  } = useLoaderData<typeof loader>();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const yotpoProductId = product.id.split('/').pop();
  const productUrl = `https://${shopUrl}/products/${product.handle}`;

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
      <MainProduct
        product={product}
        selectedVariant={selectedVariant}
        productOptions={productOptions}
        shippingHtml={shippingHtml}
        refundHtml={refundHtml}
        warrantyHtml={warrantyHtml}
        parentCollection={parentCollection}
        childCollection={childCollection}
        yotpoReviews={yotpoReviews}
        onReviewsClick={() =>
          document
            .getElementById('reviews')
            ?.scrollIntoView({behavior: 'smooth'})
        }
        onWriteReviewClick={() => setIsReviewModalOpen(true)}
      />
      <div id="reviews">
        <CustomerReviews
          productId={yotpoProductId ?? ''}
          productTitle={product.title}
          productUrl={productUrl}
          productImageUrl={selectedVariant?.image?.url}
          initialData={yotpoReviews}
          currentSortKey={currentSortKey}
          onWriteReviewClick={() => setIsReviewModalOpen(true)}
        />
      </div>
      <Suspense fallback={null}>
        <Await resolve={recommended} errorElement={null}>
          {(items) =>
            items.length > 0 ? (
              <ProductCarousel title="You may also like" products={items} />
            ) : null
          }
        </Await>
      </Suspense>
      {isReviewModalOpen && yotpoProductId && (
        <ReviewModal
          productId={yotpoProductId}
          productTitle={product.title}
          productUrl={productUrl}
          productImageUrl={selectedVariant?.image?.url}
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}
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
    collections(first: $breadcrumbCollectionsFirst) {
      nodes {
        handle
        title
        products(first: $breadcrumbCollectionProductsCap) {
          nodes {
            id
          }
        }
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
    $breadcrumbCollectionsFirst: Int!
    $breadcrumbCollectionProductsCap: Int!
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