// Path: @yotpo/components/star.tsx
//
// The one star implementation for the whole app (product page, reviews, listing cards).
// - Client-safe: no server-only imports, so client components may use it (via `@/@yotpo/ui`).
// - Partial fill: `filled` may be a boolean or a 0-1 fraction; <StarRow> fills each star by how
//   much of the score reaches it (4.4 -> four full stars and a 40% star).
// - Colors: `color` defaults to the Yotpo brand color; pass "currentColor" to follow the text color.

import { yotpoConfig } from "../config";

const EMPTY_COLOR = "#E5E5E5";
const STAR_PATH =
  "M9 14.118L14.562 17.475L13.086 11.148L18 6.891L11.529 6.342L9 0.375L6.471 6.342L0 6.891L4.914 11.148L3.438 17.475L9 14.118Z";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** "4.4 out of 5 stars" (+ ", N reviews" when a count is given). Shared aria-label text. */
export function ratingLabel(score: number, count?: number): string {
  const base = `${Number(clamp(score, 0, 5).toFixed(1))} out of 5 stars`;
  if (count === undefined) return base;
  return `${base}, ${count} ${count === 1 ? "review" : "reviews"}`;
}

function StarShape({ className, fill }: { className: string; fill: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} style={{ fill }} aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  );
}

export function Star({
  filled,
  className = "h-4 w-4",
  color,
  emptyColor = EMPTY_COLOR,
}: {
  /** true / false, or a 0-1 fraction for a partly filled star. */
  filled: boolean | number;
  className?: string;
  /** Overrides the brand star color for this star. Defaults to yotpoConfig.brand.starsColor. */
  color?: string;
  /** Color of the unfilled part. */
  emptyColor?: string;
}) {
  const fraction = typeof filled === "number" ? clamp(filled, 0, 1) : filled ? 1 : 0;
  const fillColor = color ?? yotpoConfig.brand.starsColor;

  if (fraction === 0) return <StarShape className={className} fill={emptyColor} />;
  if (fraction === 1) return <StarShape className={className} fill={fillColor} />;

  return (
    <span className="relative inline-flex shrink-0">
      <StarShape className={className} fill={emptyColor} />
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${fraction * 100}%` }}
      >
        <StarShape className={`${className} block max-w-none`} fill={fillColor} />
      </span>
    </span>
  );
}

export function StarRow({
  score,
  label,
  starClassName,
  color,
  emptyColor,
  decorative = false,
}: {
  score: number;
  /** Overrides the default aria-label ("4.4 out of 5 stars"). */
  label?: string;
  /** Size classes for each star, e.g. "h-5 w-5". Defaults to h-4 w-4. */
  starClassName?: string;
  /** Overrides the brand star color for the whole row. */
  color?: string;
  /** Color of the unfilled part of each star. */
  emptyColor?: string;
  /** Hides the row from screen readers, for when a parent already carries the aria-label. */
  decorative?: boolean;
}) {
  const value = clamp(score, 0, 5);
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label ?? ratingLabel(value) } as const);

  return (
    <div className="flex gap-0.5" {...a11y}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          filled={clamp(value - i, 0, 1)}
          className={starClassName}
          color={color}
          emptyColor={emptyColor}
        />
      ))}
    </div>
  );
}
