// app/sections/SearchPanel.tsx

import {useEffect, useRef, useState, useCallback} from 'react';
import {createPortal} from 'react-dom';
import {Link, useFetcher} from 'react-router';
import {
  X,
  RotateCcw,
  Search,
  Tag,
  LayoutGrid,
  Info,
  Heart,
  ArrowUpLeft,
  ImageOff,
} from 'lucide-react';
import {TRENDING_SEARCH_TERMS} from '~/config/Header.constants';
import {SearchBar} from '~/snippets/SearchBar';

// Matches the shape returned by the /api/predictive-search route loader
// (app/routes/api.predictive-search.tsx), which wraps Shopify's
// Storefront API predictiveSearch query.
type PredictiveSearchHit = {
  objectID: string;
  title: string;
  handle: string;
  image_url: string | null;
  price: number | null;
  compare_at_price: number | null;
  is_eco: boolean;
  /**
   * Per-product vendor, shown as the small "BRAND" label above the
   * title. Optional/nullable because it requires api.predictive-search.tsx
   * to include `vendor` on each hit — see the patch note alongside this
   * file if it isn't wired up yet.
   */
  vendor?: string | null;
};

type PredictiveCollection = {
  id: string;
  title: string;
  handle: string;
  image_url: string | null;
};

type PredictiveArticle = {
  id: string;
  title: string;
  handle: string;
  blog_handle: string;
  image_url: string | null;
  published_at: string;
};

type PredictivePage = {
  id: string;
  title: string;
  handle: string;
};

type PredictiveSearchResponse = {
  hits: PredictiveSearchHit[];
  querySuggestions: string[];
  vendors: string[];
  collections: PredictiveCollection[];
  articles: PredictiveArticle[];
  pages: PredictivePage[];
  error?: string;
};

const RECENT_SEARCHES_KEY = 'ecombio:recent-searches';
export const MAX_RECENT_SEARCHES = 5;

function formatMoney(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  // TODO: swap 'USD' for the shop's actual currency (e.g. from context)
  // if you sell in multiple currencies/locales.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Bolds the first occurrence of `query` inside `text` (case-insensitive).
 * Mirrors the reference design's match-highlighting in the suggestions
 * rail so it's visually obvious why a given suggestion surfaced.
 */
function HighlightedText({text, query}: {text: string; query: string}) {
  const q = query.trim();
  if (!q) return <span>{text}</span>;

  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <span>{text}</span>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <span>
      {before}
      <span className="font-bold text-gray-950">{match}</span>
      {after}
    </span>
  );
}

// Exported so HeaderSearch (which now owns the "commit a search" flow)
// can read/write the same localStorage-backed recent-searches list
// without duplicating this logic in two files.
export function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeRecentSearches(terms: string[]) {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch {
    // Storage can fail (private browsing, quota) — recent searches are a
    // nice-to-have, so just skip persisting rather than throwing.
  }
}

