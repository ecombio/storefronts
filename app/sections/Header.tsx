// app/sections/Header.tsx
import {Suspense, useEffect, useRef, useState} from 'react';
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
import {useHeaderHeightSync} from '~/hooks/useHeaderHeightSync';

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

        {/*
          Single row (desktop, lg+): logo — centered nav menu — compact
          search + account/cart, mirroring Nike's header where search
          shares a row with the primary nav instead of the menu living
          in its own row underneath. Replaces the previous two-row
          layout (a full-width search row, then a separate menu row).

          Mobile (<lg): unchanged from before — hamburger + logo + cart
          on top, full-width search on its own row below. The nav menu
          itself lives in the mobile drawer (Aside), not inline here,
          same as previously.
        */}
        <div data-header-row className="relative">
          {/* Full width at every breakpoint — no max-width cap, so this
              row always spans the full header bar (matching AnnouncementBar
              and HeaderUtility above it, which were already uncapped).
              `mx-auto` is a no-op with nothing to center against now, but
              left in place in case a max-width is reintroduced later. */}
          <div className="mx-auto flex max-w-full items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
            <HeaderMenuMobileToggle />

            <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
              <img src={wordmarkSrc} alt={shop.name} width={140} height={28} className="h-6 w-auto sm:h-7" />
            </NavLink>

            {/*
              [&>*]:!w-auto forces HeaderMenu's root element to shrink
              to its content instead of stretching to fill this flex-1
              wrapper. Without it, if HeaderMenu's own root renders with
              a `w-full`-style class, `justify-center` has no leftover
              space left to center within — the menu just pins to the
              left edge and its rightmost items collide with whatever
              sits next to it (here, the compact search pill).
              This is a blunt override, not a root-cause fix — the
              real fix belongs in HeaderMenu.tsx's own className. Swap
              this out once that file's been checked/updated.
            */}
            <div className="hidden flex-1 justify-center lg:flex [&>*]:!w-auto">
              <HeaderMenu
                menu={menu}
                viewport="desktop"
                primaryDomainUrl={header.shop.primaryDomain.url}
                publicStoreDomain={publicStoreDomain}
                collectionImages={collectionImages}
              />
            </div>

            {/* Mobile has no centered menu (it lives in the drawer via
                HeaderMenuMobileToggle) — this spacer keeps the same
                logo-left / ctas-right split as desktop. */}
            <div className="flex-1 lg:hidden" />

            <div className="hidden items-center gap-4 lg:flex">
              <HeaderSearch size="compact" />
              <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} customer={customer} />
            </div>

            <div className="lg:hidden">
              <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} customer={customer} />
            </div>
          </div>

          <div className="w-full py-2 lg:hidden">
            <HeaderSearch />
          </div>
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