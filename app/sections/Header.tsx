// app/sections/Header.tsx
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
  collectionImages?: Record<string, CollectionImage>;
  customer?: Promise<{firstName: string | null} | null>;
}

export type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
  collectionImages,
  customer,
}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="w-full bg-white font-sans shadow-[0_4px_20px_rgba(0,0,0,0.10)]">
      <AnnouncementBar />
      <UtilityBar />
      <div
        data-header-search-row
        className="relative border-b border-gray-100"
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3">
          <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
            <img src={wordmarkSrc} alt={shop.name} width={140} height={28} />
          </NavLink>

          <div className="flex flex-1 justify-center">
            <HeaderSearch />
          </div>

          <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} customer={customer} />
        </div>
      </div>

      <div data-header-menu-row className="relative border-b border-gray-100">
        <div className="mx-auto flex min-w-0 max-w-[1400px] px-4 py-2">
          <HeaderMenu
            menu={menu}
            viewport="desktop"
            primaryDomainUrl={header.shop.primaryDomain.url}
            publicStoreDomain={publicStoreDomain}
            collectionImages={collectionImages}
          />
        </div>
      </div>
    </header>
  );
}

function HeaderCtas({
  isLoggedIn,
  cart,
  customer,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart' | 'customer'>) {
  return (
    <nav className="flex shrink-0 items-center gap-6" role="navigation">
      <HeaderMenuMobileToggle />
      <HeaderAccount isLoggedIn={isLoggedIn} customer={customer} />
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