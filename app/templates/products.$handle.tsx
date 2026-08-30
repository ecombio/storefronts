import {useState} from 'react';
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
import {getYotpoBottomline} from '~/lib/yotpo.server';
import {useYotpoRefresh} from '~/hooks/useYotpoRefresh';
import {ReviewsWidget} from '~/snippets/ReviewsWidget';
import {ReviewModal} from '~/snippets/ReviewModal';
import {StarRating} from '~/snippets/StarRating';
import {ProductMedia} from '~/sections/ProductMedia';
import {ProductPrice} from '~/snippets/ProductPrice';
import {ProductForm} from '~/sections/ProductForm';
import {ProductDescriptionPanels} from '~/snippets/ProductDescriptionPanels';
import {SaleBadge} from '~/snippets/SaleBadge';
import {Breadcrumbs} from '~/snippets/Breadcrumbs';

// Reviews stay on Yotpo's client-side widget (see useYotpoRefresh).
const YOTPO_REVIEWS_INSTANCE_ID = '1332840';

// Collections fetched per product for breadcrumb parent/child
// resolution. Must cover the vendor auto-collection plus every real
// collection; bump if a product with more collections gets an
// incomplete breadcrumb trail.
const BREADCRUMB_COLLECTIONS_TO_FETCH = 20;

// This API version has no `productsCount` field, so collection size
// is approximated by capping product ids fetched per collection.
// Two collections both over this cap will tie and lose ranking; raise
// if breadcrumbs pick the wrong parent/child.
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
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
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
  const yotpoBottomline = env.PUBLIC_YOTPO_APP_KEY
    ? (await getYotpoBottomline(env.PUBLIC_YOTPO_APP_KEY, yotpoProductId)) ?? {
        averageScore: 0,
        totalReviews: 0,
      }
    : null;

  const policyFields = product.policyMetafield?.reference;
  const {parentCollection, childCollection} = getBreadcrumbCollections(product);

  return {
    product,
    shopUrl: context.env.PUBLIC_STORE_DOMAIN,
    parentCollection,
    childCollection,
    yotpoBottomline,
    shippingHtml:
      readSafeMetafieldHtml(policyFields?.shippingPolicyField) ??
      nullIfBlank(shippingPage?.body) ??
      nullIfBlank(shop?.shippingPolicy?.body),
    refundHtml:
      readSafeMetafieldHtml(policyFields?.returnsRefundsField) ??
      nullIfBlank(refundPage?.body) ??
      nullIfBlank(shop?.refundPolicy?.body),
    // No shop-level equivalent for warranty — static fallback message.
    warrantyHtml:
      readSafeMetafieldHtml(policyFields?.warrantyPolicyField) ??
      nullIfBlank(warrantyPage?.body) ??
      '<p>Please contact us for warranty information.</p>',
  };
}

// JS port of Liquid's `| handleize`: lowercase, collapse non-alphanumerics
// to a single hyphen, trim edges. Doesn't transliterate accented/non-Latin
// characters like Shopify's real handleize does.
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

// Ported from breadcrumbs.liquid: excludes the product's vendor
// auto-collection (by handleized vendor name), then picks the largest
// remaining collection as "parent" and the smallest as "child". Both
// optional. "Size" is the capped product-id count from the query
// (see BREADCRUMB_COLLECTION_PRODUCTS_CAP above), not a true total.
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

// Renders a metaobject field as HTML only for types safe to drop into
// dangerouslySetInnerHTML. rich_text_field's value is Shopify's rich-text
// JSON AST, not HTML — no parser for that here, so it's skipped rather
// than rendered raw.
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

  return null;
}

function loadDeferredData({context, params}: Route.LoaderArgs) {
  return {};
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
    yotpoBottomline,
  } = useLoaderData<typeof loader>();

  useYotpoRefresh();

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

  const {title, descriptionHtml} = product;
  const yotpoProductId = product.id.split('/').pop();
  const productUrl = `https://${shopUrl}/products/${product.handle}`;

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
      <Breadcrumbs
        productTitle={title}
        parentCollection={parentCollection}
        childCollection={childCollection}
      />
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

        {/* Inlined from ProductDetail.tsx */}
        <div className="product-detail">
          <SaleBadge
            price={selectedVariant?.price}
            compareAtPrice={selectedVariant?.compareAtPrice}
          />
          <h1 className="product-detail-title">{title}</h1>
          <StarRating
            averageScore={yotpoBottomline?.averageScore ?? 0}
            totalReviews={yotpoBottomline?.totalReviews ?? 0}
            onReviewsClick={() =>
              document
                .getElementById('reviews')
                ?.scrollIntoView({behavior: 'smooth'})
            }
            onWriteReviewClick={() => setIsReviewModalOpen(true)}
          />
          <ProductPrice
            price={selectedVariant?.price}
            compareAtPrice={selectedVariant?.compareAtPrice}
          />
          <ProductForm
            productOptions={productOptions}
            selectedVariant={selectedVariant}
          />
          <ProductDescriptionPanels
            panels={[
              {id: 'description', title: 'Description', html: descriptionHtml},
              {
                id: 'shipping',
                title: 'Shipping Policy',
                html: shippingHtml ?? '',
              },
              {
                id: 'refund',
                title: 'Refund & Return Policy',
                html: refundHtml ?? '',
              },
              {
                id: 'warranty',
                title: 'Warranty',
                html: warrantyHtml ?? '',
              },
            ]}
          />
        </div>
      </div>
      <div id="reviews">
        <ReviewsWidget
          instanceId={YOTPO_REVIEWS_INSTANCE_ID}
          productId={yotpoProductId}
          productTitle={product.title}
          productUrl={productUrl}
          imageUrl={selectedVariant?.image?.url}
          price={selectedVariant?.price?.amount}
          currency={selectedVariant?.price?.currencyCode}
          description={product.description}
        />
      </div>
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