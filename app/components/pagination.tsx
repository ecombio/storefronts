// app/components/pagination.tsx
//
// Single consolidated home for the "accumulating list + Load more" pattern
// used by CollectionFeed.tsx, collections.all.tsx, and
// blogs.$blogHandle.tagged.$tag.tsx. Replaces the old split between each
// file calling Hydrogen's own <Pagination> directly and separately
// wrapping the button in components/LoadMoreTrigger.tsx (now folded in
// here — delete that file once everything below is in place).
//
// Renamed to PaginationSection (not `Pagination`) so it doesn't collide
// with the `Pagination` Hydrogen itself exports from '@shopify/hydrogen',
// which this wraps internally.

import {Fragment, useEffect, useRef} from 'react';
import type {ComponentProps, ComponentType, ReactNode} from 'react';
import {Pagination as HydrogenPagination} from '@shopify/hydrogen';

export type PaginationConnection<T> = ComponentProps<
  typeof HydrogenPagination<T>
>['connection'];

/**
 * Hydrogen's NextLink (rendered inside <Pagination>'s render prop) is a
 * wrapped router <a> — standard anchor props plus `preventScrollReset`.
 * Typed by hand here rather than inferred from HydrogenPagination's
 * generic children signature, which is awkward to extract cleanly.
 */
type NextLinkComponent = ComponentType<
  ComponentProps<'a'> & {preventScrollReset?: boolean}
>;

/**
 * 'manual' — button only, click to load the next page. No observer set up
 *            at all.
 * 'auto'   — (default) button PLUS an IntersectionObserver that auto-clicks
 *            it once it scrolls near the viewport, layering infinite
 *            scroll on top of the same button. Since newly loaded items
 *            get appended above the button, its position keeps moving
 *            further down the page after each load, so this naturally
 *            loads one page at a time as the user keeps scrolling rather
 *            than chain-loading everything at once.
 */
export type LoadMoreMode = 'manual' | 'auto';

/** Visual skin for the button — see pagination.css for each variant. */
export type LoadMoreSkin = 'solid' | 'outline' | 'text';

interface PaginationSectionProps<T extends {id: string}> {
  connection: PaginationConnection<T>;
  /** Class applied to the wrapping element around all accumulated items — e.g. "products-grid", "article-feed", "blog-category__grid". */
  itemsClassName?: string;
  /**
   * Renders a single item. Called with the item and its index within the
   * FULL accumulated list (not per-page) — matches the original
   * `index < 8 ? 'eager' : undefined` eager-loading pattern, and lets a
   * caller splice extra content in at a specific index (e.g.
   * CollectionFeed's sponsored-ad panel) by returning it alongside the
   * item from a single render call.
   */
  renderItem: (item: T, index: number) => ReactNode;
  /** Default: 'auto'. */
  mode?: LoadMoreMode;
  /** Default: 'solid'. */
  skin?: LoadMoreSkin;
}

export function PaginationSection<T extends {id: string}>({
  connection,
  itemsClassName,
  renderItem,
  mode = 'auto',
  skin = 'solid',
}: PaginationSectionProps<T>) {
  return (
    <HydrogenPagination connection={connection}>
      {({nodes, isLoading, hasNextPage, NextLink}) => (
        <>
          <div className={itemsClassName}>
            {nodes.map((item, index) => (
              <Fragment key={item.id}>{renderItem(item, index)}</Fragment>
            ))}
          </div>

          {hasNextPage && (
            <LoadMoreControl
              isLoading={isLoading}
              mode={mode}
              skin={skin}
              NextLink={NextLink}
            />
          )}
        </>
      )}
    </HydrogenPagination>
  );
}

// ---------------------------------------------------------------------------
// Internal — the button + (optionally) the scroll trigger. Not exported;
// callers only ever go through <PaginationSection>.
// ---------------------------------------------------------------------------

function LoadMoreControl({
  isLoading,
  mode,
  skin,
  NextLink,
}: {
  isLoading: boolean;
  mode: LoadMoreMode;
  skin: LoadMoreSkin;
  NextLink: NextLinkComponent;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== 'auto') return;

    const el = wrapperRef.current;
    if (!el) return;

    // Starts the fetch ~600px before the button is actually on screen, so
    // new items are usually already loaded by the time the user scrolls
    // to where the button would be.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || isLoading) return;
        // Programmatic click on the real <a> NextLink renders — goes
        // through the same client-side navigation (and the same
        // isLoading state) a manual click would.
        el.querySelector('a')?.click();
      },
      {rootMargin: '600px'},
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, isLoading]);

  return (
    <div ref={wrapperRef} className="pagination__load-more" data-loading={isLoading}>
      <NextLink
        preventScrollReset
        className={`pagination__load-more-btn pagination__load-more-btn--${skin}`}
        aria-disabled={isLoading}
      >
        {isLoading ? 'Loading…' : 'Load more'}
      </NextLink>
    </div>
  );
}
