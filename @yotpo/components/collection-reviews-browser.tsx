"use client";

// Path: @yotpo/components/collection-reviews-browser.tsx
//
// Interactive part of the collection reviews section: summary card, clickable rating bars,
// "With customer photos" filter, top photo strip, sort, and the review list with "Show more".
// Filtering and sorting run in the browser over the reviews gathered by the server component.
// Photos use unoptimized next/image so Yotpo's image host needs no entry in next.config.

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import type { YotpoBottomline, YotpoCollectionReview } from "../types";
import { Star, StarRow } from "./star";

type SortKey = "recent" | "highest" | "lowest" | "helpful";
type Photo = { full: string; thumb: string };

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Most recent",
  highest: "Highest rating",
  lowest: "Lowest rating",
  helpful: "Most helpful",
};

const TOP_PHOTO_REVIEWS = 12;

const controlClass =
  "rounded-full border border-neutral-400 bg-white px-3 py-1.5 text-xs text-black focus:outline-none focus:ring-2 focus:ring-black";

const time = (r: YotpoCollectionReview) => Date.parse(r.created_at) || 0;

function photosOf(review: YotpoCollectionReview): Photo[] {
  return (review.images_data ?? []).flatMap((image) => {
    const full = image.original_url ?? image.thumb_url;
    const thumb = image.thumb_url ?? image.original_url;
    return full && thumb ? [{ full, thumb }] : [];
  });
}

function reviewerName(review: YotpoCollectionReview): string {
  return review.user?.display_name?.trim() || "Anonymous";
}

