import {Suspense, useEffect, useRef, useState} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {
  Image,
  Money,
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import {User, Search, Mic, ShoppingBag, X} from 'lucide-react';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {SearchFormPredictive} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {urlWithTrackingParams} from '~/lib/search';
import {HeaderMenu} from './HeaderMenu';
export {HeaderMenu} from './HeaderMenu';
import {AnnouncementBar} from './AnnouncementBar';
export {AnnouncementBar} from './AnnouncementBar';
import {UtilityBar} from './UtilityBar';
export {UtilityBar} from './UtilityBar';
import {LOGO_SRC, TRENDING_SEARCH_TERMS, type CollectionImage} from './Header.constants';

export interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  // Keyed by collection resourceId (gid). See the wiring note above
  // MENU_COLLECTION_IMAGES_QUERY in Header.constants.ts.
  collectionImages?: Record<string, CollectionImage>;
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
          SearchBar's dropdown panel — `absolute inset-x-0 top-full`,
          nested deep inside SearchBar — resolve against this full-width
          row as its containing block, so the panel spans the whole page
          width and always sits exactly one row below the header,
          regardless of what's happening elsewhere in the layout. */}
      <div className="relative border-b border-gray-100">
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
        collectionImages={collectionImages}
      />
    </header>
  );
}

// Matches assets/header-section.js's HSTypewriter timing: types each
// character in with a glow-in animation, holds, then deletes each
// character with a vanish animation — rather than the live site's plain
// text-slicing. Each character is its own element (keyed by a stable id)
// so React can animate it in/out individually instead of re-rendering a
// flat string.
const TYPEWRITER_TIMING = {
  typeMs: 22,
  holdMs: 1400,
  deleteMs: 12,
  vanishMs: 260,
  gapMs: 200,
};

interface TypewriterChar {
  id: number;
  char: string;
  vanishing: boolean;
}

function useTypewriter(terms: string[]) {
  const [chars, setChars] = useState<TypewriterChar[]>([]);
  const charsRef = useRef<TypewriterChar[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    let destroyed = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const {typeMs, holdMs, deleteMs, vanishMs, gapMs} = TYPEWRITER_TIMING;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, ms);
      });

    const setAndTrack = (updater: (prev: TypewriterChar[]) => TypewriterChar[]) => {
      setChars((prev) => {
        const next = updater(prev);
        charsRef.current = next;
        return next;
      });
    };

    async function typeTerm(term: string) {
      for (let i = 0; i < term.length; i++) {
        if (destroyed) return;
        const id = nextId.current++;
        setAndTrack((prev) => [...prev, {id, char: term[i], vanishing: false}]);
        await sleep(typeMs);
      }
    }

    async function deleteTerm() {
      const ids = charsRef.current.map((c) => c.id);
      for (let i = ids.length - 1; i >= 0; i--) {
        if (destroyed) return;
        const id = ids[i];
        setAndTrack((prev) =>
          prev.map((c) => (c.id === id ? {...c, vanishing: true} : c)),
        );
        setTimeout(() => {
          if (destroyed) return;
          setAndTrack((prev) => prev.filter((c) => c.id !== id));
        }, vanishMs);
        await sleep(deleteMs);
      }
      // Wait for the last character's vanish animation to actually finish
      // playing before returning — otherwise the next step (the gap, then
      // typing the next term) starts while characters are still mid-fade,
      // and force-clearing here instead would unmount them before the
      // browser ever paints the color transition.
      await sleep(vanishMs);
    }

    async function run() {
      let i = 0;
      while (!destroyed) {
        await typeTerm(terms[i % terms.length]);
        if (destroyed) return;
        await sleep(holdMs);
        if (destroyed) return;
        await deleteTerm();
        if (destroyed) return;
        await sleep(gapMs);
        i++;
      }
    }

    run();

    return () => {
      destroyed = true;
      clearTimeout(timeoutId);
    };
  }, [terms]);

  return chars;
}

