import {useEffect, useRef, useState} from 'react';
import {Link, useFetcher} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {urlWithTrackingParams, getEmptyPredictiveSearchResult} from '~/lib/search';
import type {PredictiveSearchReturn} from '~/lib/search';
import {TRENDING_SEARCH_TERMS} from './Header.constants';

const DEBOUNCE_MS = 150;

/**
 * Minimal predictive-search data hook. Debounced submit against the
 * /search route via useFetcher — same Storefront API `predictiveSearch`
 * data the old SearchFormPredictive + SearchResultsPredictive pair used.
 *
 * IMPORTANT: this must go through useFetcher, not a raw fetch(). A plain
 * `fetch('/search?...')` hits the route the same way a browser navigation
 * would and gets back the full rendered HTML document — not the loader's
 * JSON — because React Router v7 only serializes loader data through its
 * own data-fetching protocol (used internally by useFetcher/useLoaderData).
 * res.json() on that HTML silently throws, which was being swallowed by
 * the catch block below and made every search look like "no results."
 */
function useSearchQuery(active: boolean) {
  const fetcher = useFetcher<PredictiveSearchReturn>({key: 'search'});
  const [term, setTerm] = useState('');

  useEffect(() => {
    if (!active || !term) return;

    const timeout = setTimeout(() => {
      void fetcher.submit(
        {q: term, limit: '5', predictive: 'true'},
        {method: 'GET', action: '/search'},
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // fetcher identity is stable across renders (keyed), safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, active]);

  const result = term
    ? (fetcher.data?.result ?? getEmptyPredictiveSearchResult())
    : getEmptyPredictiveSearchResult();
  const state = fetcher.state === 'loading' ? 'loading' : 'idle';

  return {term, setTerm, result, state};
}

export function SearchOverlay({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}) {
  const {term, setTerm, result, state} = useSearchQuery(open);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function closeSearch() {
    setTerm('');
    if (inputRef.current) inputRef.current.value = '';
    onClose();
  }

  function goToSearch() {
    if (!term) return;
    window.location.assign(`/search?q=${encodeURIComponent(term)}`);
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
        onClose();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, triggerRef]);

  const items = result.items;
  const total = result.total;

  return (
    <>
      {/*
        Nike-style full takeover: both the backdrop and the panel are
        anchored to the true viewport top (top-0), not the header's
        measured bottom edge. This means the overlay now visually
        covers the ENTIRE page — including the header itself (logo,
        nav, sign-in, cart) — the same way nike.com's search dims
        literally everything except the search panel. The header no
        longer pokes out above a panel that starts below it.

        z-index is set above the header's own stacking context (the
        header itself sits at a lower z-index than z-[900]/[901] below)
        so the dimmed backdrop visually sits on top of it once open.
      */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[900] bg-black/40 transition-opacity duration-200 ease-out ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className={`fixed inset-x-0 top-0 z-[901] grid max-h-screen overflow-y-auto border-b border-gray-200 bg-white shadow-2xl transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'pointer-events-none grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
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
                onClose();
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
                <TrendingCategoriesPlaceholder
                  terms={TRENDING_SEARCH_TERMS}
                  onSelect={setTerm}
                />
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
                      onClose();
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
    </>
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

/**
 * Fills the right column of the empty (no-query) state, which previously
 * rendered a bare `<div />`. Swap this out for real featured/trending
 * products once there's a query or fetcher wired up for them — this is
 * just enough so the panel isn't visually empty on first open.
 */
function TrendingCategoriesPlaceholder({
  terms,
  onSelect,
}: {
  terms: string[];
  onSelect: (term: string) => void;
}) {
  return (
    <div>
      <p className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
        Popular categories
      </p>
      <div className="grid grid-cols-3 gap-3">
        {terms.slice(0, 6).map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect(term)}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-left text-sm font-medium text-gray-800 transition hover:border-gray-200 hover:bg-gray-100"
          >
            {term}
          </button>
        ))}
      </div>
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