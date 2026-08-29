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
  /**
   * Optional — resolves to the logged-in customer's display-name info
   * (or null if signed out), used by HeaderAccount to render "Hi,
   * <firstName>" instead of a generic "Account" label. Not required:
   * if you haven't added a customer-name query to whatever loader
   * produces `isLoggedIn` (commonly root.tsx), just omit this and
   * HeaderAccount falls back to "Account" gracefully. See the WIRING
   * NOTE in ~/snippets/HeaderAccount.tsx for what that query needs to
   * return.
   */
  customer?: Promise<{firstName: string | null} | null>;
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
  customer,
}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="w-full bg-white font-sans">
      <AnnouncementBar />
      <UtilityBar />
      {/* Top row: logo, search, and the account/cart CTAs.
          Back-Market-style layout: logo pinned left, search bar fills
          the remaining space in the middle (flex-1, capped by
          max-w-2xl on SearchBar's own className so it doesn't run
          edge-to-edge on very wide screens), CTAs pinned right. This
          replaces the earlier `ml-auto` treatment that bundled search
          in with the CTAs as a small, right-aligned, min-w-[220px]
          element — that read as a narrow afterthought rather than a
          primary piece of header real estate.
          `relative` here (not on any inner element) is still what
          makes HeaderSearch's dropdown panel — `absolute inset-x-0
          top-full`, nested deep inside it — resolve against this full-
          width row as its containing block, so the panel spans the
          whole page width and sits exactly one row below the header.
          `data-header-search-row` still marks this exact row (logo +
          search + ctas) for the same reason as before. */}
      <div
        data-header-search-row
        className="relative border-b border-gray-100"
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3">
          <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
            <img src={wordmarkSrc} alt={shop.name} width={140} height={28} />
          </NavLink>

          {/* Search takes the row's remaining space and grows toward
              max-w-2xl (set on SearchBar's own className inside
              HeaderSearch) rather than being capped at a fixed
              min-w. `justify-center` keeps it centered in that space
              rather than hugging the logo, matching the reference
              layout. */}
          <div className="flex flex-1 justify-center">
            <HeaderSearch />
          </div>

          <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} customer={customer} />
        </div>
      </div>

      {/* Second row: nav menu, below the logo/search/CTA row.
          `data-header-menu-row` marks this row so HeaderMenu's
          mega-menu drawer can position itself off *this* row's
          bottom edge (not data-header-search-row above — that row no
          longer contains the nav, so its bottom is the wrong edge to
          hang the drawer from now). `relative` is required here too:
          MenuDrawer's DrawerPanel is `absolute inset-x-0 top-full`
          and needs a positioned ancestor to resolve against, same
          reasoning as data-header-search-row above for
          HeaderSearch's dropdown — without it, DrawerPanel positions
          against the nearest positioned ancestor further up the
          tree (or the viewport), breaking both its width and its
          vertical offset.

          NOTE: intentionally no `justify-center` on the inner row
          here (there used to be one). HeaderMenu's <nav> is now
          horizontally scrollable (overflow-x-auto) so a menu wider
          than the viewport can be scrolled through instead of
          overflowing or getting clipped — see the comment above the
          <nav> in HeaderMenu.tsx. Centering a scrollable flex item
          fights with that: a centered item that's wider than its
          container gets its overflow split evenly on both sides
          instead of starting flush at the left edge, which makes the
          scroll position ambiguous and the edge-fade hints
          (hasScrollLeft/hasScrollRight) unreliable. `min-w-0` is kept
          on the wrapper for the same reason it's needed on the <nav>
          itself: without it, a flex item's default `min-width: auto`
          refuses to shrink below its content's natural width. */}
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