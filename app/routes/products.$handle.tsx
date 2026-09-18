// app/routes/products.$handle.tsx
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {
  ProductGallery,
  ProductForm,
  ProductAccordion,
} from '~/components/product-detail';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';

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

  return {
    product,
  };
}

function loadDeferredData({context, params}: Route.LoaderArgs) {
  // Wire product recommendations here later, e.g.:
  // const recommended = context.storefront.query(RECOMMENDED_PRODUCTS_QUERY, {
  //   variables: {productId: params handle-derived id},
  // });
  // return {recommended};
  return {};
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

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
  const fitMetafield = product.fitMetafield?.value;

  return (
    <div className="w-full pb-24 bg-white lg:pb-16">
      {/*
        Mobile (base): single column, gallery on top, everything stacked.
        Desktop (lg+): two-column — gallery left, buy panel right and
        sticky so it stays in view while the gallery/description scroll.
      */}
      <div className="lg:mx-auto lg:max-w-6xl lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-12 lg:px-8 lg:pt-10">
        <div className="lg:max-w-none max-w-[480px] mx-auto lg:mx-0">
          <ProductGallery
            images={product.images?.nodes ?? []}
            selectedVariantImage={selectedVariant?.image}
          />
        </div>

        <div className="lg:sticky lg:top-10 lg:self-start lg:pt-2">
          <div className="max-w-[480px] mx-auto lg:mx-0 lg:max-w-none">
            <div className="px-5 pt-5 text-center lg:px-0 lg:pt-0 lg:text-left">
              <h1 className="font-[Barlow_Condensed] font-extrabold text-[20px] lg:text-[28px] uppercase tracking-[0.04em] text-[#0a0a0a]">
                {title}
              </h1>
              {fitMetafield ? (
                <p className="mt-1 text-[14px] text-[#6b6b6b]">
                  {fitMetafield}
                </p>
              ) : null}
              <div className="mt-1 text-[15px] lg:text-[18px] font-medium text-[#0a0a0a]">
                <ProductPrice
                  price={selectedVariant?.price}
                  compareAtPrice={selectedVariant?.compareAtPrice}
                />
              </div>
            </div>

            <div className="px-5 pt-6 lg:px-0">
              <ProductForm
                productOptions={productOptions}
                selectedVariant={selectedVariant}
              />
            </div>

            <div className="px-5 mt-4 lg:px-0">
              <ProductAccordion title="Description">
                <div
                  className="text-[13px] leading-relaxed text-[#3a3a3a]"
                  dangerouslySetInnerHTML={{__html: descriptionHtml}}
                />
              </ProductAccordion>
              <ProductAccordion title="Delivery & Returns">
                <div className="flex flex-col gap-3 text-[13px] text-[#3a3a3a]">
                  <div>
                    <p className="font-semibold text-[#0a0a0a] mb-0.5">
                      Standard Delivery
                    </p>
                    <p>Free on orders over $75. 3–5 business days.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#0a0a0a] mb-0.5">
                      Express Delivery
                    </p>
                    <p>$8.99. 1–2 business days.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#0a0a0a] mb-0.5">
                      Returns
                    </p>
                    <p>
                      Free returns within 30 days of purchase. Items must be
                      unworn and in original condition.
                    </p>
                  </div>
                </div>
              </ProductAccordion>
            </div>
          </div>
        </div>
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
    fitMetafield: metafield(namespace: "custom", key: "fit") {
      value
    }
    images(first: 10) {
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
