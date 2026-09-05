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
import themeStyles from '~/assets/theme.css?url';
import highlightStyles from '~/assets/highlight.css?url';
import mainProductStyles from '~/assets/main-product.css?url';
import breadcrumbsStyles from '~/assets/breadcrumbs.css?url';
import productDescriptionStyles from '~/assets/product-description.css?url';
import customerReviewsStyles from '~/assets/customer-reviews.css?url';
import starRatingStyles from '~/assets/star-rating.css?url';
import productCardStyles from '~/assets/product-card.css?url';
import productSectionsStyles from '~/components/blogs/product-sections.css?url'; // grid/gallery/focus/text layout for ProductSections.tsx shoppable embeds; loads after productCardStyles so its [data-columns] rules can lay out the cards it styles
import productCarouselStyles from '~/assets/product-carousel.css?url';
import promoCarouselStyles from '~/assets/promo-carousel.css?url'; // ADDED — was missing entirely; PromoCarousel.tsx rendered with no styles applied
import promoCardStyles from '~/assets/promo-card.css?url'; // ADDED — panel styles split out of promo-carousel.css alongside the PromoCard.tsx/PromoCarousel.tsx component split
import promoBannerStyles from '~/assets/promo-banner.css?url'; // ADDED — was missing entirely; PromoBanner.tsx rendered with no styles applied (no split/full-bleed/minimal layout, no responsive stacking, and no min-width: 0 grid containment on products-grid__banner-item — same class of bug promo-carousel.css had below)
import collectionCardStyles from '~/assets/collection-card.css?url';
import collectionCarouselStyles from '~/assets/collection-carousel.css?url';
import imageCardStyles from '~/assets/image-card.css?url';
import imageCarouselStyles from '~/assets/image-carousel.css?url';
import slideshowStyles from '~/assets/slideshow.css?url';
import mainCollectionStyles from '~/assets/main-collection.css?url';
import paginationStyles from '~/assets/pagination.css?url'; // ADDED — was missing entirely; PaginationSection's Load More button/observer wrapper (pagination__load-more, pagination__load-more-btn--*) had no styles linked anywhere. Used by CollectionFeed, collections.all, and (after the PaginatedResourceSection/LoadMoreTrigger consolidation) blogs.$blogHandle.tagged.$tag, blogs._index, collections._index, and account.orders._index. Loads after mainCollectionStyles since it's the more generic/shared stylesheet of the two.
import stickyHeaderStyles from '~/assets/sticky-header.css?url';
import articleCardStyles from '~/assets/article-card.css?url';
import articleTocStyles from '~/components/blogs/TableOfContents.css?url'; // ADDED — table-of-contents sidebar/collapsible layout for blog articles; loads after articleCardStyles, the other article-scoped stylesheet
// newsletter-form.css was removed from here (previously global, on the
// reasoning that data-newsletter-form might appear outside blog
// articles). It moved to blogs.$blogHandle.$articleHandle.tsx's
// route-scoped links() instead — see that file for the current
// reasoning — since in practice the marker is only ever authored
// inside a blog article body, matching blog-button.css/quote.css's
// scoping.
import subCollectionStyles from '~/assets/sub-collection.css?url';
import collectionAfterItemsStyles from '~/assets/collection-after-items.css?url';
import cartDrawerStyles from '~/assets/cart-drawer.css?url';
import quickviewStyles from '~/assets/quickview.css?url'; // ADDED — must load after cartDrawerStyles so the [data-type='quickview'] overrides win
import compareBarStyles from '~/assets/compare-bar.css?url'; // ADDED
import comparePageStyles from '~/assets/compare-page.css?url'; // ADDED
import wishlistPageStyles from '~/assets/wishlist-page.css?url'; // ADDED — /wishlist page still needs this; wishlist-bar.css removed along with WishlistBar
import searchAlgoliaStyles from '~/assets/search-algolia.css?url'; // ADDED — styles the /search page's Algolia InstantSearch layout (search-page, search-layout, search-facets, product-hit, etc.)
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

  const header = await storefront
    .query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu',
      },
    })
    .catch((error: Error) => {
      console.error(error);
      return {menu: null, shop: null} as unknown as Awaited<ReturnType<typeof storefront.query<typeof HEADER_QUERY>>>;
    });

  const collectionImages = await loadMenuCollectionImages(storefront, header.menu).catch(
    (error: Error) => {
      console.error(error);
      return {};
    },
  );

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

  const data = await storefront
    .query(MENU_COLLECTION_IMAGES_QUERY, {
      cache: storefront.CacheLong(),
      variables: {ids: collectionIds},
    })
    .catch((error: Error) => {
      console.error('MENU_COLLECTION_IMAGES_QUERY failed:', error);
      return {nodes: []};
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
        <link rel="stylesheet" href={themeStyles}></link>
        <link rel="stylesheet" href={highlightStyles}></link>
        <link rel="stylesheet" href={mainProductStyles}></link>
        <link rel="stylesheet" href={breadcrumbsStyles}></link>
        <link rel="stylesheet" href={productDescriptionStyles}></link>
        <link rel="stylesheet" href={customerReviewsStyles}></link>
        <link rel="stylesheet" href={starRatingStyles}></link>
        <link rel="stylesheet" href={productCardStyles}></link>
        <link rel="stylesheet" href={productSectionsStyles}></link>
        <link rel="stylesheet" href={productCarouselStyles}></link>
        <link rel="stylesheet" href={promoCarouselStyles}></link>
        {/* ADDED — was missing entirely; this is why PromoCarousel had no layout/styling */}
        <link rel="stylesheet" href={promoCardStyles}></link>
        {/* ADDED — panel styles split out alongside the PromoCard.tsx component split */}
        <link rel="stylesheet" href={promoBannerStyles}></link>
        {/* ADDED — was missing entirely; this is why PromoBanner had no layout/styling
            (all 4 variants unstyled, no responsive stacking, and no min-width: 0
            grid containment on products-grid__banner-item) */}
        <link rel="stylesheet" href={collectionCardStyles}></link>
        <link rel="stylesheet" href={collectionCarouselStyles}></link>
        <link rel="stylesheet" href={imageCardStyles}></link>
        <link rel="stylesheet" href={imageCarouselStyles}></link>
        <link rel="stylesheet" href={slideshowStyles}></link>
        <link rel="stylesheet" href={mainCollectionStyles}></link>
        <link rel="stylesheet" href={paginationStyles}></link>
        {/* ADDED — styles PaginationSection's Load More button/observer
            wrapper (app/components/pagination.tsx). PaginatedResourceSection
            and LoadMoreTrigger have been removed; every pagination surface
            in the app now goes through PaginationSection and needs this. */}
        <link rel="stylesheet" href={stickyHeaderStyles}></link>
        <link rel="stylesheet" href={articleCardStyles}></link>
        {/* ADDED — table-of-contents sidebar/collapsible layout for blog articles */}
        <link rel="stylesheet" href={articleTocStyles}></link>
        {/* newsletter-form.css link removed — now route-scoped in
            blogs.$blogHandle.$articleHandle.tsx's links() instead of
            loaded globally here */}
        <link rel="stylesheet" href={subCollectionStyles}></link>
        <link rel="stylesheet" href={collectionAfterItemsStyles}></link>
        <link rel="stylesheet" href={cartDrawerStyles}></link>
        <link rel="stylesheet" href={quickviewStyles}></link>
        {/* ADDED — must render after cartDrawerStyles for override specificity/order */}
        <link rel="stylesheet" href={compareBarStyles}></link>
        <link rel="stylesheet" href={comparePageStyles}></link>
        {/* wishlist-bar.css link removed along with WishlistBar; the
            /wishlist page's own stylesheet stays */}
        <link rel="stylesheet" href={wishlistPageStyles}></link>
        {/* ADDED — /search page's Algolia InstantSearch layout styles */}
        <link rel="stylesheet" href={searchAlgoliaStyles}></link>
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
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data ?? 'Unknown error';
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