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
import {StarRating} from '~/components/StarRating';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';

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

  const [{product}] = await Promise.all([
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

  return {
    product,
    shopUrl: context.env.PUBLIC_STORE_DOMAIN,
    bottomline,
  };
}

function loadDeferredData({context, params}: Route.LoaderArgs) {
  return {};
}

export default function Product() {
  const {product, shopUrl, bottomline} = useLoaderData<typeof loader>();

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
    <div style={{display: "flex", flexDirection: "column", gap: "2rem"}}>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start"}}>
        <div>
          <ProductImage image={selectedVariant?.image} />
        </div>
        <div>
          <h1>{title}</h1>
          {bottomline && (
            <StarRating
              averageScore={bottomline.averageScore}
              totalReviews={bottomline.totalReviews}
            />
          )}
          <ProductPrice
            price={selectedVariant?.price}
            compareAtPrice={selectedVariant?.compareAtPrice}
          />
          <br />
          <ProductForm
            productOptions={productOptions}
            selectedVariant={selectedVariant}
          />
          <br />
          <br />
          <p>
            <strong>Description</strong>
          </p>
          <br />
          <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
        </div>
      </div>
      <div>
        {/* suppressHydrationWarning: Yotpo's async loader script (in root.tsx)
            injects its own rendered markup into this div. Without this, React's
            hydration/reconcile can detect a mismatch against our empty JSX and
            wipe out what Yotpo rendered, since React expects this node to stay
            empty on its own. */}
        <div
          className="yotpo-widget-instance"
          data-yotpo-instance-id={YOTPO_REVIEWS_INSTANCE_ID}
          data-yotpo-product-id={yotpoProductId}
          data-yotpo-name={product.title}
          data-yotpo-url={`https://${shopUrl}/products/${product.handle}`}
          data-yotpo-image-url={selectedVariant?.image?.url}
          data-yotpo-price={selectedVariant?.price?.amount}
          data-yotpo-currency={selectedVariant?.price?.currencyCode}
          data-yotpo-description={product.description}
          suppressHydrationWarning
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
  }
  ${PRODUCT_FRAGMENT}
` as const;