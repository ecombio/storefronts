// app/sections/Header.tsx
import {Suspense, useEffect, useRef, useState} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {Heart, Scale, ShoppingBag, User} from 'lucide-react';
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
import {ACTIVE_HEADER_STYLE, type HeaderStyle, SHOW_WISHLIST_CTA, SHOW_COMPARE_CTA} from '~/config/Header.constants';
import wordmarkSrc from '~/assets/wordmark.svg';
import {useHeaderHeightSync} from '~/hooks/useHeaderHeightSync';
import {type WishlistEntry, WISHLIST_KEY, readWishlist} from '~/lib/wishlist'; // ADDED
import {type CompareEntry, COMPARE_KEY, COMPARE_MAX, readCompareList} from '~/lib/compare'; // ADDED

import type {HeaderLayoutProps} from './header-styles/types';
import {HeaderLayoutLaunchpad} from './header-styles/HeaderLayoutLaunchpad';
import {HeaderLayoutStorefront} from './header-styles/HeaderLayoutStorefront';
import {HeaderLayoutMarketplace} from './header-styles/HeaderLayoutMarketplace';

// Registry of available header arrangements. Adding a new style is
// additive: build HeaderLayoutX.tsx against HeaderLayoutProps, add it
// here, done — nothing else in this file needs to change.
const HEADER_LAYOUTS: Record<HeaderStyle, React.ComponentType<HeaderLayoutProps>> = {
  launchpad: HeaderLayoutLaunchpad,
  storefront: HeaderLayoutStorefront,
  marketplace: HeaderLayoutMarketplace,
};

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
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  // Exposes this header's real height + hidden state to anything
  // outside it (CollectionFilters, CollectionToolbar) via a CSS
  // variable + class on <html>. Does not touch the scroll-direction
  // logic below — that stays exactly as it was.
  useHeaderHeightSync(headerRef, hidden);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function onScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY < 80) {
        setHidden(false);
      } else if (delta > 5) {
        setHidden(true);
      } else if (delta < -5) {
        setHidden(false);
      }

      lastScrollY.current = currentY;
    }

    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const Layout = HEADER_LAYOUTS[ACTIVE_HEADER_STYLE];

  return (
    // NOTE: `sticky` lives on this outer element and this element ONLY.
    // Do not add a `transform`/`translate` class here — combining
    // `position: sticky` with `transform` on the same element forces a
    // compositor layer that can rasterize with a sub-pixel gap at the
    // top edge on non-integer DPI/zoom (Chrome/Safari). That gap shows
    // up as a thin white line above the header at some zoom levels.
    // The hide-on-scroll transform is applied to the inner wrapper
    // below instead, which is a plain in-flow child, not the sticky
    // element itself.
    <header ref={headerRef} className="sticky top-0 z-50 w-full">
      <div
        className={`w-full bg-white font-sans shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-transform duration-300 ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <AnnouncementBar />
        <HeaderUtility />

        <Layout
          logo={
            <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
              <img src={wordmarkSrc} alt={shop.name} width={140} height={28} className="h-6 w-auto sm:h-7" />
            </NavLink>
          }
          menu={
            <HeaderMenu
              menu={menu}
              viewport="desktop"
              primaryDomainUrl={header.shop.primaryDomain.url}
              publicStoreDomain={publicStoreDomain}
              collectionImages={collectionImages}
            />
          }
          search={<HeaderSearch size="compact" />}
          ctas={<HeaderCtas isLoggedIn={isLoggedIn} cart={cart} customer={customer} />}
          mobileToggle={<HeaderMenuMobileToggle />}
          mobileSearch={<HeaderSearch />}
        />
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
      {/* On standby — SHOW_WISHLIST_CTA/SHOW_COMPARE_CTA in
          Header.constants.ts. Component, badge, and localStorage sync
          logic below are untouched; flip the flags to re-enable. */}
      {SHOW_WISHLIST_CTA && <WishlistToggle />}
      {SHOW_COMPARE_CTA && <CompareToggle />}
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

// Text label hidden below `sm` (mobile — icon only, to save space
// next to the hamburger/logo/cart row) and visible at `sm` and up
// (tablet/desktop, where there's room for it).
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

// ─────────────────────────────────────────────────────────────────────────
// Wishlist toggle — ADDED
// Mirrors CartBadge/CartToggle's structure exactly (same icon size,
// badge styling, layout classes), but the data source is different:
// cart count comes from a server-resolved Promise via <Await>, while
// wishlist count is client-only (localStorage via lib/wishlist.ts), so
// it needs a hydration-safe "start at 0, sync in useEffect" pattern —
// starting from a real count on the server render would mismatch what
// the client has in storage. Kept in sync via the in-tab
// `wishlist:updated` CustomEvent (fired by lib/wishlist.ts on every
// toggle), plus the native `storage` event for cross-tab updates.
// ─────────────────────────────────────────────────────────────────────────

function WishlistBadge({count = 0}: {count?: number}) {
  return (
    <Link
      to="/wishlist"
      className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition hover:text-gray-600"
      aria-label={`Wishlist, ${count} item${count === 1 ? '' : 's'}`}
    >
      <span className="relative">
        <Heart size={17} className="shrink-0" aria-hidden="true" />
        <span
          className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-semibold leading-none text-white"
          aria-hidden="true"
        >
          {count}
        </span>
      </span>
      <span className="hidden sm:inline" aria-hidden="true">
        Wishlist
      </span>
    </Link>
  );
}

function WishlistToggle() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readWishlist().length);

    function onWishlistUpdated(e: Event) {
      const detail = (e as CustomEvent<{items: WishlistEntry[]}>).detail;
      setCount(detail?.items?.length ?? readWishlist().length);
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== WISHLIST_KEY) return;
      setCount(readWishlist().length);
    }

    document.addEventListener('wishlist:updated', onWishlistUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('wishlist:updated', onWishlistUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return <WishlistBadge count={count} />;
}

// ─────────────────────────────────────────────────────────────────────────
// Compare toggle — ADDED
// Same structure and sync strategy as WishlistToggle above (client-only
// count, hydration-safe start-at-0, `compare:updated` + `storage` event
// listeners), sourced from lib/compare.ts instead. The one difference:
// compare has a hard cap (COMPARE_MAX), so the badge shows "n/max" via
// aria-label the same way CompareBar's CTA does, giving a sense of
// how close the list is to full without needing to open it.
// ─────────────────────────────────────────────────────────────────────────

function CompareBadge({count = 0}: {count?: number}) {
  return (
    <Link
      to="/compare"
      className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition hover:text-gray-600"
      aria-label={`Compare, ${count} of ${COMPARE_MAX} item${count === 1 ? '' : 's'}`}
    >
      <span className="relative">
        <Scale size={17} className="shrink-0" aria-hidden="true" />
        <span
          className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-semibold leading-none text-white"
          aria-hidden="true"
        >
          {count}
        </span>
      </span>
      <span className="hidden sm:inline" aria-hidden="true">
        Compare
      </span>
    </Link>
  );
}

function CompareToggle() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readCompareList().length);

    function onCompareUpdated(e: Event) {
      const detail = (e as CustomEvent<{items: CompareEntry[]}>).detail;
      setCount(detail?.items?.length ?? readCompareList().length);
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== COMPARE_KEY) return;
      setCount(readCompareList().length);
    }

    document.addEventListener('compare:updated', onCompareUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('compare:updated', onCompareUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return <CompareBadge count={count} />;
}
