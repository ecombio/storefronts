import {Suspense} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {ShoppingBag, User} from 'lucide-react';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {HeaderSearch} from '~/snippets/HeaderSearch';
import {HeaderMenu} from '~/snippets/HeaderMenu';
export {HeaderMenu} from '~/snippets/HeaderMenu';
import {HeaderUtility} from '~/snippets/HeaderUtility';
export {HeaderUtility} from '~/snippets/HeaderUtility';
import {AnnouncementBar} from './AnnouncementBar';
export {AnnouncementBar} from './AnnouncementBar';
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
      <HeaderUtility />
      <div
        data-header-search-row
        className="relative border-b border-gray-100"
      >
        <div className="mx-auto flex max-w-full items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6 lg:max-w-[1200px] lg:gap-6 lg:px-8 lg:pt-2.5 lg:pb-2.5">
          <HeaderMenuMobileToggle />

          <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
            <img src={wordmarkSrc} alt={shop.name} width={140} height={28} className="h-6 w-auto sm:h-7" />
          </NavLink>

          <div className="hidden flex-1 justify-center sm:flex">
            <HeaderSearch />
          </div>

          <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} customer={customer} />
        </div>

        <div className="border-t border-gray-100 px-4 py-2 sm:hidden">
          <HeaderSearch />
        </div>
      </div>

      <div data-header-menu-row className="relative hidden border-b border-gray-100 lg:block">
        <div className="mx-auto flex min-w-0 max-w-full px-6 pt-2.5 pb-2.5 lg:max-w-[1200px] lg:px-8">
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
    <nav className="flex shrink-0 items-center gap-3 sm:gap-6" role="navigation">
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
      className="shrink-0 rounded p-1 text-gray-800 hover:text-gray-950 lg:hidden"
      onClick={() => open('mobile')}
    >
      <span className="text-lg">☰</span>
    </button>
  );
}

function HeaderAccount({
  isLoggedIn,
  customer,
}: {
  isLoggedIn: Promise<boolean>;
  customer?: Promise<{firstName: string | null} | null>;
}) {
  return (
    <NavLink
      prefetch="intent"
      to="/account"
      className="flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-gray-950"
    >
      <Suspense fallback={<AccountContent label="Sign in/ Register" />}>
        <Await
          resolve={isLoggedIn}
          errorElement={<AccountContent label="Sign in/ Register" />}
        >
          {(loggedIn) => {
            if (!loggedIn) {
              return <AccountContent label="Sign in/ Register" />;
            }
            if (!customer) {
              return <AccountContent label="Account" />;
            }
            return (
              <Suspense fallback={<AccountContent label="Account" />}>
                <Await
                  resolve={customer}
                  errorElement={<AccountContent label="Account" />}
                >
                  {(customerData) => (
                    <AccountContent
                      label={
                        customerData?.firstName
                          ? `Hi, ${customerData.firstName}`
                          : 'Account'
                      }
                    />
                  )}
                </Await>
              </Suspense>
            );
          }}
        </Await>
      </Suspense>
    </NavLink>
  );
}

function AccountContent({label}: {label: string}) {
  return (
    <>
      <User size={18} aria-hidden="true" />
      <span className="hidden whitespace-nowrap sm:inline">{label}</span>
    </>
  );
}

function CartBadge({count = 0}: {count?: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <Link
      to="/cart"
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
      className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition hover:text-gray-600"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <span className="relative">
        <ShoppingBag size={17} className="shrink-0" aria-hidden="true" />
        <span
          className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-semibold leading-none text-white"
          aria-hidden="true"
        >
          {count}
        </span>
      </span>
      <span className="hidden sm:inline" aria-hidden="true">
        Cart
      </span>
    </Link>
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