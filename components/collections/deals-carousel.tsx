"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type ReactNode, useRef } from "react";

export function DealsCarousel({ title, children }: { title: string; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: "smooth" });
  }

  return (
    <section aria-label={title} className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous deals"
            onClick={() => scrollByPage(-1)}
            className="flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next deals"
            onClick={() => scrollByPage(1)}
            className="flex size-9 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}
