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
import {FOOTER_QUERY} from '~/components/Footer';
import {
  MENU_COLLECTION_IMAGES_QUERY,
  type CollectionImage,
} from '~/components/Header.constants';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import menuStyles from '~/styles/menu.css?url';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from './components/PageLayout';

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
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
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
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
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  // The header menu's second-level items (the cards shown in the mega-menu
  // drawer) carry a `resourceId` whenever they're linked to a real Shopify
  // resource in Admin (see MENU_FRAGMENT in ~/lib/fragments). When that
  // resource is a Collection, fetch its real image here so MenuDrawer can
  // use it instead of falling back to the static SUBMENU_IMAGES map or the
  // generic placeholder icon.
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

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;

  // Defer the footer query (below the fold). Resolves to `{ menu, policiesMenu }` —
  // `menu` carries the footer's column links (handle: footer), and `policiesMenu`
  // carries the flat legal-links row at the bottom (handle: policies), fully
  // editable from Admin > Content > Menus > Store Policy. <Footer> destructures
  // both directly off the resolved value.
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
        policiesMenuHandle: 'policies', // Store Policy menu — Admin > Content > Menus
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
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