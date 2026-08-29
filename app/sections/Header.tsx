import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {HeaderSearch} from '~/snippets/HeaderSearch';
import {HeaderAccount} from '~/snippets/HeaderAccount';
import {HeaderCart} from '~/snippets/HeaderCart';
import {HeaderMenu} from '~/snippets/HeaderMenu';
export {HeaderMenu} from '~/snippets/HeaderMenu';
import {AnnouncementBar} from './AnnouncementBar';
export {AnnouncementBar} from './AnnouncementBar';
import {UtilityBar} from './UtilityBar';
export {UtilityBar} from './UtilityBar';
import type {CollectionImage} from '~/config/Header.constants';
import wordmarkSrc from '~/assets/wordmark.svg';

export interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  // Keyed by collection resourceId (gid). See the wiring note above
  // MENU_COLLECTION_IMAGES_QUERY in Header.constants.ts.
  collectionImages?: Record<string, CollectionImage>;
  // NOTE: `algolia` config used to be threaded through here down to
  // HeaderSearch/SearchPanel. Predictive search now hits
  // /api/predictive-search (Shopify Storefront API) internally, so it's
  // no longer needed as a prop. If nothing else in the app still reads
  // an `algolia` config object, it's safe to remove `~/lib/algolia.ts`
  // and its callers (e.g. wherever this used to be built in root.tsx).
}

export type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
  collectionImages,
}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="w-full bg-white font-sans">
      <AnnouncementBar />
      <UtilityBar />
      {/* Single-row layout: logo, nav links, search, and the account/
          cart CTAs all sit in one flex row now — the nav links no
          longer live in their own bordered row underneath.
          `relative` here (not on any inner element) is still what
          makes HeaderSearch's dropdown panel — `absolute inset-x-0
          top-full`, nested deep inside it — resolve against this full-
          width row as its containing block, so the panel spans the
          whole page width and sits exactly one row below the header,
          regardless of what else is in this row now.
          `data-header-search-row` still marks this exact row (logo +
          nav + search + ctas) for the same reason as before. */}
      <div
        data-header-search-row
        className="relative border-b border-gray-100"
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3">
          <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
            <img src={wordmarkSrc} alt={shop.name} width={140} height={28} />
          </NavLink>

          <HeaderMenu
            menu={menu}
            viewport="desktop"
            primaryDomainUrl={header.shop.primaryDomain.url}
            publicStoreDomain={publicStoreDomain}
            collectionImages={collectionImages}
          />

          <HeaderSearch />

          <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
        </div>
      </div>
    </header>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav className="flex shrink-0 items-center gap-6" role="navigation">
      <HeaderMenuMobileToggle />
      <HeaderAccount isLoggedIn={isLoggedIn} />
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      aria-label="Open menu"
      className="rounded p-1 text-gray-800 hover:text-gray-950 sm:hidden"
      onClick={() => open('mobile')}
    >
      <span className="text-lg">☰</span>
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <HeaderCart
      count={count}
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    />
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}