export function SearchPanel({
  open,
  onClose,
  triggerRef,
  term,
  onTermChange,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  // AiSearchBar forwards a ref to its root <div>, not a <button> — this
  // is only used for "is the click/focus still inside the trigger"
  // checks below, so any element ref works.
  triggerRef: React.RefObject<HTMLElement>;
  /** Current search term — now owned by HeaderSearch via AiSearchBar. */
  term: string;
  /** Called when a suggestion/recent-search chip is clicked. */
  onTermChange: (value: string) => void;
  /** Called to commit a search (Enter, "See all results", a chip). */
  onNavigate: (value: string) => void;
}) {
  const fetcher = useFetcher<PredictiveSearchResponse>();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (open) setRecentSearches(readRecentSearches());
  }, [open]);

  // Debounce: wait 250ms after the user stops typing before hitting the
  // predictive-search route. Clearing the timeout on every keystroke
  // means only the last keystroke in a burst actually fires a request.
  useEffect(() => {
    if (!term) return;
    const timeout = setTimeout(() => {
      fetcher.load(`/api/predictive-search?q=${encodeURIComponent(term)}`);
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const hits: PredictiveSearchHit[] = term ? fetcher.data?.hits ?? [] : [];
  const querySuggestions = term ? fetcher.data?.querySuggestions ?? [] : [];
  const vendors = term ? fetcher.data?.vendors ?? [] : [];
  const collections = term ? fetcher.data?.collections ?? [] : [];
  const articles = term ? fetcher.data?.articles ?? [] : [];
  const pages = term ? fetcher.data?.pages ?? [] : [];
  const error = fetcher.data?.error ?? null;
  const state: 'idle' | 'loading' =
    term && (fetcher.state === 'loading' || fetcher.state === 'submitting')
      ? 'loading'
      : 'idle';

  const matchingRecent = term
    ? recentSearches.filter((r) =>
        r.toLowerCase().includes(term.toLowerCase()),
      )
    : [];

  const hasSuggestions =
    matchingRecent.length > 0 ||
    querySuggestions.length > 0 ||
    vendors.length > 0 ||
    collections.length > 0 ||
    pages.length > 0;

  // Primary matched collection, shown inline next to the "Products"
  // label (e.g. "Products In Gloves") the way the reference design
  // shows the active category next to the section header.
  const primaryCollection = collections[0] ?? null;

  const panelRef = useRef<HTMLDivElement>(null);
  // The panel's own copy of the search input. This is the visible bar
  // while the panel is open — the header's SearchBar (in HeaderSearch)
  // sits underneath the panel and is hidden once it slides over it, so
  // this is what the user actually sees and types into. Both instances
  // are fully controlled from HeaderSearch via the same `term` state,
  // so they always stay in sync.
  const panelInputRef = useRef<HTMLInputElement>(null);

  // Portaled to <body> below (same reasoning as MenuDrawer's
  // DrawerBackdrop) so this always renders above everything else on the
  // page, regardless of any stacking context an ancestor might introduce.
  // `document` doesn't exist during SSR, so wait for the client mount
  // before portaling — same guard DrawerBackdrop uses.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Focus the panel's own input whenever the panel opens, so the user
  // can keep typing right where the (now-hidden) header pill left off.
  useEffect(() => {
    if (open) panelInputRef.current?.focus();
  }, [open]);

  function closeSearch() {
    // Clearing `term` is enough — the derived values above all fall back
    // to `[]` once term is empty, so stale fetcher.data from the last
    // query is simply ignored without needing to touch fetcher state.
    onTermChange('');
    onClose();
  }

  function applySuggestion(value: string) {
    onTermChange(value);
    // Refocus the panel's own input so the user can keep typing/editing
    // right after picking a suggestion, instead of losing focus.
    panelInputRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

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
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, triggerRef]);

  // Close the panel when the user scrolls the page behind it. The
  // 'scroll' event doesn't bubble from the panel's own internal
  // scrollable results div up to window, so this only fires for page-
  // level scrolling (e.g. scrolling the page via a trackpad/wheel while
  // the panel is open), not for scrolling within the results themselves.
  useEffect(() => {
    if (!open) return;

    function onScroll() {
      onClose();
    }

    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, [open, onClose]);

  const total = hits.length;

  // Panel always covers the entire viewport starting from the very top
  // (y: 0) — including AnnouncementBar and HeaderUtility above the header
  // row — rather than starting just below it.
  const topOffset = 0;

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{top: topOffset}}
        className={`fixed inset-x-0 bottom-0 z-[900] bg-black/40 backdrop-blur-[6px] transition-opacity duration-200 ease-out ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        style={{top: topOffset}}
        className={`fixed inset-x-0 z-[901] grid max-h-[calc(100vh-var(--sp-top,0px))] border-b border-gray-200 bg-white shadow-2xl transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'pointer-events-none grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto max-h-[80vh] max-w-[1080px] overflow-y-auto px-6 py-7">
            {/* The panel's own visible search bar + close button. This
                is what the user sees/types into while the panel is
                open — it's the same controlled `term`/`onTermChange`
                that HeaderSearch passes to the header's own SearchBar,
                so the two never drift out of sync. */}
            <div className="flex items-center gap-3">
              <SearchBar
                inputRef={panelInputRef}
                className="flex-1"
                value={term}
                onQueryChange={onTermChange}
                onSearch={onNavigate}
              />
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 hover:text-gray-950"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-7">
              {!term ? (
                <PopularSearches
                  terms={TRENDING_SEARCH_TERMS}
                  onSelect={onTermChange}
                />
              ) : state === 'loading' ? (
                <SearchResultsSkeleton />
              ) : error ? (
                <div>
                  <p className="text-sm text-red-600">{error}</p>
                  <div className="mt-7">
                    <PopularSearches
                      terms={TRENDING_SEARCH_TERMS}
                      onSelect={onTermChange}
                    />
                  </div>
                </div>
              ) : !total && !hasSuggestions ? (
                <div>
                  <p className="text-sm text-gray-500">
                    No results found for <q>{term}</q>
                  </p>
                  <div className="mt-7">
                    <PopularSearches
                      terms={TRENDING_SEARCH_TERMS}
                      onSelect={onTermChange}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
                  {hasSuggestions && (
                    <SuggestionsRail
                      term={term}
                      recent={matchingRecent}
                      queries={querySuggestions}
                      vendors={vendors}
                      collections={collections}
                      pages={pages}
                      onSelectTerm={applySuggestion}
                    />
                  )}

                  <div className="min-w-0">
                    {total > 0 && (
                      <div>
                        <p className="mb-4 text-sm text-gray-400">
                          Products
                          {primaryCollection && (
                            <span className="ml-1.5 font-semibold text-gray-800">
                              In {primaryCollection.title}
                            </span>
                          )}
                        </p>
                        <ProductHitsCarousel hits={hits} onNavigate={closeSearch} />

                        <div className="mt-6 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate(term);
                              onClose();
                            }}
                            className="inline-flex items-center justify-center rounded-sm bg-gray-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                          >
                            See all results for &ldquo;{term}&rdquo;
                          </button>
                        </div>
                      </div>
                    )}

                    {articles.length > 0 && (
                      <div className={total > 0 ? 'mt-8' : ''}>
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm text-gray-400">Articles</p>
                          <Link
                            to={`/search?q=${encodeURIComponent(term)}&type=article`}
                            onClick={closeSearch}
                            className="text-sm font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-900"
                          >
                            See all
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {articles.slice(0, 2).map((article) => (
                            <Link
                              key={article.id}
                              to={`/blogs/${article.blog_handle}/${article.handle}`}
                              onClick={closeSearch}
                              className="group flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 transition hover:border-gray-200 hover:bg-gray-50"
                            >
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                {article.image_url ? (
                                  <img
                                    src={article.image_url}
                                    alt={article.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <ImageOff size={16} className="text-gray-300" aria-hidden="true" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-gray-950">
                                  {article.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Published{' '}
                                  {formatArticleDate(article.published_at)}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

const MAX_SUGGESTIONS = 8;

/**
 * Left-hand "Suggestions" rail — blends recent searches the user has
 * already typed with live matches from Shopify: query text suggestions,
 * vendors (derived from matched products), collections, and pages.
 * Each row uses a distinct icon so the source of the suggestion stays
 * legible at a glance, matching the reference pattern.
 *
 * Capped at MAX_SUGGESTIONS total (not per-source) so a broad term
 * doesn't dump 20+ rows into the rail — recent searches take priority,
 * then queries, then vendors, then collections, then pages, filling
 * remaining slots in that order.
 */
function SuggestionsRail({
  term,
  recent,
  queries,
  vendors,
  collections,
  pages,
  onSelectTerm,
}: {
  term: string;
  recent: string[];
  queries: string[];
  vendors: string[];
  collections: PredictiveCollection[];
  pages: PredictivePage[];
  onSelectTerm: (term: string) => void;
}) {
  let remaining = MAX_SUGGESTIONS;

  const take = <T,>(items: T[]): T[] => {
    if (remaining <= 0) return [];
    const slice = items.slice(0, remaining);
    remaining -= slice.length;
    return slice;
  };

  const shownRecent = take(recent);
  const shownQueries = take(queries);
  const shownVendors = take(vendors);
  const shownCollections = take(collections);
  const shownPages = take(pages);

  return (
    <div className="border-b border-gray-100 pb-6 md:border-b-0 md:border-r md:border-gray-100 md:pb-0 md:pr-6">
      <p className="mb-4 text-sm text-gray-400">Suggestions</p>
      <div className="flex flex-col gap-1.5">
        {shownRecent.map((value) => (
          <SuggestionRow
            key={`recent-${value}`}
            icon={<RotateCcw size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {shownQueries.map((value) => (
          <SuggestionRow
            key={`query-${value}`}
            icon={<Search size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {shownVendors.map((value) => (
          <SuggestionRow
            key={`vendor-${value}`}
            icon={<Tag size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {shownCollections.map((collection) => (
          <Link
            key={collection.id}
            to={`/collections/${collection.handle}`}
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="text-gray-400">
              <LayoutGrid size={15} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              <HighlightedText text={collection.title} query={term} />
            </span>
          </Link>
        ))}
        {shownPages.map((page) => (
          <Link
            key={page.id}
            to={`/pages/${page.handle}`}
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="text-gray-400">
              <Info size={15} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              <HighlightedText text={page.title} query={term} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SuggestionRow({
  icon,
  label,
  query,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-gray-800 transition hover:bg-gray-50"
    >
      <span className="text-gray-400">{icon}</span>
      <span className="min-w-0 flex-1 leading-snug">
        <HighlightedText text={label} query={query} />
      </span>
      <span className="shrink-0 text-gray-300 opacity-0 transition group-hover:opacity-100">
        <ArrowUpLeft size={14} aria-hidden="true" />
      </span>
    </button>
  );
}

/**
 * Horizontal scrolling carousel for predictive-search product hits.
 * Replaces the previous CSS-grid layout so results scroll sideways
 * instead of wrapping into rows — mirrors the scroll/arrow logic used
 * by sections/ProductCarousel.tsx elsewhere in the app.
 */
function ProductHitsCarousel({
  hits,
  onNavigate,
}: {
  hits: PredictiveSearchHit[];
  onNavigate: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 1);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollState, {passive: true});
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, hits.length]);

  function scrollByDirection(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-carousel-item]');
    const styles = card ? getComputedStyle(el) : null;
    const gap = styles ? parseFloat(styles.columnGap || styles.gap || '0') : 0;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({left: step * direction, behavior: 'smooth'});
  }

  if (!hits.length) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="group"
        aria-label="Product results"
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {hits.map((hit) => (
          <div
            key={hit.objectID}
            data-carousel-item
            className="w-[45%] shrink-0 snap-start sm:w-[31%] lg:w-[23%]"
          >
            <ProductHit hit={hit} onNavigate={onNavigate} />
          </div>
        ))}
      </div>

      {canScrollPrev && (
        <button
          type="button"
          onClick={() => scrollByDirection(-1)}
          aria-label="Scroll to previous products"
          className="absolute left-0 top-1/2 hidden -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2 text-gray-700 shadow-md ring-1 ring-gray-200 transition hover:bg-gray-50 sm:flex"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11 4.5 6.5 9l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          onClick={() => scrollByDirection(1)}
          aria-label="Scroll to next products"
          className="absolute right-0 top-1/2 hidden translate-x-3 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2 text-gray-700 shadow-md ring-1 ring-gray-200 transition hover:bg-gray-50 sm:flex"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M7 4.5 11.5 9 7 13.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function ProductHit({
  hit,
  onNavigate,
}: {
  hit: PredictiveSearchHit;
  onNavigate: () => void;
}) {
  const price = formatMoney(hit.price);
  const compareAtPrice = formatMoney(hit.compare_at_price);
  const onSale =
    hit.compare_at_price != null &&
    hit.price != null &&
    hit.compare_at_price > hit.price;
  const percentOff =
    onSale && hit.price != null && hit.compare_at_price != null
      ? Math.round((1 - hit.price / hit.compare_at_price) * 100)
      : null;

  return (
    <div className="group relative">
      <Link to={`/products/${hit.handle}`} onClick={onNavigate}>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 ring-1 ring-transparent transition group-hover:ring-gray-200">
          {hit.image_url ? (
            <img
              src={hit.image_url}
              alt={hit.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff size={22} className="text-gray-300" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {hit.is_eco && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                ECO
              </span>
            )}
            {percentOff !== null && percentOff > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                -{percentOff}% OFF
              </span>
            )}
          </div>
        </div>
        {hit.vendor && (
          <p className="mt-2.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {hit.vendor}
          </p>
        )}
        <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-gray-900 group-hover:text-gray-950">
          {hit.title}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          {price && (
            <span className="text-[15px] font-semibold text-gray-900">
              {price}
            </span>
          )}
          {onSale && compareAtPrice && (
            <span className="text-[13px] text-gray-400 line-through">
              {compareAtPrice}
            </span>
          )}
        </div>
      </Link>

      {/*
        Wishlist affordance only — not wired to persistence yet. Shopify
        doesn't have a built-in wishlist; hook this up to whatever you
        use (customer metafields, a wishlist app's API, local storage,
        etc.) before shipping. Left as a visible, non-functional stub
        rather than a fake "saved" state.
      */}
      <button
        type="button"
        aria-label={`Add ${hit.title} to wishlist`}
        onClick={(e) => e.preventDefault()}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition hover:bg-white"
      >
        <Heart size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Flex-wrapped pill/chip list — matches the reference "Popular Search
 * Terms" row instead of the old vertical rail-with-border layout.
 */
function PopularSearches({
  terms,
  onSelect,
}: {
  terms: string[];
  onSelect: (term: string) => void;
}) {
  if (!terms.length) return null;

  return (
    <div>
      <p className="mb-4 text-sm text-gray-400">Popular searches</p>
      <div className="flex flex-wrap gap-2.5">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect(term)}
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-200"
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
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      {Array.from({length: 6}).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square w-full rounded-xl bg-gray-100" />
          <div className="mt-2.5 h-3.5 w-4/5 rounded bg-gray-100" />
          <div className="mt-2 h-3.5 w-1/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}