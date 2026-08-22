import {Suspense, useEffect, useRef, useState} from 'react';
import {Await, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import {ChevronLeft, ChevronRight, X, User, Search, Mic, ShoppingBag} from 'lucide-react';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {HeaderMenu} from './HeaderMenu';
export {HeaderMenu} from './HeaderMenu';
import {
  LOGO_SRC,
  PROMO_COUNTDOWN_MINUTES,
  PROMO_MESSAGE,
  TRENDING_SEARCH_TERMS,
} from './Header.constants';

export interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

export type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const {shop, menu} = header;
  return (
    <header className="w-full bg-white font-sans">
      <AnnouncementBar />
      <UtilityBar />
      <div className="border-b border-gray-100">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-4">
          <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
            <img src={LOGO_SRC} alt={shop.name} width={140} height={28} />
          </NavLink>

          <SearchBar />

          <HeaderCtas isLoggedIn={isLoggedIn} cart={cart} />
        </div>
      </div>
      <HeaderMenu
        menu={menu}
        viewport="desktop"
        primaryDomainUrl={header.shop.primaryDomain.url}
        publicStoreDomain={publicStoreDomain}
      />
    </header>
  );
}

// Two rotating slides: the shipping message, then a live "evergreen" countdown
// that resets to PROMO_COUNTDOWN_MINUTES for every visitor.
// Maps 1:1 to the live site's "announcement-bar-section".
export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [index, setIndex] = useState(0);
  const slideCount = 2;

  if (!visible) return null;

  return (
    <div className="bg-[#0b2559] text-sm text-white">
      <div className="mx-auto flex max-w-[1400px] items-center px-4 py-2">
        <button
          aria-label="Previous announcement"
          onClick={() => setIndex((i) => (i - 1 + slideCount) % slideCount)}
          className="shrink-0 rounded p-1 hover:bg-white/10"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex flex-1 items-center justify-center gap-2 font-medium tracking-wide">
          {index === 0 ? <span>{PROMO_MESSAGE}</span> : <CountdownSlide />}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label="Next announcement"
            onClick={() => setIndex((i) => (i + 1) % slideCount)}
            className="rounded p-1 hover:bg-white/10"
          >
            <ChevronRight size={16} />
          </button>
          <button
            aria-label="Dismiss"
            onClick={() => setVisible(false)}
            className="rounded p-1 hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CountdownSlide() {
  const endAt = useRef<number>(Date.now() + PROMO_COUNTDOWN_MINUTES * 60_000);
  const [remainingMs, setRemainingMs] = useState(() => endAt.current - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const next = endAt.current - Date.now();
      if (next <= 0) {
        // Evergreen: reset the window and keep counting down.
        endAt.current = Date.now() + PROMO_COUNTDOWN_MINUTES * 60_000;
        setRemainingMs(endAt.current - Date.now());
      } else {
        setRemainingMs(next);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span aria-hidden="true" className="flex items-center gap-1 font-mono">
      <span>{pad(days)}d</span>:<span>{pad(hours)}h</span>:<span>{pad(minutes)}m</span>:
      <span>{pad(seconds)}s</span>
    </span>
  );
}

// Maps 1:1 to the live site's "utility-bar-section".
export function UtilityBar() {
  return (
    <div className="hidden border-b border-gray-100 sm:block">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2 text-sm text-gray-700">
        <nav className="flex items-center gap-6">
          <NavLink to="/apps/track" className="hover:text-gray-950">
            Track Order
          </NavLink>
          <NavLink to="/pages/stores" className="hover:text-gray-950">
            Store Locator
          </NavLink>
          <NavLink to="/apps/track" className="hover:text-gray-950">
            Track Order
          </NavLink>
        </nav>

        <button className="flex items-center gap-1.5 hover:text-gray-950">
          <span aria-hidden="true">🇺🇸</span>
          <span>English (US)</span>
          <ChevronRight size={12} className="rotate-90" />
        </button>
      </div>
    </div>
  );
}

// Types out each trending term, pauses, deletes it, and moves to the next —
// matching the live site's search placeholder animation.
function useTypewriter(terms: string[]) {
  const [text, setText] = useState('');
  const termIndex = useRef(0);
  const charIndex = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    const tick = () => {
      const current = terms[termIndex.current];

      if (!deleting.current) {
        charIndex.current += 1;
        setText(current.slice(0, charIndex.current));
        if (charIndex.current === current.length) {
          deleting.current = true;
          return 1400; // pause before deleting
        }
        return 60;
      } else {
        charIndex.current -= 1;
        setText(current.slice(0, charIndex.current));
        if (charIndex.current === 0) {
          deleting.current = false;
          termIndex.current = (termIndex.current + 1) % terms.length;
        }
        return 30;
      }
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = tick();
      timeoutId = setTimeout(schedule, delay);
    };
    schedule();

    return () => clearTimeout(timeoutId);
  }, [terms]);

  return text;
}

function SearchBar() {
  const {open} = useAside();
  const typedTerm = useTypewriter(TRENDING_SEARCH_TERMS);

  return (
    <div className="flex flex-1 items-center">
      <button
        onClick={() => open('search')}
        className="flex w-full max-w-2xl items-center rounded-full border border-gray-300 pl-4 pr-1.5 text-left hover:border-gray-400"
      >
        <span className="h-10 flex-1 truncate text-sm leading-10 text-gray-500">
          Search for {typedTerm}
          <span aria-hidden="true" className="animate-pulse">|</span>
        </span>
        <span className="mr-1 rounded-full p-1.5 text-gray-500">
          <X size={16} />
        </span>
        <span className="mr-1 rounded-full p-1.5 text-gray-500">
          <Mic size={16} />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-950 text-white">
          <Search size={16} />
        </span>
      </button>
    </div>
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
