import {Suspense} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import {User, ShoppingBag} from 'lucide-react';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {HeaderSearch} from '~/components/HeaderSearch';
import {HeaderMenu} from './HeaderMenu';
export {HeaderMenu} from './HeaderMenu';
import {AnnouncementBar} from './AnnouncementBar';
export {AnnouncementBar} from './AnnouncementBar';
import {UtilityBar} from './UtilityBar';
export {UtilityBar} from './UtilityBar';
import type {CollectionImage} from './Header.constants';
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
      {/* `relative` here (not on any inner element) is what makes
          HeaderSearch's dropdown panel — `absolute inset-x-0 top-full`,
          nested deep inside it — resolve against this full-width row as
          its containing block, so the panel spans the whole page width
          and always sits exactly one row below the header, regardless
          of what's happening elsewhere in the layout.
          `data-header-search-row` marks exactly this row (logo + search
          + ctas). SearchPanel no longer measures this for its own
          top offset (it's a full-viewport overlay now), but the marker
          is left in place in case it's needed again later. */}
      <div
        data-header-search-row
        className="relative border-b border-gray-100"
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-4">
          <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
            <img src={wordmarkSrc} alt={shop.name} width={140} height={28} />
          </NavLink>

          <HeaderSearch />

          <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
        </div>
      </div>
      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
        collectionImages={collectionImages}
      />
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
      <NavLink
        prefetch="intent"
        to="/account"
        className="hidden items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-gray-950 sm:flex"
      >
        <User size={18} />
        <Suspense fallback="Sign in/ Register">
          <Await resolve={isLoggedIn} errorElement="Sign in/ Register">
            {(isLoggedIn) => (isLoggedIn ? 'Account' : 'Sign in/ Register')}
          </Await>
        </Suspense>
      </NavLink>
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
    <a
      href="/cart"
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
      className="flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-gray-950"
    >
      <span className="relative">
        <ShoppingBag size={20} />
        <span
          aria-label={`Items in cart: ${count}`}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-950 text-[10px] font-semibold text-white"
        >
          {count}
        </span>
      </span>
      <span className="hidden sm:inline">Cart</span>
    </a>
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