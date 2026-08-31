// app/sections/CustomerReviews.tsx
//
// Pairs with app/assets/customer-reviews.css. Wired to real Yotpo data
// via getYotpoReviews() (server-rendered first page) and
// app/templates/api.reviews.tsx (client-fetched subsequent pages / sort
// changes).

import {useEffect, useMemo, useRef, useState} from 'react';
import {useFetcher, useSearchParams} from 'react-router';
import type {YotpoReviewsResult, YotpoSortKey} from '~/lib/yotpo.server';
// Stylesheet is linked globally in app/root.tsx (see customerReviewsStyles),
// matching how every other section CSS file is loaded in this codebase —
// not imported directly here.

type StarsProps = {score: number};

function Stars({score}: StarsProps) {
  const fullStars = Math.floor(score);
  const hasHalf = score % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="customer-reviews-stars">
      {Array.from({length: fullStars}).map((_, i) => (
        <StarIcon key={`full-${i}`} fill="full" />
      ))}
      {hasHalf && <StarIcon fill="half" />}
      {Array.from({length: emptyStars}).map((_, i) => (
        <StarIcon key={`empty-${i}`} fill="empty" />
      ))}
    </div>
  );
}

function StarIcon({fill}: {fill: 'full' | 'half' | 'empty'}) {
  const path =
    'M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78L10 1z';

  if (fill === 'half') {
    const id = 'star-half-gradient';
    return (
      <svg
        className="customer-reviews-star"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="#23263B" />
            <stop offset="50%" stopColor="#D3D4D8" />
          </linearGradient>
        </defs>
        <path d={path} fill={`url(#${id})`} />
      </svg>
    );
  }

  return (
    <svg
      className="customer-reviews-star"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill={fill === 'full' ? '#23263B' : '#D3D4D8'}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path} />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="#91929D"
      strokeWidth="1.5"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="M15 15l3 3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="#23263B"
      strokeWidth="1.5"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RatingBar({label, percentage}: {label: string; percentage: number}) {
  return (
    <div className="customer-reviews-bar">
      <span className="customer-reviews-bar-label">{label}</span>
      <div className="customer-reviews-bar-track">
        <div
          className="customer-reviews-bar-fill"
          style={{width: `${percentage}%`}}
        />
      </div>
      <span className="customer-reviews-bar-percentage">{percentage}%</span>
    </div>
  );
}

const SORT_LABELS: Record<YotpoSortKey, string> = {
  top: 'Top Reviews',
  recent: 'Most Recent',
  top_rated: 'Top Rated',
  critical: 'Critical',
};

/**
 * Custom dropdown matching customer-reviews.css's
 * .customer-reviews-sort-trigger / -sort-menu / -sort-option structure
 * (not a native <select>, per the CSS's own markup shape).
 */
function SortDropdown({
  value,
  onChange,
}: {
  value: YotpoSortKey;
  onChange: (key: YotpoSortKey) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="customer-reviews-sort" ref={containerRef}>
      <button
        type="button"
        className="customer-reviews-sort-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        Sort by: {SORT_LABELS[value]}
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <div className="customer-reviews-sort-menu" role="listbox">
          {(Object.keys(SORT_LABELS) as YotpoSortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="customer-reviews-sort-option"
              data-active={key === value}
              role="option"
              aria-selected={key === value}
              onClick={() => {
                onChange(key);
                setIsOpen(false);
              }}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

type ReviewCardData = {
  id: number;
  userName: string;
  socialImage: string | null;
  score: number;
  title: string;
  date: string;
  verified: boolean;
  body: string;
};

function ReviewCard({userName, socialImage, score, title, date, verified, body}: ReviewCardData) {
  return (
    <div className="customer-review-card">
      <div className="customer-review-user">
        {socialImage ? (
          <img src={socialImage} alt="" className="customer-review-avatar" />
        ) : (
          <div
            className="customer-review-avatar"
            aria-hidden="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: '#fff',
              background: '#23263b',
            }}
          >
            {initials(userName)}
          </div>
        )}
        <p className="customer-review-username">{userName}</p>
      </div>

      <div className="customer-review-rating-row">
        <Stars score={score} />
        <span className="customer-review-title">{title}</span>
      </div>

      <div className="customer-review-meta">
        <p className="customer-review-date">Reviewed on {date}</p>
        {verified && <p className="customer-review-verified">Verified Purchase</p>}
      </div>

      <p className="customer-review-body">{body}</p>

      <div className="customer-review-actions">
        <button type="button" className="customer-review-helpful">
          Helpful
        </button>
        <button type="button" className="customer-review-report">
          Report Abuse
        </button>
      </div>
    </div>
  );
}

export function CustomerReviews({
  productId,
  initialData,
  currentSortKey,
  onWriteReviewClick,
}: {
  productId: string;
  productTitle: string;
  productUrl: string;
  productImageUrl?: string;
  initialData: YotpoReviewsResult;
  currentSortKey: YotpoSortKey;
  onWriteReviewClick: () => void;
}) {
  const [, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<YotpoReviewsResult>();

  // Server-provided first page; appended to as "Load more" runs.
  const [reviews, setReviews] = useState(initialData?.reviews ?? []);
  const [page, setPage] = useState(initialData?.pagination.page ?? 1);
  const [query, setQuery] = useState('');

  // Tracks which sort key the in-flight "Load more" fetcher.load() call
  // was issued under. Without this, a sort change that fires while a
  // "Load more" request for the *previous* sort is still in flight can
  // have that stale response land after the sort change and get
  // appended onto the new, freshly-sorted list — mixing sort orders and
  // risking duplicate `review.id` keys. The fetcher-data effect below
  // only applies a response if the sort it was requested under still
  // matches the sort currently in effect.
  const pendingSortRef = useRef<YotpoSortKey | null>(null);

  // Re-sync local state whenever the server sends fresh initialData —
  // this fires when the loader re-runs after a sort change (via
  // handleSortChange's setSearchParams below). Without this, reviews/page
  // stay frozen at whatever they were on first mount: the URL and the
  // server-side data update correctly, but the on-screen list silently
  // keeps showing the old sort order, since useState's initial value is
  // only ever read once.
  useEffect(() => {
    setReviews(initialData?.reviews ?? []);
    setPage(initialData?.pagination.page ?? 1);
    // A fresh server page has landed for the current sort — any older
    // in-flight "Load more" request is now stale regardless of what it
    // resolves to, so it should never be appended once it lands.
    pendingSortRef.current = null;
  }, [initialData]);

  const bottomline = initialData?.bottomline;
  const pagination = initialData?.pagination;
  const hasMore = pagination ? reviews.length < pagination.total : false;

  const filteredReviews = useMemo(() => {
    if (!query.trim()) return reviews;
    const q = query.toLowerCase();
    return reviews.filter(
      (r) => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q),
    );
  }, [reviews, query]);

  function handleSortChange(nextKey: YotpoSortKey) {
    // Full loader round-trip: products.$handle.tsx's loader re-runs
    // getYotpoReviews() server-side with the new sort and returns a
    // fresh first page as initialData — picked up by the useEffect above.
    setSearchParams((prev) => {
      prev.set('sort', nextKey);
      return prev;
    });
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    pendingSortRef.current = currentSortKey;
    const params = new URLSearchParams({
      productId,
      page: String(nextPage),
      sort: currentSortKey,
    });
    fetcher.load(`/api/reviews?${params}`);
    setPage(nextPage);
  }

  // Append fetched page once it lands. This is a side effect (setReviews),
  // so it belongs in useEffect, not useMemo — useMemo is for computing and
  // returning a value during render; using it purely for its side effect
  // works today but isn't a guarantee React makes, and it skips the
  // dependency-array warning tooling that would otherwise catch bugs here.
  useEffect(() => {
    if (fetcher.data?.reviews && pendingSortRef.current === currentSortKey) {
      setReviews((prev) => [...prev, ...fetcher.data!.reviews]);
    }
    // Whether applied or discarded as stale, this response has been
    // handled — clear the pending marker so a later, unrelated fetch
    // isn't accidentally compared against it.
    pendingSortRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data]);

  if (!bottomline || !pagination) {
    return (
      <div className="customer-reviews">
        <p className="customer-review-body">Reviews are temporarily unavailable.</p>
      </div>
    );
  }

  const totalRated =
    bottomline.starDistribution['5'] +
    bottomline.starDistribution['4'] +
    bottomline.starDistribution['3'] +
    bottomline.starDistribution['2'] +
    bottomline.starDistribution['1'];
  const pct = (n: number) => (totalRated ? Math.round((n / totalRated) * 100) : 0);

  return (
    <div className="customer-reviews">
      <div className="customer-reviews-layout">
        {/* Left sidebar */}
        <div className="customer-reviews-sidebar">
          <div className="customer-reviews-overview">
            <h2 className="customer-reviews-heading">Customer reviews</h2>

            {bottomline.totalReviews > 0 ? (
              <>
                <div className="customer-reviews-score-row">
                  <Stars score={bottomline.averageScore} />
                  <span className="customer-reviews-score-label">
                    {bottomline.averageScore.toFixed(1)} out of 5
                  </span>
                </div>

                <span className="customer-reviews-count">
                  {bottomline.totalReviews} global rating
                  {bottomline.totalReviews === 1 ? '' : 's'}
                </span>

                <div className="customer-reviews-bars">
                  <RatingBar label="5 star" percentage={pct(bottomline.starDistribution['5'])} />
                  <RatingBar label="4 star" percentage={pct(bottomline.starDistribution['4'])} />
                  <RatingBar label="3 star" percentage={pct(bottomline.starDistribution['3'])} />
                  <RatingBar label="2 star" percentage={pct(bottomline.starDistribution['2'])} />
                  <RatingBar label="1 star" percentage={pct(bottomline.starDistribution['1'])} />
                </div>
              </>
            ) : (
              <span className="customer-reviews-count">
                No reviews yet — be the first to write one.
              </span>
            )}

            <button type="button" className="customer-reviews-calc-link">
              How are ratings Calculated?
            </button>
          </div>

          <div className="customer-reviews-write">
            <h3 className="customer-reviews-write-title">Review this product</h3>
            <p className="customer-reviews-write-copy">
              Share your thought with other customers
            </p>
            <button
              type="button"
              onClick={onWriteReviewClick}
              className="customer-reviews-btn-outline"
            >
              Write a customer review
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="customer-reviews-panel">
          {bottomline.totalReviews > 0 && (
            <div className="customer-reviews-controls">
              <div className="customer-reviews-search">
                <SearchIcon />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search in reviews"
                />
              </div>
              <SortDropdown value={currentSortKey} onChange={handleSortChange} />
            </div>
          )}

          {filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              id={review.id}
              userName={review.user.displayName}
              socialImage={review.user.socialImage}
              score={review.score}
              title={review.title}
              date={formatDate(review.createdAt)}
              verified={review.verifiedBuyer}
              body={review.content}
            />
          ))}

          {query && filteredReviews.length === 0 && (
            <p className="customer-review-body">No reviews match &quot;{query}&quot;.</p>
          )}

          {hasMore && !query && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={fetcher.state !== 'idle'}
              className="customer-reviews-btn-outline"
              style={{width: 'auto', paddingInline: '24px', alignSelf: 'center'}}
            >
              {fetcher.state !== 'idle' ? 'Loading…' : 'Load more reviews'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
