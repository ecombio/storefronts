import {memo, useId} from 'react';

/**
 * Server-rendered star rating, styled to visually match Yotpo's own
 * "yotpo-reviews-star-ratings-widget" markup: same star SVG path,
 * gradient-fill technique per star, colors, font, and spacing —
 * with zero dependency on Yotpo's script or stylesheet.
 *
 * Font: uses Nunito Sans when available, falling back to a system
 * sans-serif stack so there's no serif flash before Nunito Sans loads
 * (pair this with loading Nunito Sans via Google Fonts in root.tsx —
 * see the <link> snippet below — so it's not depending on Yotpo's
 * Reviews-widget script to ever load the font at all).
 */

const FONT_STACK =
  '"Nunito Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const STAR_PATH =
  'M9 14.118L14.562 17.475L13.086 11.148L18 6.891L11.529 6.342L9 0.375L6.471 6.342L0 6.891L4.914 11.148L3.438 17.475L9 14.118Z';

const STAR_INDEXES = [0, 1, 2, 3, 4] as const;

// Static styles hoisted out of the component so they're created once per
// module load, not once per render.
const wrapperStyle = {
  display: 'flex',
  justifyContent: 'left',
  flexDirection: 'row',
  marginBottom: '5px',
} as const;

const scrollPanelStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  flexFlow: 'wrap',
} as const;

const buttonStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  direction: 'ltr',
  background: 'none',
  border: 'none',
  padding: 0,
} as const;

const starsRowOuterStyle = {display: 'flex', cursor: 'pointer'} as const;

const starsRowInnerStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  height: '28px',
  cursor: 'pointer',
} as const;

const scoreTextStyle = {
  display: 'flex',
  alignSelf: 'center',
  color: 'rgb(255, 224, 0)',
  fontFamily: FONT_STACK,
  fontStyle: 'normal',
  fontWeight: 700,
  fontSize: '16px',
  marginInline: '0px 10px',
  marginBottom: '1px',
  paddingTop: '3px',
} as const;

const dividerStyle = {
  display: 'flex',
  placeSelf: 'center',
  height: '11px',
  borderRight: '1px solid black',
  marginRight: '12px',
  marginLeft: '0px',
} as const;

const reviewCountOuterStyle = {display: 'flex'} as const;

const reviewCountTextStyle = {
  whiteSpace: 'nowrap',
  fontSize: '16px',
  textAlign: 'start',
  fontFamily: FONT_STACK,
  fontStyle: 'normal',
  fontWeight: 700,
  color: 'rgb(44, 44, 44)',
  paddingTop: '2px',
  lineHeight: '28px',
} as const;

const starSvgStyleLast = {
  display: 'flex',
  flexDirection: 'row',
  marginInlineEnd: '8px',
} as const;

const starSvgStyleDefault = {
  display: 'flex',
  flexDirection: 'row',
  marginInlineEnd: '3.5px',
} as const;

const starPathStyle = {pointerEvents: 'none'} as const;

export const StarRating = memo(function StarRating({
  averageScore,
  totalReviews,
  onClick,
}: {
  averageScore: number;
  totalReviews: number;
  /** Optional — if provided, the rating becomes a real jump-to-reviews
   *  control (button gets a working click + honest aria-label). If
   *  omitted, it renders as a non-interactive summary instead of
   *  promising an action it can't perform. */
  onClick?: () => void;
}) {
  // useId guarantees each rendered instance gets unique SVG gradient ids —
  // important if multiple StarRating components ever render on the same
  // page (e.g. a product grid), since duplicate <linearGradient> ids
  // silently break fills in the browser.
  //
  // React's useId() returns an id containing colons (e.g. ":r0:"). Safari
  // fails to resolve an SVG fill="url(#...)" reference when the target id
  // contains a colon — the gradient reference silently fails to resolve
  // and the fill falls back to nothing, so the star renders completely
  // unpainted (not missing, just invisible). Stripping the colons here
  // keeps the id unique while avoiding that failure mode.
  const rawInstanceId = useId();
  const instanceId = rawInstanceId.replace(/:/g, '');

  // Deliberately no early return when totalReviews is 0 — Yotpo's own
  // widget still renders the star bar at zero reviews (empty stars +
  // "0 Reviews"), using it as an invitation to leave the first review.
  // Whether there's Yotpo data at all is already gated one level up,
  // by the `bottomline &&` check in ProductDetail.

  const interactive = Boolean(onClick);
  const label = interactive
    ? `${averageScore.toFixed(
        1,
      )} out of 5 stars rating in total ${totalReviews} reviews. Jump to reviews.`
    : `${averageScore.toFixed(
        1,
      )} out of 5 stars rating in total ${totalReviews} reviews.`;

  return (
    <div style={wrapperStyle}>
      <div style={scrollPanelStyle}>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          style={{
            ...buttonStyle,
            cursor: interactive ? 'pointer' : 'default',
          }}
        >
          <span style={starsRowOuterStyle}>
            <span aria-hidden="true" style={starsRowInnerStyle}>
              {STAR_INDEXES.map((i) => {
                const fill = Math.max(0, Math.min(1, averageScore - i));
                const gradientId = `${instanceId}-star-${i}`;
                const isLast = i === STAR_INDEXES.length - 1;

                return (
                  <svg
                    key={i}
                    aria-hidden="true"
                    viewBox="0 0 18 18"
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    style={isLast ? starSvgStyleLast : starSvgStyleDefault}
                  >
                    <defs>
                      <linearGradient id={gradientId}>
                        <stop offset={`${fill * 100}%`} stopColor="#FFE000" />
                        <stop
                          stopOpacity="1"
                          offset={`${fill * 100}%`}
                          stopColor="#FFFFFF"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      style={starPathStyle}
                      d={STAR_PATH}
                      stroke="#FFE000"
                      fill={`url(#${gradientId})`}
                    />
                  </svg>
                );
              })}
            </span>

            <span style={scoreTextStyle}>{averageScore.toFixed(1)}</span>
          </span>

          <span style={dividerStyle} />

          <span style={reviewCountOuterStyle}>
            <span style={reviewCountTextStyle}>
              {totalReviews} Review{totalReviews === 1 ? '' : 's'}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
});