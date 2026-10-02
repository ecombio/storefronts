"use client";

import { Play, X } from "lucide-react";
import { useRef, useState } from "react";

import {
  CarouselArrows,
  CarouselProgress,
  carouselTrackClass,
  useScrollTrack,
} from "@/components/ui/carousel";
import { getYouTubeId } from "@/lib/product/expert-reviews";
import type { ExpertReview } from "@/lib/product/types";

type Playing =
  | { kind: "youtube"; id: string }
  | { kind: "file"; poster?: string; sources: NonNullable<ExpertReview["videoSources"]> };

export function ExpertReviews({
  reviews,
  title = "Expert Reviews",
}: {
  reviews: ExpertReview[];
  title?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const { trackRef, onScroll, atStart, atEnd, scrollByPage, start, size, overflowing } =
    useScrollTrack<HTMLUListElement>({ pageFraction: 0.8 });

  if (reviews.length === 0) return null;

  // Uploaded video wins; then a YouTube link; any other link opens in a new tab.
  const play = (review: ExpertReview) => {
    if (review.videoSources?.length) {
      setPlaying({ kind: "file", poster: review.thumbnailUrl, sources: review.videoSources });
    } else {
      const id = review.videoUrl ? getYouTubeId(review.videoUrl) : undefined;
      if (id) setPlaying({ kind: "youtube", id });
      else if (review.videoUrl) return window.open(review.videoUrl, "_blank", "noopener");
    }
    dialog.current?.showModal();
  };

  return (
    <section className="grid gap-5" data-slot="expert-reviews">
      <h2 className="text-2xl font-semibold">{title}</h2>

      <ul ref={trackRef} onScroll={onScroll} className={`${carouselTrackClass} gap-5 pb-1`}>
        {reviews.map((review, index) => {
          const youtubeId = review.videoUrl ? getYouTubeId(review.videoUrl) : undefined;
          const thumbnail =
            review.thumbnailUrl ??
            (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : undefined);
          return (
            <li key={`${review.title}-${index}`} className="w-64 shrink-0 snap-start sm:w-72">
              <button
                type="button"
                onClick={() => play(review)}
                aria-label={`Play video: ${review.title}`}
                className="group relative block aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-muted"
              >
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt={review.thumbnailAlt ?? review.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/80 transition-colors group-hover:bg-black/75">
                    <Play className="size-5 fill-current" />
                  </span>
                </span>
              </button>
              <p className="mt-3 line-clamp-2 text-sm leading-snug font-semibold">{review.title}</p>
              {review.viewCount ? (
                <p className="mt-0.5 text-xs text-foreground/60">{review.viewCount}</p>
              ) : null}
              {review.sourceName ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-foreground/80">
                  {review.sourceIconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.sourceIconUrl}
                      alt=""
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
                      {review.sourceName.charAt(0)}
                    </span>
                  )}
                  <span className="truncate">{review.sourceName}</span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {overflowing ? (
        <div className="flex items-center gap-6">
          <CarouselProgress start={start} size={size} />
          <CarouselArrows
            size="sm"
            className="gap-3"
            atStart={atStart}
            atEnd={atEnd}
            onScroll={scrollByPage}
            previousLabel="Previous reviews"
            nextLabel="Next reviews"
          />
        </div>
      ) : null}

      <dialog
        ref={dialog}
        onClose={() => setPlaying(null)}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(92vw,960px)] rounded-lg bg-black p-0 backdrop:bg-black/70"
      >
        <button
          type="button"
          aria-label="Close video"
          onClick={() => dialog.current?.close()}
          className="absolute top-2 right-2 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white"
        >
          <X className="size-4" />
        </button>
        {playing?.kind === "youtube" ? (
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${playing.id}?autoplay=1&rel=0`}
            title="Expert review video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : null}
        {playing?.kind === "file" ? (
          <video
            className="aspect-video w-full"
            controls
            autoPlay
            playsInline
            poster={playing.poster}
          >
            {playing.sources.map((source) => (
              <source key={source.url} src={source.url} type={source.mimeType} />
            ))}
          </video>
        ) : null}
      </dialog>
    </section>
  );
}
