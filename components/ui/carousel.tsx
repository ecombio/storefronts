"use client";

// Shared pieces for horizontally scrolling rows (scroll-snap track + prev/next arrows + progress bar).
// Compose what you need; the markup around them (heading, item width, gap) stays with the caller.
//
//   const { trackRef, onScroll, atStart, atEnd, scrollByPage } = useScrollTrack();
//   <CarouselArrows atStart={atStart} atEnd={atEnd} onScroll={scrollByPage}
//     previousLabel="Previous photos" nextLabel="Next photos" />
//   <div ref={trackRef} onScroll={onScroll} className={`${carouselTrackClass} snap-mandatory gap-3`}>
//
// Used by the review photo strip, expert reviews and (next) the deals carousel.

import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Flex row that scrolls sideways with snap points and no visible scrollbar. */
export const carouselTrackClass =
  "flex snap-x overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

type ScrollState = { atStart: boolean; atEnd: boolean; size: number; start: number };

const INITIAL: ScrollState = { atStart: true, atEnd: false, size: 1, start: 0 };

export function useScrollTrack<T extends HTMLElement = HTMLDivElement>({
  pageFraction = 0.9,
}: {
  /** How much of the visible width one arrow press scrolls. */
  pageFraction?: number;
} = {}) {
  const trackRef = useRef<T>(null);
  const [state, setState] = useState<ScrollState>(INITIAL);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const size = el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1;
    const next: ScrollState = {
      atStart: el.scrollLeft <= 1,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
      size,
      start: max > 0 ? (el.scrollLeft / max) * (1 - size) : 0,
    };
    // Scrolling fires this constantly; skip the render when nothing visible changed.
    setState((prev) =>
      prev.atStart === next.atStart &&
      prev.atEnd === next.atEnd &&
      prev.size === next.size &&
      prev.start === next.start
        ? prev
        : next,
    );
  }, []);

  // Measure on mount, when the track resizes, and when items are added or removed.
  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    const resize = new ResizeObserver(update);
    resize.observe(el);
    const mutation = new MutationObserver(update);
    mutation.observe(el, { childList: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [update]);

  const scrollByPage = useCallback(
    (direction: 1 | -1) => {
      const el = trackRef.current;
      if (!el) return;
      el.scrollBy({ left: direction * el.clientWidth * pageFraction, behavior: "smooth" });
    },
    [pageFraction],
  );

  return {
    trackRef,
    onScroll: update,
    scrollByPage,
    atStart: state.atStart,
    atEnd: state.atEnd,
    /** Progress-bar thumb, as 0-1 fractions of the bar. */
    start: state.start,
    size: state.size,
    /** True when the items are wider than the track, so arrows and the bar are useful. */
    overflowing: state.size < 1,
  };
}

export function CarouselArrows({
  atStart,
  atEnd,
  onScroll,
  previousLabel,
  nextLabel,
  size = "md",
  className,
}: {
  atStart: boolean;
  atEnd: boolean;
  onScroll: (direction: 1 | -1) => void;
  previousLabel: string;
  nextLabel: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const button = (disabled: boolean) =>
    cn(
      "flex items-center justify-center rounded-full transition-opacity",
      size === "sm" ? "size-8" : "size-9",
      disabled
        ? "cursor-not-allowed bg-muted text-muted-foreground"
        : "cursor-pointer bg-foreground text-background hover:opacity-80",
    );
  const icon = size === "sm" ? "size-4" : "size-5";

  return (
    <div className={cn("flex gap-2", className)}>
      <button
        type="button"
        aria-label={previousLabel}
        disabled={atStart}
        onClick={() => onScroll(-1)}
        className={button(atStart)}
      >
        <ChevronLeftIcon className={icon} />
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        disabled={atEnd}
        onClick={() => onScroll(1)}
        className={button(atEnd)}
      >
        <ChevronRightIcon className={icon} />
      </button>
    </div>
  );
}

export function CarouselProgress({
  start,
  size,
  className,
}: {
  start: number;
  size: number;
  className?: string;
}) {
  return (
    <div className={cn("relative h-1 flex-1 rounded-full bg-muted", className)} aria-hidden="true">
      <div
        className="absolute inset-y-0 rounded-full bg-foreground/70"
        style={{ left: `${start * 100}%`, width: `${size * 100}%` }}
      />
    </div>
  );
}
