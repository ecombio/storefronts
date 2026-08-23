import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {Search, Mic, X} from 'lucide-react';
import {TypewriterEffect} from '~/components/ui/typewriter-effect';
import {urlWithTrackingParams, getEmptyPredictiveSearchResult} from '~/lib/search';
import type {PredictiveSearchReturn} from '~/lib/search';
import {useAside} from '~/components/Aside';
import {TRENDING_SEARCH_TERMS} from './Header.constants';

const DEBOUNCE_MS = 150;

// How long to hold on a fully-typed word before remounting into the next
// one. TypewriterEffect types once and stops on mount — cycling it just
// means swapping its `key` on an interval, which forces a clean remount
// (fresh type-in) for the next term in TRENDING_SEARCH_TERMS.
const HOLD_MS = 1800;

/**
 * Cycles the installed Aceternity TypewriterEffect through
 * TRENDING_SEARCH_TERMS, one term at a time, by remounting it with a new
 * key on an interval. TypewriterEffect itself only types a given word
 * list once and stops — this wrapper is what makes it loop.
 */
function CyclingTypewriter({terms}: {terms: string[]}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIndex((i) => (i + 1) % terms.length);
    }, HOLD_MS);
    return () => clearTimeout(timeout);
  }, [index, terms.length]);

  // Per-word className is required — TypewriterEffect hardcodes
  // `text-black dark:text-white` on each character span, so the
  // wrapper's own className never reaches the actual text color.
  const words = [
    {text: 'Search', className: 'text-gray-500 dark:text-gray-500'},
    {text: 'for', className: 'text-gray-500 dark:text-gray-500'},
    {
      text: terms[index % terms.length],
      className: 'text-gray-900 dark:text-gray-900',
    },
  ];

  return (
    <TypewriterEffect
      key={index}
      words={words}
      // The component's default text sizing (text-base sm:text-xl
      // md:text-3xl lg:text-5xl font-bold text-center) is built for a
      // hero, not an inline search placeholder — each breakpoint has
      // to be explicitly overridden since Tailwind-merge only resolves
      // conflicts within the same breakpoint variant.
      className="!text-sm sm:!text-sm md:!text-sm lg:!text-sm !font-normal !text-left"
      // Same story for the cursor: default is h-4 md:h-6 lg:h-10
      // bg-blue-500, sized for large hero text.
      cursorClassName="!h-4 sm:!h-4 md:!h-4 lg:!h-4 !bg-gray-400"
    />
  );
}

/**
 * Minimal predictive-search data hook. Replaces the old
 * SearchFormPredictive + SearchResultsPredictive fetcher.Form machinery
 * with a single debounced fetch against the /search route — same
 * Storefront API `predictiveSearch` data, none of the form/fetcher-key
 * indirection.
 */
