// app/hooks/useHeaderHeightSync.ts
import {useEffect} from 'react';
import type {RefObject} from 'react';

/**
 * useHeaderHeightSync
 *
 * Header.tsx already owns scroll-direction detection (its `hidden`
 * state) — this hook does NOT duplicate that. It only:
 *
 * 1. Measures the header's real rendered height via ResizeObserver and
 *    writes it to `--header-height` on <html>, so anything below the
 *    header (CollectionFilters, CollectionToolbar) can position itself
 *    against it without the height being threaded through props.
 * 2. Mirrors Header's `hidden` boolean onto a `header-hidden` class on
 *    <html>. CollectionFilters/CollectionToolbar are rendered by route
 *    templates, not by Header — a class on <html> is the simplest way
 *    to reach them without lifting state across that boundary.
 *
 * Usage in Header.tsx:
 *   const headerRef = useRef<HTMLElement>(null);
 *   useHeaderHeightSync(headerRef, hidden);
 *   return <header ref={headerRef} ...>
 */
export function useHeaderHeightSync(
  ref: RefObject<HTMLElement | null>,
  hidden: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        '--header-height',
        `${entry.contentRect.height}px`,
      );
    });
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [ref]);

  useEffect(() => {
    document.documentElement.classList.toggle('header-hidden', hidden);
  }, [hidden]);
}