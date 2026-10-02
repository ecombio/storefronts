import { ratingLabel, StarRow } from "@/@yotpo/ui";

/**
 * Card rating line: partial-fill stars, "4.4/5", and the review count.
 * Renders nothing without reviews (the card shows no "Write a review" prompt; the product page does).
 */
export function CardStars({ score, count }: { score: number; count: number }) {
  if (!count) return null;
  return (
    <div
      role="img"
      aria-label={ratingLabel(score, count)}
      className="flex items-center gap-1 text-xs text-foreground"
    >
      <StarRow
        decorative
        score={score}
        starClassName="size-3"
        color="currentColor"
        emptyColor="color-mix(in srgb, currentColor 20%, transparent)"
      />
      <span className="font-semibold">{score.toFixed(1)}/5</span>
      <span className="text-muted-foreground">({count.toLocaleString("en-US")})</span>
    </div>
  );
}
