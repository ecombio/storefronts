"use client";

// Path: @yotpo/components/reviews-browser.tsx
//
// Interactive part of the reviews section: rating summary, clickable rating bars,
// search / rating filter / sort controls, and the review list with "Show more".
// Filtering and sorting run in the browser over the reviews fetched by the server component.

import { useMemo, useState } from "react";

import type { YotpoBottomline, YotpoReview } from "../types";
import { WriteReviewButton } from "./review-form";
import { Star, StarRow } from "./star";

type SortKey = "recent" | "highest" | "lowest" | "helpful";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Most recent",
  highest: "Highest rating",
  lowest: "Lowest rating",
  helpful: "Most helpful",
};

const controlClass =
  "rounded-full border border-neutral-400 bg-white px-3 py-1.5 text-xs text-black focus:outline-none focus:ring-2 focus:ring-black";

const time = (r: YotpoReview) => Date.parse(r.created_at) || 0;

function DistributionRow({
  star,
  count,
  total,
  active,
  onToggle,
}: {
  star: number;
  count: number;
  total: number;
  active: boolean;
  onToggle: () => void;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`${active ? "Clear filter for" : "Show"} ${star} star ${
        star === 1 ? "review" : "reviews"
      }, ${count} total`}
      className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
        active ? "bg-neutral-100" : ""
      }`}
    >
      <span className="flex w-6 items-center justify-end gap-0.5 text-black">
        {star}
        <Star filled color="#000" className="h-3 w-3" />
      </span>
      <span className="h-1 w-40 overflow-hidden rounded-full bg-neutral-200">
        <span className="block h-full bg-black" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-5 text-left text-neutral-500">{count}</span>
    </button>
  );
}

function ReviewCard({ review }: { review: YotpoReview }) {
  // UTC keeps server and browser output identical (no hydration mismatch near midnight).
  const date = new Date(review.created_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const name = review.user?.display_name?.trim() || "Anonymous";

  return (
    <div className="flex gap-4 rounded-lg border border-neutral-200 bg-white p-5">
      <div className="h-9 w-9 flex-shrink-0 rounded-full bg-[#CBD2E0]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-black">{name}</p>
            <div className="my-1.5">
              <StarRow score={review.score} color="#000" />
            </div>
            {review.title ? (
              <p className="mb-1 text-sm font-bold text-black">{review.title}</p>
            ) : null}
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-black">
              {review.content}
            </p>
          </div>
          <span className="whitespace-nowrap text-xs text-neutral-700">{date}</span>
        </div>
        {review.votes_up > 0 ? (
          <p className="mt-3 text-xs text-neutral-500">
            {review.votes_up} {review.votes_up === 1 ? "person" : "people"} found this helpful
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ReviewsBrowser({
  reviews,
  bottomline,
  handle,
  productTitle,
  pageSize,
}: {
  reviews: YotpoReview[];
  bottomline: YotpoBottomline;
  handle: string;
  productTitle: string;
  pageSize: number;
}) {
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState(0); // 0 = all ratings
  const [sort, setSort] = useState<SortKey>("recent");
  const [shown, setShown] = useState(pageSize);

  const filtersActive = rating !== 0 || query.trim() !== "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = reviews.filter((r) => {
      if (rating && r.score !== rating) return false;
      if (!q) return true;
      return [r.title, r.content, r.user?.display_name].some((v) => v?.toLowerCase().includes(q));
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "highest":
          return b.score - a.score || time(b) - time(a);
        case "lowest":
          return a.score - b.score || time(b) - time(a);
        case "helpful":
          return b.votes_up - a.votes_up || time(b) - time(a);
        default:
          return time(b) - time(a);
      }
    });
  }, [reviews, query, rating, sort]);

  function clearFilters() {
    setQuery("");
    setRating(0);
    setShown(pageSize);
  }

  function toggleRating(star: number) {
    setRating((current) => (current === star ? 0 : star));
    setShown(pageSize);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-12 pb-6">
        <div className="text-center">
          <div className="text-5xl leading-none font-bold tracking-tight text-black">{bottomline.average_score.toFixed(1)}</div>
          <div className="my-1.5 flex justify-center">
            <StarRow score={bottomline.average_score} color="#000" />
          </div>
          <div className="text-xs text-neutral-500">
            Based on {bottomline.total_review}{" "}
            {bottomline.total_review === 1 ? "review" : "reviews"}
          </div>
        </div>

        <div className="space-y-0.5">
          {([5, 4, 3, 2, 1] as const).map((star) => (
            <DistributionRow
              key={star}
              star={star}
              count={bottomline.star_distribution[star]}
              total={bottomline.total_review}
              active={rating === star}
              onToggle={() => toggleRating(star)}
            />
          ))}
        </div>

        <WriteReviewButton handle={handle} productTitle={productTitle} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="yotpo-search" className="sr-only">
            Search reviews
          </label>
          <div className="relative">
            <input
              id="yotpo-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(pageSize);
              }}
              placeholder="Search reviews"
              className={`${controlClass} w-44 pr-8 placeholder:text-neutral-500`}
            />
            <svg
              viewBox="0 0 13 13"
              className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-600"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M10.27 9.39l2.68 2.67-.89.89-2.68-2.68A5.6 5.6 0 015.88 11.5 5.63 5.63 0 01.25 5.88 5.63 5.63 0 015.88.25a5.63 5.63 0 015.62 5.63 5.6 5.6 0 01-1.23 3.51zM5.88 10.25A4.37 4.37 0 105.88 1.5a4.37 4.37 0 000 8.75z"
              />
            </svg>
          </div>

          <label htmlFor="yotpo-rating-filter" className="sr-only">
            Filter by rating
          </label>
          <select
            id="yotpo-rating-filter"
            value={String(rating)}
            onChange={(e) => {
              setRating(Number(e.target.value));
              setShown(pageSize);
            }}
            className={controlClass}
          >
            <option value="0">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-black">
          <label htmlFor="yotpo-sort">Sort by:</label>
          <select
            id="yotpo-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={controlClass}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtersActive ? (
        <p className="mt-3 text-xs text-neutral-500" aria-live="polite">
          {filtered.length} matching {filtered.length === 1 ? "review" : "reviews"}.{" "}
          <button type="button" onClick={clearFilters} className="font-bold text-black underline">
            Clear filters
          </button>
        </p>
      ) : null}

      <div className="mt-4 grid gap-4">
        {filtered.length === 0 ? (
          <p className="border-t border-neutral-100 py-10 text-center text-sm text-neutral-500">
            No reviews match your filters.
          </p>
        ) : (
          filtered.slice(0, shown).map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </div>

      {filtered.length > shown ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setShown((n) => n + pageSize)}
            className="rounded-full border border-black px-6 py-3 text-xs font-bold text-black hover:bg-neutral-50"
          >
            Show more reviews
          </button>
        </div>
      ) : null}
    </>
  );
}
