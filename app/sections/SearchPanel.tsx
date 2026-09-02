import {useEffect, useRef, useState, useCallback} from 'react';
import {createPortal} from 'react-dom';
import {Link, useFetcher} from 'react-router';
import {
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

// A single product match returned by the predictive-search API.
type PredictiveSearchHit = {
  objectID: string;
  title: string;
  handle: string;
  image_url: string | null;
  price: number | null;
  compare_at_price: number | null;
  is_eco: boolean;
  vendor?: string | null;
};

// A collection (category) match returned by the predictive-search API.
type PredictiveCollection = {
  id: string;
  title: string;
  handle: string;
  image_url: string | null;
};

// A blog article match returned by the predictive-search API.
type PredictiveArticle = {
  id: string;
  title: string;
  handle: string;
  blog_handle: string;
  image_url: string | null;
  published_at: string;
};

// A static page match returned by the predictive-search API.
type PredictivePage = {
  id: string;
  title: string;
  handle: string;
};

// Shape of the full JSON payload returned by /api/predictive-search.
type PredictiveSearchResponse = {
  hits: PredictiveSearchHit[];
  querySuggestions: string[];
  vendors: string[];
  collections: PredictiveCollection[];
  articles: PredictiveArticle[];
  pages: PredictivePage[];
  error?: string;
};

// localStorage key under which the user's recent search terms are persisted.
const RECENT_SEARCHES_KEY = 'ecombio:recent-searches';
// Cap on how many recent searches we keep/show.
export const MAX_RECENT_SEARCHES = 5;

// Formats a numeric amount as a USD currency string, or null if no amount.
function formatMoney(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Formats an ISO date string as "Month YYYY" (e.g. "January 2024") for article bylines.
function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

// Renders `text` with the first case-insensitive occurrence of `query` bolded.
// Used to visually highlight why a suggestion matched what the user typed.
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

// Reads the saved recent-search terms from localStorage.
// Returns an empty array on the server, or if parsing/reading fails.
export function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// Persists the given list of recent-search terms to localStorage.
// Silently no-ops if storage is unavailable (e.g. private browsing, quota exceeded).
export function writeRecentSearches(terms: string[]) {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch {
    // no-op
  }
}

// The slide-down search overlay: input box, predictive suggestions, and
// product/article results, rendered into a portal so it can sit above
// everything else in the page regardless of where it's mounted.
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
  triggerRef: React.RefObject<HTMLElement>;
  term: string;
  onTermChange: (value: string) => void;
  onNavigate: (value: string) => void;
}) {
  // Fetcher used to call the predictive-search API without a full navigation.
  const fetcher = useFetcher<PredictiveSearchResponse>();

  // Recent searches loaded from localStorage (client-only, so it starts empty).
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Refresh recent searches from storage each time the panel is opened,
  // in case they changed since the last time it was open.
  useEffect(() => {
    if (open) setRecentSearches(readRecentSearches());
  }, [open]);

  // Debounced fetch of predictive-search results: wait 250ms after the user
  // stops typing before hitting the API, to avoid firing a request per keystroke.
  useEffect(() => {
    if (!term) return;
    const timeout = setTimeout(() => {
      fetcher.load(`/api/predictive-search?q=${encodeURIComponent(term)}`);
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  // Derive the various result buckets from the fetcher's last response.
  // Everything collapses to empty when there's no active search term, so
  // stale results don't flash after the input is cleared.
  const hits: PredictiveSearchHit[] = term ? fetcher.data?.hits ?? [] : [];
  const querySuggestions = term ? fetcher.data?.querySuggestions ?? [] : [];
  const vendors = term ? fetcher.data?.vendors ?? [] : [];
  const collections = term ? fetcher.data?.collections ?? [] : [];
  const articles = term ? fetcher.data?.articles ?? [] : [];
  const pages = term ? fetcher.data?.pages ?? [] : [];
  const error = fetcher.data?.error ?? null;

  // Only show a loading state when there's an actual query in flight.
  const state: 'idle' | 'loading' =
    term && (fetcher.state === 'loading' || fetcher.state === 'submitting')
      ? 'loading'
      : 'idle';

  // Recent searches that also match what's currently typed, so they can be
  // shown alongside live suggestions instead of only when the box is empty.
  const matchingRecent = term
    ? recentSearches.filter((r) =>
        r.toLowerCase().includes(term.toLowerCase()),
      )
    : [];

  // Whether the left-hand "Suggestions" rail has anything to show at all.
  const hasSuggestions =
    matchingRecent.length > 0 ||
    querySuggestions.length > 0 ||
    vendors.length > 0 ||
    collections.length > 0 ||
    pages.length > 0;

  // First matching collection, used to label the product results
  // (e.g. "Products In Men's Shoes").
  const primaryCollection = collections[0] ?? null;

  // Ref to the panel container, used to detect outside clicks.
  const panelRef = useRef<HTMLDivElement>(null);
  // Ref to the search input inside the panel, so we can focus it programmatically.
  const panelInputRef = useRef<HTMLInputElement>(null);

  // Portals require a browser DOM, so we defer rendering until after mount
  // to avoid a server/client mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Autofocus the input whenever the panel opens.
  useEffect(() => {
    if (open) panelInputRef.current?.focus();
  }, [open]);

  // Clears the search term and closes the panel (used by "Cancel" and
  // whenever the user navigates away from a search result).
  function closeSearch() {
    onTermChange('');
    onClose();
  }

  // Fills the input with a clicked suggestion and refocuses it, so the user
  // can keep refining the search without an extra click.
  function applySuggestion(value: string) {
    onTermChange(value);
    panelInputRef.current?.focus();
  }

  // Close the panel when the user clicks outside it (and outside the
  // trigger button that opened it), or presses Escape.
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

  // Also close the panel if the page is scrolled while it's open, so it
  // doesn't stay pinned over content the user is trying to view.
  useEffect(() => {
    if (!open) return;
    function onScroll() {
      onClose();
    }
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, [open, onClose]);

  const total = hits.length;
  // Reserved for offsetting the panel below a fixed header; currently unused (0).
  const topOffset = 0;

  // Don't render anything until we're safely on the client (see `mounted` above).
  if (!mounted) return null;

  return createPortal(
    <>
      {/* Semi-transparent backdrop behind the panel; clicking it closes the search */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{top: topOffset}}
        className={`fixed inset-x-0 bottom-0 z-[900] bg-black/40 backdrop-blur-[6px] transition-opacity duration-200 ease-out ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      {/* Main panel. Uses a CSS grid-rows trick (0fr -> 1fr) to animate open/close
          height without needing to know the content's actual height in advance. */}
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
          <div className="mx-auto max-h-[80vh] max-w-[1080px] overflow-y-auto px-6 py-5">
            {/* Search input + Cancel button */}
            <div className="search-bar flex items-center gap-3">
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
                className="shrink-0 text-sm font-semibold text-gray-950 transition hover:text-gray-600"
              >
                Cancel
              </button>
            </div>

            {/* Results area: which branch renders depends on whether there's a
                query, whether it's loading, errored, empty, or has results. */}
            <div className="mt-4">
              {!term ? (
                // No query yet: show trending/popular search terms.
                <PopularSearches
                  terms={TRENDING_SEARCH_TERMS}
                  onSelect={onTermChange}
                />
              ) : state === 'loading' ? (
                // Query in flight: show placeholder skeleton cards.
                <SearchResultsSkeleton />
              ) : error ? (
                // API returned an error: show the message plus a fallback to
                // popular searches so the user isn't stuck.
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
                // Query resolved but nothing matched at all.
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
                // Normal case: two-column layout — suggestions rail on the
                // left, product/article results on the right.
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
                    {/* Product results, shown as a horizontally-scrolling carousel */}
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
                    {/* Article results: show up to 2 as small preview cards */}
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
    // Render into document.body so the overlay/panel isn't clipped or
    // affected by any ancestor's positioning/overflow/z-index.
    document.body,
  );
}

// Max total number of suggestion rows shown across all categories combined
// (recent searches, query suggestions, vendors, collections, pages).
const MAX_SUGGESTIONS = 8;

// Left-hand rail listing mixed suggestion types (recent searches, query
// autocompletions, vendors, collections, pages), capped at MAX_SUGGESTIONS
// total and filled in that priority order.
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
  // Shared "budget" of remaining suggestion slots, consumed in priority
  // order by each category below via `take`.
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
        {/* Recent searches the user has previously made that match the current term */}
        {shownRecent.map((value) => (
          <SuggestionRow
            key={`recent-${value}`}
            icon={<RotateCcw size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {/* Autocompleted query suggestions from the search API */}
        {shownQueries.map((value) => (
          <SuggestionRow
            key={`query-${value}`}
            icon={<Search size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {/* Matching vendor/brand names */}
        {shownVendors.map((value) => (
          <SuggestionRow
            key={`vendor-${value}`}
            icon={<Tag size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {/* Matching collections — these link directly to the collection page
            rather than re-running a search, so they're plain <Link>s */}
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
        {/* Matching static pages — also link directly rather than re-searching */}
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

// A single clickable row in the suggestions rail: an icon, the (highlighted)
// label text, and an arrow that appears on hover. Used for suggestion types
// that fill in the search box rather than navigating directly (recent
// searches, query suggestions, vendors).
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

// Horizontally-scrolling row of product result cards, with prev/next arrow
// buttons that appear once there's overflow content in that direction.
function ProductHitsCarousel({
  hits,
  onNavigate,
}: {
  hits: PredictiveSearchHit[];
  onNavigate: () => void;
}) {
  // Ref to the scrollable track, used both to scroll it programmatically
  // and to read its current scroll position.
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Recomputes whether the prev/next arrows should be shown, based on the
  // track's current scroll position relative to its scrollable width.
  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 1);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  // Keep the arrow visibility in sync with scrolling and with size changes
  // (e.g. window resize, or the number of hits changing).
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

  // Scrolls the track by roughly one card's width (plus its gap) in the
  // given direction; falls back to 80% of the visible width if no card
  // is found (e.g. empty carousel).
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
      {/* Scroll-snapping track; scrollbar is hidden since we provide our
          own prev/next buttons instead */}
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
      {/* Prev arrow: only rendered once there's content scrolled past on the left */}
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
      {/* Next arrow: only rendered once there's more content to scroll to on the right */}
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

// A single product card within the carousel: image (with sale/eco badges),
// vendor, title, price, and a wishlist heart button overlaid on top.
function ProductHit({
  hit,
  onNavigate,
}: {
  hit: PredictiveSearchHit;
  onNavigate: () => void;
}) {
  const price = formatMoney(hit.price);
  const compareAtPrice = formatMoney(hit.compare_at_price);
  // "On sale" means there's a compare-at price higher than the current price.
  const onSale =
    hit.compare_at_price != null &&
    hit.price != null &&
    hit.compare_at_price > hit.price;
  // Discount percentage, rounded, only computed when actually on sale.
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
            // Fallback placeholder when the product has no image.
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff size={22} className="text-gray-300" aria-hidden="true" />
            </div>
          )}
          {/* Badges (eco-friendly / sale percentage) overlaid on the top-left of the image */}
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
          {/* Original price shown struck-through only when on sale */}
          {onSale && compareAtPrice && (
            <span className="text-[13px] text-gray-400 line-through">
              {compareAtPrice}
            </span>
          )}
        </div>
      </Link>
      {/* Wishlist button sits on top of the (otherwise fully clickable) card;
          preventDefault stops it from triggering the underlying Link navigation */}
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

// Row of pill-shaped buttons for trending/popular search terms, shown as
// the default state before the user has typed anything.
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
      <p className="search-title text-sm text-gray-400">Popular Search Terms</p>
      <div className="search-terms flex flex-wrap">
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

// Placeholder loading state shown while a predictive-search request is in
// flight: a fixed grid of pulsing gray blocks shaped like product cards.
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