// CSS for the per-character glow-in / vanish animation, ported from
// assets/header-section.css's .hs-tw-char / .hs-tw-char--vanish rules.
// Rendered once alongside the search bar since Tailwind has no equivalent
// utility for these keyframes.
function TypewriterStyles() {
  return (
    <style>{`
      .hs-tw-char {
        display: inline-block;
        white-space: pre;
        opacity: 0;
        animation: hs-tw-glow-in 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes hs-tw-glow-in {
        0% {
          opacity: 0;
          transform: translateY(5px);
          filter: blur(3px);
        }
        45% {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
      }
      .hs-tw-char--vanish {
        animation: hs-tw-vanish 260ms ease forwards;
      }
      @keyframes hs-tw-vanish {
        0%   { color: #2563eb; opacity: 1; transform: translateY(0); }
        40%  { color: #9333ea; opacity: 1; }
        70%  { color: #dc2626; opacity: 1; }
        100% { color: #dc2626; opacity: 0; transform: translateY(2px); }
      }
      @media (prefers-reduced-motion: reduce) {
        .hs-tw-char, .hs-tw-char--vanish { animation: none; opacity: 1; }
      }
    `}</style>
  );
}

function SearchBar() {
  const typedChars = useTypewriter(TRENDING_SEARCH_TERMS);

  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openPanel() {
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        closePanel();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closePanel();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex flex-1 items-center">
      <TypewriterStyles />
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => (open ? closePanel() : openPanel())}
        className="flex w-full max-w-2xl items-center rounded-full border border-gray-300 pl-4 pr-1.5 text-left hover:border-gray-400"
      >
        <span className="h-10 flex-1 truncate text-sm leading-10 text-gray-500" aria-hidden="true">
          Search for{' '}
          {typedChars.map(({id, char, vanishing}) => (
            <span key={id} className={vanishing ? 'hs-tw-char hs-tw-char--vanish' : 'hs-tw-char'}>
              {char}
            </span>
          ))}
        </span>
        <span className="sr-only">Search</span>
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

      {/* Backdrop — dims the page behind the panel. Fixed positioning
          escapes the header's normal flow on its own (no portal needed)
          since nothing above it creates a containing block. */}
      <div
        aria-hidden="true"
        onClick={closePanel}
        className={`fixed inset-0 z-[900] bg-black/40 transition-opacity duration-200 ease-out ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Panel — CSS-anchored via `absolute top-full`, resolving against
          the `relative` row in Header.tsx as its containing block
          (nothing between here and there sets a position), instead of a
          JS-measured `top` value. This means the panel is *always*
          exactly one row below the search bar, no matter what the
          countdown timer, images, or menu do to page layout — it can't
          drift the way the old getBoundingClientRect + fixed-position
          approach could. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className={`absolute inset-x-0 top-full z-[901] origin-top border-b border-gray-200 bg-white shadow-2xl transition-all duration-200 ease-out ${
          open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-4 py-6">
                <SearchFormPredictive>
                  {({fetchResults, goToSearch, inputRef: predictiveInputRef}) => {
                    const runSearch = (value: string) => {
                      if (inputRef.current) {
                        inputRef.current.value = value;
                      }
                      fetchResults({
                        target: {value},
                      } as React.ChangeEvent<HTMLInputElement>);
                    };

                    return (
                      <>
                        <input
                          ref={(node) => {
                            // Feed the DOM node to both SearchFormPredictive's
                            // ref (so its fetcher submissions work) and our
                            // own local ref (used for focus-on-open, the
                            // outside-click check, etc).
                            predictiveInputRef.current = node;
                            inputRef.current = node;
                          }}
                          type="search"
                          name="q"
                          autoComplete="off"
                          placeholder="Search for products"
                          aria-label="Search"
                          onChange={fetchResults}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              goToSearch();
                              closePanel();
                            }
                          }}
                          className="h-11 w-full max-w-2xl rounded-full border border-gray-300 px-4 text-sm outline-none focus:border-gray-900"
                        />

                        <div className="mt-6">
                          <SearchResultsPredictive>
                            {({items, total, term, state}) => {
                              const closeSearch = () => {
                                if (inputRef.current) {
                                  inputRef.current.value = '';
                                  inputRef.current.blur();
                                }
                                closePanel();
                              };

                              // Pre-query state: just the suggestions rail,
                              // like the reference sites' empty-state panel.
                              if (!term.current) {
                                return (
                                  <div className="grid grid-cols-[220px_1fr] gap-10">
                                    <SuggestionsRail
                                      title="Trending searches"
                                      terms={TRENDING_SEARCH_TERMS}
                                      onSelect={runSearch}
                                    />
                                    <div />
                                  </div>
                                );
                              }

                              if (state === 'loading') {
                                return (
                                  <div className="grid grid-cols-[220px_1fr] gap-10">
                                    <SuggestionsRail
                                      title="Trending searches"
                                      terms={TRENDING_SEARCH_TERMS}
                                      onSelect={runSearch}
                                    />
                                    <p className="text-sm text-gray-500">
                                      Searching…
                                    </p>
                                  </div>
                                );
                              }

                              if (!total) {
                                return (
                                  <div className="grid grid-cols-[220px_1fr] gap-10">
                                    <SuggestionsRail
                                      title="Trending searches"
                                      terms={TRENDING_SEARCH_TERMS}
                                      onSelect={runSearch}
                                    />
                                    <SearchResultsPredictive.Empty term={term} />
                                  </div>
                                );
                              }

                              // Active-query state: query suggestions on the
                              // left, product grid filling the right — same
                              // shape as the Nike reference.
                              return (
                                <div className="grid grid-cols-[220px_1fr] gap-10">
                                  <SuggestionsRail
                                    title="Top suggestions"
                                    terms={items.queries
                                      .map((q) => q?.text)
                                      .filter((t): t is string => Boolean(t))}
                                    onSelect={runSearch}
                                  />

                                  <div>
                                    <div className="grid grid-cols-5 gap-4">
                                      {items.products.map((product) => {
                                        const productUrl = urlWithTrackingParams({
                                          baseUrl: `/products/${product.handle}`,
                                          trackingParams:
                                            product.trackingParameters,
                                          term: term.current,
                                        });
                                        const price =
                                          product?.selectedOrFirstAvailableVariant
                                            ?.price;
                                        const image =
                                          product?.selectedOrFirstAvailableVariant
                                            ?.image;

                                        return (
                                          <Link
                                            key={product.id}
                                            to={productUrl}
                                            onClick={closeSearch}
                                            className="group"
                                          >
                                            <div className="aspect-square w-full overflow-hidden rounded bg-gray-100">
                                              {image && (
                                                <Image
                                                  data={image}
                                                  alt={product.title}
                                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                                  sizes="200px"
                                                />
                                              )}
                                            </div>
                                            <p className="mt-2 text-sm font-medium text-gray-900">
                                              {product.title}
                                            </p>
                                            {price && (
                                              <small className="text-sm text-gray-700">
                                                <Money data={price} />
                                              </small>
                                            )}
                                          </Link>
                                        );
                                      })}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        goToSearch();
                                        closePanel();
                                      }}
                                      className="mt-6 text-sm font-medium text-gray-900 underline"
                                    >
                                      View all results for &ldquo;{term.current}&rdquo;
                                    </button>
                                  </div>
                                </div>
                              );
                            }}
                          </SearchResultsPredictive>
                        </div>
                      </>
                    );
                  }}
                </SearchFormPredictive>
              </div>
      </div>
    </div>
  );
}

/**
 * Left-hand suggestions rail used in both the pre-query (trending searches)
 * and active-query (top suggestions) states of the search panel — mirrors
 * the vertical text-link list in the Nike / Gymshark reference designs,
 * rather than the wrapped pill list this used to render.
 */
function SuggestionsRail({
  title,
  terms,
  onSelect,
}: {
  title: string;
  terms: string[];
  onSelect: (term: string) => void;
}) {
  if (!terms.length) return null;

  return (
    <div>
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <ul className="space-y-2.5">
        {terms.map((term) => (
          <li key={term}>
            <button
              type="button"
              onClick={() => onSelect(term)}
              className="text-left text-sm text-gray-700 hover:text-gray-950 hover:underline"
            >
              {term}
            </button>
          </li>
        ))}
      </ul>
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