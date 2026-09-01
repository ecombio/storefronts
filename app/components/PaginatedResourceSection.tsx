// app/components/PaginatedResourceSection.tsx

import {Pagination} from '@shopify/hydrogen';
import {Link, useLocation} from 'react-router';
import type {ComponentProps, ReactNode} from 'react';

const PAGE_PARAM_NAME = 'p';

type ConnectionInput<NodesType> = ComponentProps<
  typeof Pagination<NodesType>
>['connection'];

interface PaginatedResourceSectionProps<NodesType> {
  connection: ConnectionInput<NodesType>;
  children: (props: {node: NodesType; index: number}) => ReactNode;
  resourcesClassName?: string;
  /**
   * Precomputed "page number -> cursor" map (built server-side in
   * collections.$handle.tsx) that lets numbered links jump straight to a
   * page without walking through every page in between — cursor-based
   * connections have no other way to do this. Omit to fall back to a
   * plain "Page N" label with just Previous/Next.
   */
  pageCursors?: Record<number, string>;
  /** How many page numbers can be linked to directly (bounded by the lookahead window). */
  totalKnownPages?: number;
  /** True if more pages exist beyond `totalKnownPages` — rendered as a trailing ellipsis. */
  hasMoreBeyondKnownPages?: boolean;
}

/**
 * Appends our own `p` (display-only page number) param onto a pagination
 * URL produced by Hydrogen's usePagination (e.g. "?cursor=...&direction=next").
 * `p` is never read by getPaginationVariables or the Storefront API — it
 * exists purely so this component can render "Page N", since cursor-based
 * connections don't expose a total page count or the ability to jump to
 * an arbitrary page.
 */
function withPageNumber(pageUrl: string, page: number): string {
  const params = new URLSearchParams(pageUrl.replace(/^\?/, ''));
  params.set(PAGE_PARAM_NAME, String(page));
  return `?${params.toString()}`;
}

/**
 * Parses and validates the `p` param from the current URL. Falls back to 1
 * for anything missing, non-numeric, negative, zero, or fractional — e.g. a
 * hand-edited `?p=999` or `?p=-3` URL, a stale bookmark/browser-history
 * entry, or a crawler retrying an old link. Without this guard, an invalid
 * `p` would render as-is (even negative/decimal) and every subsequent
 * arrow click would drift further from reality, since cursor pagination
 * has no way to independently verify what "page" it's actually on.
 */
function getPageFromUrl(search: string): number {
  const raw = new URLSearchParams(search).get(PAGE_PARAM_NAME);
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Builds the URL for a specific numbered page using its precomputed
 * cursor. Page 1 is the one case with no cursor at all (it's the plain
 * `first: PAGE_BY` fetch), so `cursor`/`direction` are cleared for it
 * rather than set.
 */
function buildNumberedPageUrl(
  search: string,
  page: number,
  cursor?: string,
): string {
  const params = new URLSearchParams(search);
  if (page === 1) {
    params.delete('cursor');
    params.delete('direction');
  } else if (cursor) {
    params.set('cursor', cursor);
    params.set('direction', 'next');
  }
  params.set(PAGE_PARAM_NAME, String(page));
  return `?${params.toString()}`;
}

/**
 * Renders paginated data in a grid, wrapping Hydrogen's <Pagination>
 * render-prop component, with Previous/Next text controls plus clickable
 * page numbers.
 *
 * Storefront API connections are cursor-based: Hydrogen only ever tells
 * you whether a next/previous page exists (hasNextPage/hasPreviousPage),
 * not a total count or a way to jump directly to an arbitrary page. To
 * still offer numbered links, the caller precomputes a bounded window of
 * page->cursor mappings server-side (see buildPageCursors in
 * collections.$handle.tsx) and passes it in as `pageCursors`. Previous and
 * Next always use Hydrogen's own live previousPageUrl/nextPageUrl, so
 * they stay correct even past the end of that precomputed window.
 *
 * All links render as real <a href> (react-router's Link), so they stay
 * crawlable and work without JS.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  resourcesClassName,
  pageCursors,
  totalKnownPages,
  hasMoreBeyondKnownPages,
}: PaginatedResourceSectionProps<NodesType>) {
  const location = useLocation();
  const currentPage = getPageFromUrl(location.search);
  const pageNumbers = totalKnownPages
    ? Array.from({length: totalKnownPages}, (_, i) => i + 1)
    : [];

  return (
    <Pagination connection={connection}>
      {({
        nodes,
        isLoading,
        hasPreviousPage,
        hasNextPage,
        previousPageUrl,
        nextPageUrl,
      }) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div className="paginated-resource-section">
            {resourcesClassName ? (
              <div className={resourcesClassName}>{resourcesMarkup}</div>
            ) : (
              resourcesMarkup
            )}

            <nav
              className="paginated-resource-section__nav"
              aria-label="Pagination"
            >
              {hasPreviousPage ? (
                <Link
                  to={withPageNumber(previousPageUrl, currentPage - 1)}
                  prefetch="intent"
                  preventScrollReset
                  replace
                  className="paginated-resource-section__prev-next"
                >
                  Previous
                </Link>
              ) : (
                <span className="paginated-resource-section__prev-next paginated-resource-section__prev-next--disabled">
                  Previous
                </span>
              )}

              {pageNumbers.length > 0 ? (
                <ul className="paginated-resource-section__numbers">
                  {pageNumbers.map((page) => {
                    const isActive = page === currentPage;
                    return (
                      <li key={page}>
                        {isActive ? (
                          <span
                            aria-current="page"
                            className="paginated-resource-section__number paginated-resource-section__number--active"
                          >
                            {page}
                          </span>
                        ) : (
                          <Link
                            to={buildNumberedPageUrl(
                              location.search,
                              page,
                              pageCursors?.[page],
                            )}
                            prefetch="intent"
                            preventScrollReset
                            replace
                            className="paginated-resource-section__number"
                          >
                            {page}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                  {hasMoreBeyondKnownPages && (
                    <li
                      aria-hidden="true"
                      className="paginated-resource-section__ellipsis"
                    >
                      &hellip;
                    </li>
                  )}
                </ul>
              ) : (
                <span
                  className="paginated-resource-section__page-number"
                  aria-live="polite"
                >
                  {isLoading ? 'Loading…' : `Page ${currentPage}`}
                </span>
              )}

              {hasNextPage ? (
                <Link
                  to={withPageNumber(nextPageUrl, currentPage + 1)}
                  prefetch="intent"
                  preventScrollReset
                  replace
                  className="paginated-resource-section__prev-next"
                >
                  Next
                </Link>
              ) : (
                <span className="paginated-resource-section__prev-next paginated-resource-section__prev-next--disabled">
                  Next
                </span>
              )}
            </nav>
          </div>
        );
      }}
    </Pagination>
  );
}