function useSearchQuery() {
  const [term, setTerm] = useState('');
  const [result, setResult] = useState<PredictiveSearchReturn['result']>(
    getEmptyPredictiveSearchResult(),
  );
  const [state, setState] = useState<'idle' | 'loading'>('idle');

  useEffect(() => {
    if (!term) {
      setResult(getEmptyPredictiveSearchResult());
      setState('idle');
      return;
    }

    const controller = new AbortController();
    setState('loading');

    const timeout = setTimeout(() => {
      fetch(
        `/search?q=${encodeURIComponent(term)}&limit=5&predictive=true`,
        {signal: controller.signal},
      )
        .then((res) => res.json())
        .then((json: PredictiveSearchReturn) => {
          setResult(json.result ?? getEmptyPredictiveSearchResult());
          setState('idle');
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setState('idle');
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [term]);

  return {term, setTerm, result, state};
}

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const {term, setTerm, result, state} = useSearchQuery();
  const aside = useAside();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openPanel() {
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
  }

  function closeSearch() {
    setTerm('');
    if (inputRef.current) inputRef.current.value = '';
    closePanel();
  }

  function goToSearch() {
    if (!term) return;
    window.location.assign(`/search?q=${encodeURIComponent(term)}`);
    aside.close();
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

  const items = result.items;
  const total = result.total;

  return (
    <div className="flex flex-1 items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => (open ? closePanel() : openPanel())}
        className="flex h-11 w-full max-w-2xl items-center rounded-[14px] border-[1.5px] border-[#e5e3de] bg-white pl-3 pr-[3px] text-left transition-colors focus-within:border-[#2563eb] hover:border-[#d6d3cc]"
      >
        <span
          className="h-full flex-1 truncate text-[15px] leading-[44px] text-[#6b6860]"
          aria-hidden="true"
        >
          <CyclingTypewriter terms={TRENDING_SEARCH_TERMS} />
        </span>
        <span className="sr-only">Search for products</span>
        <span className="mr-0.5 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[#6b6860] transition-colors hover:bg-[#f0ede8] hover:text-[#1a1a1a]">
          <X size={14} strokeWidth={2.5} />
        </span>
        <span className="mr-0.5 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[#6b6860] transition-colors hover:bg-[#f0ede8] hover:text-[#1a1a1a]">
          <Mic size={16} />
        </span>
        <span className="flex h-[38px] w-11 items-center justify-center rounded-[10px] bg-[#1a1a1a] text-white">
          <Search size={18} />
        </span>
      </button>

      <div
        aria-hidden="true"
        onClick={closePanel}
        className={`fixed inset-0 z-[900] bg-black/40 transition-opacity duration-200 ease-out ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

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
          <input
            ref={inputRef}
            type="search"
            name="q"
            autoComplete="off"
            placeholder="Search for products"
            aria-label="Search"
            onChange={(e) => setTerm(e.target.value)}
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
            {!term ? (
              <div className="grid grid-cols-[220px_1fr] gap-10">
                <SuggestionsRail
                  title="Trending searches"
                  terms={TRENDING_SEARCH_TERMS}
                  onSelect={setTerm}
                />
                <div />
              </div>
            ) : state === 'loading' ? (
              <div className="grid grid-cols-[220px_1fr] gap-10">
                <SuggestionsRail
                  title="Trending searches"
                  terms={TRENDING_SEARCH_TERMS}
                  onSelect={setTerm}
                />
                <SearchResultsSkeleton />
              </div>
            ) : !total ? (
              <div className="grid grid-cols-[220px_1fr] gap-10">
                <SuggestionsRail
                  title="Trending searches"
                  terms={TRENDING_SEARCH_TERMS}
                  onSelect={setTerm}
                />
                <p className="text-sm text-gray-500">
                  No results found for <q>{term}</q>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-[220px_1fr] gap-10">
                <SuggestionsRail
                  title="Top suggestions"
                  terms={items.queries
                    .map((q) => q?.text)
                    .filter((t): t is string => Boolean(t))}
                  onSelect={setTerm}
                />

                <div>
                  <div className="grid grid-cols-5 gap-5">
                    {items.products.map((product) => {
                      const productUrl = urlWithTrackingParams({
                        baseUrl: `/products/${product.handle}`,
                        trackingParams: product.trackingParameters,
                        term,
                      });
                      const price =
                        product?.selectedOrFirstAvailableVariant?.price;
                      const compareAtPrice =
                        product?.selectedOrFirstAvailableVariant
                          ?.compareAtPrice;
                      const image =
                        product?.selectedOrFirstAvailableVariant?.image;
                      const onSale =
                        compareAtPrice &&
                        price &&
                        parseFloat(compareAtPrice.amount) >
                          parseFloat(price.amount);

                      return (
                        <Link
                          key={product.id}
                          to={productUrl}
                          onClick={closeSearch}
                          className="group"
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 ring-1 ring-transparent transition group-hover:ring-gray-200">
                            {image && (
                              <Image
                                data={image}
                                alt={product.title}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                                sizes="200px"
                              />
                            )}
                            {onSale && (
                              <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Sale
                              </span>
                            )}
                          </div>
                          <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug text-gray-900 group-hover:text-gray-950">
                            {product.title}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {price && (
                              <small className="text-sm font-semibold text-gray-900">
                                <Money data={price} />
                              </small>
                            )}
                            {onSale && compareAtPrice && (
                              <small className="text-xs text-gray-400 line-through">
                                <Money data={compareAtPrice} />
                              </small>
                            )}
                          </div>
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
                    className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 transition hover:decoration-gray-900"
                  >
                    View all results for &ldquo;{term}&rdquo;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div className="border-r border-gray-100 pr-8">
      <p className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <ul className="space-y-1">
        {terms.map((term) => (
          <li key={term}>
            <button
              type="button"
              onClick={() => onSelect(term)}
              className="-ml-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-950"
            >
              {term}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-5">
      {Array.from({length: 5}).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square w-full rounded-xl bg-gray-100" />
          <div className="mt-2.5 h-3.5 w-4/5 rounded bg-gray-100" />
          <div className="mt-2 h-3.5 w-1/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}