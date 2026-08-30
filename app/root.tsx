// app/root.tsx
import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import {HEADER_QUERY} from '~/lib/fragments';
import {FOOTER_QUERY} from '~/sections/Footer';
import {
  MENU_COLLECTION_IMAGES_QUERY,
  type CollectionImage,
} from '~/config/Header.constants';
import resetStyles from '~/assets/reset.css?url';
import appStyles from '~/assets/app.css?url';
import menuStyles from '~/assets/highlight.css?url';
import mainProductStyles from '~/assets/main-product.css?url';
import productDescriptionStyles from '~/assets/product-description.css?url';
import collectionFiltersStyles from '~/assets/collection-filters.css?url';
import tailwindCss from '~/assets/tailwind.css?url';
import {PageLayout} from './components/PageLayout';

export type RootLoader = typeof loader;

export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  if (formMethod && formMethod !== 'GET') return true;

  if (currentUrl.toString() === nextUrl.toString()) return true;

  return false;
};

export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);

  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    yotpoAppKey: env.PUBLIC_YOTPO_APP_KEY,
    algolia: {
      appId: env.PUBLIC_ALGOLIA_APP_ID,
      searchKey: env.PUBLIC_ALGOLIA_SEARCH_KEY,
      indexName: env.PUBLIC_ALGOLIA_INDEX_NAME,
    },
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu',
      },
    }),
  ]);

  const collectionImages = await loadMenuCollectionImages(storefront, header.menu);

  return {header, collectionImages};
}

async function loadMenuCollectionImages(
  storefront: Route.LoaderArgs['context']['storefront'],
  menu: Awaited<ReturnType<typeof storefront.query<typeof HEADER_QUERY>>>['menu'],
): Promise<Record<string, CollectionImage>> {
  if (!menu) return {};

  const collectionIds = menu.items
    .flatMap((item) => item.items ?? [])
    .map((item) => item.resourceId)
    .filter((id): id is string => Boolean(id) && id.includes('/Collection/'));

  if (!collectionIds.length) return {};

  const data = await storefront.query(MENU_COLLECTION_IMAGES_QUERY, {
    variables: {ids: collectionIds},
  });

  return Object.fromEntries(
    data.nodes
      .filter(
        (n): n is {id: string; image: CollectionImage | null} =>
          n != null && 'image' in n,
      )
      .filter((n) => n.image)
      .map((n) => [n.id, n.image as CollectionImage]),
  );
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;

  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer',
        policiesMenuHandle: 'policies',
      },
    })
    .catch((error: Error) => {
      console.error(error);
      return null;
    });
  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss}></link>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <link rel="stylesheet" href={menuStyles}></link>
        <link rel="stylesheet" href={mainProductStyles}></link>
        <link rel="stylesheet" href={productDescriptionStyles}></link>
        <link rel="stylesheet" href={collectionFiltersStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');
  const nonce = useNonce();

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <PageLayout {...data}>
        <Outlet />
      </PageLayout>
      {data.yotpoAppKey && (
        <script
          nonce={nonce}
          src={`https://cdn-widgetsrepository.yotpo.com/v1/loader/${data.yotpoAppKey}`}
          async
        />
      )}
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}