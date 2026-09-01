// app/snippets/StarRating.tsx

import {useId} from 'react';

/**
 * Renders a 5-star rating display from a plain average score + review
 * count. Replaces Yotpo's on-site Star Rating widget (instance 1332841),
 * which was returning empty despite the product having published
 * reviews — see app/lib/yotpo.server.ts for why. Data comes from
 * Yotpo's Bottomline API, fetched server-side in the product loader.
 *
 * Styled to match Yotpo's own widget output (gold stars, score, divider,
 * review count) so it's visually consistent with the reviews widget
 * below it on the page. Static styling lives in
 * app/assets/star-rating.css (linked globally in app/root.tsx, matching
 * how customer-reviews.css and every other section/snippet stylesheet
 * is loaded); only genuinely dynamic values — the per-star gradient
 * fill and the trigger's conditional cursor — stay inline here.
 */
export function StarRating({
  averageScore,
  totalReviews,
  onReviewsClick,
  onWriteReviewClick,
}: {
  averageScore: number;
  totalReviews: number;
  /** Optional: scroll to / focus the reviews widget below when clicked. */
  onReviewsClick?: () => void;
  /** Optional: separate handler for the empty-state "Write a review" button. Fallsback to onReviewsClick if omitted. */
  onWriteReviewClick?: () => void;
}) {
  const hasReviews = totalReviews > 0;

  // Scopes this instance's star gradient ids so multiple StarRating
  // instances on the same page (e.g. a future collection grid showing
  // per-product ratings) don't collide. useId() also keeps the id
  // stable between server- and client-render, avoiding a hydration
  // mismatch, which is the same reason index-only ids were originally
  // chosen over Math.random() — see the Star component comment below.
  // Colons in useId()'s output are valid in HTML ids but need escaping
  // inside a CSS url(#...) reference, so they're stripped here rather
  // than handled at every usage site.
  const uid = useId().replace(/:/g, '');

  return (
    <div className="star-rating-root">
      <button
        type="button"
        onClick={onReviewsClick}
        className="star-rating star-rating-trigger"
        style={{cursor: onReviewsClick ? 'pointer' : 'default'}}
        aria-label={
          hasReviews
            ? `${averageScore.toFixed(1)} out of 5 stars rating in total ${totalReviews} review${totalReviews === 1 ? '' : 's'}. Jump to reviews.`
            : '0 out of 5 stars rating in total 0 reviews. Jump to reviews.'
        }
      >
        <span aria-hidden="true" className="star-rating-stars">
          {Array.from({length: 5}).map((_, i) => (
            <Star
              key={i}
              index={i}
              uid={uid}
              fillPercent={hasReviews ? getFillPercent(averageScore, i) : 0}
            />
          ))}
        </span>

        {hasReviews && (
          <span className="star-rating-score">{averageScore.toFixed(1)}</span>
        )}

        {hasReviews && <span aria-hidden="true" className="star-rating-divider" />}

        <span className="star-rating-count">
          {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
        </span>
      </button>

      {!hasReviews && (
        <button
          type="button"
          onClick={onWriteReviewClick ?? onReviewsClick}
          className="star-rating-write-btn"
        >
          Write a review
        </button>
      )}
    </div>
  );
}

// Returns 0–100: how much of star index `i` (0-based) should be filled,
// so a score like 4.3 renders star 5 as ~30% filled rather than snapping
// to whole stars only.
function getFillPercent(score: number, starIndex: number): number {
  const diff = score - starIndex;
  if (diff >= 1) return 100;
  if (diff <= 0) return 0;
  return Math.round(diff * 100);
}

// Mirrors Yotpo's own star SVG path/viewBox/gradient-fill approach.
// Gradient id incorporates the parent StarRating instance's `uid` (from
// useId(), passed down) plus this star's position (0-4) — not
// Math.random(). A random id changes on every render, which is both
// wasteful (defeats any memoization) and unsafe for SSR: the id
// generated on the server won't match the one generated during client
// hydration, causing a hydration mismatch. `uid` is what keeps this
// safe for SSR (stable per component instance across server/client),
// and combining it with `index` is what keeps ids unique when more
// than one StarRating instance renders on the same page — index alone
// was only unique within a single instance.
//
// fillPercent (the gradient <stop> offsets) is the one piece of this
// component's visual output that's genuinely per-render dynamic, so
// it's the one piece that stays as an inline SVG attribute rather than
// moving into star-rating.css — there's no static class that could
// express it.
function Star({fillPercent, index, uid}: {fillPercent: number; index: number; uid: string}) {
  const id = `star-fill-${uid}-${index}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      className="star-rating-star"
    >
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fillPercent}%`} stopColor="#FFE000" />
          <stop offset={`${fillPercent}%`} stopColor="#FFFFFF" stopOpacity={1} />
        </linearGradient>
      </defs>
      <path
        style={{pointerEvents: 'none'}}
        d="M9 14.118L14.562 17.475L13.086 11.148L18 6.891L11.529 6.342L9 0.375L6.471 6.342L0 6.891L4.914 11.148L3.438 17.475L9 14.118Z"
        stroke="#FFE000"
        fill={`url(#${id})`}
      />
    </svg>
  );
}