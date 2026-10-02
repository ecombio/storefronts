import { yotpoConfig } from "../config";

export function Star({
  filled,
  className = "h-4 w-4",
  color,
}: {
  filled: boolean;
  className?: string;
  /** Overrides the brand star color for this star. Defaults to yotpoConfig.brand.starsColor. */
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 18 18"
      className={className}
      style={{ fill: filled ? (color ?? yotpoConfig.brand.starsColor) : "#E5E5E5" }}
      aria-hidden="true"
    >
      <path d="M9 14.118L14.562 17.475L13.086 11.148L18 6.891L11.529 6.342L9 0.375L6.471 6.342L0 6.891L4.914 11.148L3.438 17.475L9 14.118Z" />
    </svg>
  );
}

export function StarRow({
  score,
  label,
  starClassName,
  color,
}: {
  score: number;
  label?: string;
  /** Size classes for each star, e.g. "h-5 w-5". Defaults to h-4 w-4. */
  starClassName?: string;
  /** Overrides the brand star color for the whole row. */
  color?: string;
}) {
  const rounded = Math.round(score);
  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={label ?? `${Number(score.toFixed(1))} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} filled={i < rounded} className={starClassName} color={color} />
      ))}
    </div>
  );
}