function TopPhotoReviews({ reviews }: { reviews: YotpoCollectionReview[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  if (reviews.length === 0) return null;

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" });
  }

  const arrowClass =
    "flex size-9 items-center justify-center rounded-full bg-black text-white hover:opacity-80";

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-black">Top reviews with photos</h3>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous photos"
            onClick={() => scrollByPage(-1)}
            className={arrowClass}
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next photos"
            onClick={() => scrollByPage(1)}
            className={arrowClass}
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review) => {
          const photo = photosOf(review)[0];
          if (!photo) return null;
          return (
            <div
              key={review.id}
              className="relative h-28 w-32 shrink-0 snap-start overflow-hidden rounded-lg bg-neutral-200"
            >
              <Image
                src={photo.thumb}
                alt={"Photo from " + reviewerName(review) + "'s review"}
                fill
                unoptimized
                sizes="128px"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white">
                <p className="truncate text-xs font-semibold">{reviewerName(review)}</p>
                <p className="text-xs">{review.score}/5</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: YotpoCollectionReview }) {
  const [expanded, setExpanded] = useState(false);
  // UTC keeps server and browser output identical (no hydration mismatch near midnight).
  const date = new Date(review.created_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const name = reviewerName(review);
  const photos = photosOf(review);
  const long = review.content.length > 280;

  return (
    <article className="rounded-lg bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-black">
            {name}
            {review.verified_buyer ? (
              <span className="rounded bg-[#dbe4f7] px-1.5 py-0.5 text-xs font-medium">
                Verified purchase
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">Reviewed {date}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StarRow score={review.score} />
          <span className="text-sm font-semibold text-black">{review.score}/5</span>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {photos.map((photo) => (
            <a
              key={photo.full}
              href={photo.full}
              target="_blank"
              rel="noreferrer"
              className="relative block size-24 overflow-hidden rounded-md bg-neutral-100"
            >
              <Image
                src={photo.thumb}
                alt={"Photo from " + name + "'s review"}
                fill
                unoptimized
                sizes="96px"
                className="object-cover"
              />
            </a>
          ))}
        </div>
      ) : null}

      {review.title ? (
        <p className="mt-4 text-sm font-semibold text-black">{review.title}</p>
      ) : null}
      <p
        className={
          "mt-2 text-sm leading-relaxed whitespace-pre-line text-black " +
          (long && !expanded ? "line-clamp-4" : "")
        }
      >
        {review.content}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-sm font-semibold text-black underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 text-sm">
        <span className="min-w-0 truncate font-medium text-black">{review.product.title}</span>
        <span className="flex shrink-0 items-center gap-3">
          {review.votes_up > 0 ? (
            <span className="text-xs text-neutral-500">{review.votes_up} helpful</span>
          ) : null}
          <Link
            href={"/products/" + review.product.handle}
            className="font-semibold text-black underline"
          >
            See item
          </Link>
        </span>
      </div>
    </article>
  );
}

export function CollectionReviewsBrowser({
  reviews,
  bottomline,
  pageSize,
}: {
  reviews: YotpoCollectionReview[];
  bottomline: YotpoBottomline;
  pageSize: number;
}) {
  const [rating, setRating] = useState(0); // 0 = all ratings
  const [withPhotos, setWithPhotos] = useState(false);
  const [sort, setSort] = useState<SortKey>("recent");
  const [shown, setShown] = useState(pageSize);

  const filtersActive = rating !== 0 || withPhotos;

  const topPhotoReviews = useMemo(
    () =>
      reviews
        .filter((r) => photosOf(r).length > 0)
        .sort((a, b) => b.votes_up - a.votes_up || time(b) - time(a))
        .slice(0, TOP_PHOTO_REVIEWS),
    [reviews],
  );

  const filtered = useMemo(() => {
    const list = reviews.filter((r) => {
      if (rating && r.score !== rating) return false;
      if (withPhotos && photosOf(r).length === 0) return false;
      return true;
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
  }, [reviews, rating, withPhotos, sort]);

  function clearFilters() {
    setRating(0);
    setWithPhotos(false);
    setShown(pageSize);
  }

  function toggleRating(star: number) {
    setRating((current) => (current === star ? 0 : star));
    setShown(pageSize);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <aside className="grid content-start gap-5">
        <div className="rounded-lg bg-white p-5">
          <p className="text-sm font-semibold text-black">Overall rating</p>
          <div className="mt-2 flex items-center gap-2">
            <StarRow score={bottomline.average_score} />
            <span className="text-sm font-semibold text-black">
              {bottomline.average_score.toFixed(1)}/5
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {bottomline.total_review} {bottomline.total_review === 1 ? "review" : "reviews"}
          </p>
          <div className="mt-4 grid gap-0.5">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = bottomline.star_distribution[star];
              const pct = bottomline.total_review > 0 ? (count / bottomline.total_review) * 100 : 0;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => toggleRating(star)}
                  aria-pressed={rating === star}
                  aria-label={
                    (rating === star ? "Clear filter for " : "Show ") +
                    star +
                    " star reviews, " +
                    count +
                    " total"
                  }
                  className={
                    "flex w-full items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none " +
                    (rating === star ? "bg-neutral-100" : "")
                  }
                >
                  <span className="flex w-6 items-center justify-end gap-0.5 text-black">
                    {star}
                    <Star filled className="h-3 w-3" />
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                    <span className="block h-full bg-black" style={{ width: pct + "%" }} />
                  </span>
                  <span className="w-8 text-left text-neutral-500">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5">
          <p className="text-sm font-semibold text-black">Filters</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-black">
            <input
              type="checkbox"
              checked={withPhotos}
              onChange={(e) => {
                setWithPhotos(e.target.checked);
                setShown(pageSize);
              }}
              className="size-4 accent-black"
            />
            With customer photos
          </label>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-md border border-neutral-400 px-3 py-1.5 text-xs font-semibold text-black"
            >
              Reset filters
            </button>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0">
        <TopPhotoReviews reviews={topPhotoReviews} />

        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-black">Reviews</h3>
          <div className="flex items-center gap-2 text-xs text-black">
            <label htmlFor="collection-reviews-sort">Sort by:</label>
            <select
              id="collection-reviews-sort"
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

        <div className="grid gap-4">
          {filtered.length === 0 ? (
            <p className="rounded-lg bg-white py-10 text-center text-sm text-neutral-500">
              No reviews match your filters.
            </p>
          ) : (
            filtered.slice(0, shown).map((review) => <ReviewCard key={review.id} review={review} />)
          )}
        </div>

        {filtered.length > shown ? (
          <div className="flex justify-center pt-5">
            <button
              type="button"
              onClick={() => setShown((n) => n + pageSize)}
              className="rounded-full border border-black px-6 py-3 text-xs font-bold text-black hover:bg-white"
            >
              Show more reviews
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
