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
 * Renders paginated data in a grid, wrapping Hydrogen's <Pagination>
 * render-prop component, with numbered ("Page N") arrow controls instead
 * of "Load more" text.
 *
 * Storefront API connections are cursor-based: Hydrogen only ever tells
 * you whether a next/previous page exists (hasNextPage/hasPreviousPage),
 * not a total count or a way to jump directly to page 7. So this renders
 * arrows that step one page at a time, with the current page number
 * displayed between them — rather than a clickable list of page numbers,
 * which cursor pagination can't support for pages you haven't visited yet.
 *
 * Previous/Next render as real <a href> links (react-router's Link), so
 * they stay crawlable and work without JS.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  resourcesClassName,
}: PaginatedResourceSectionProps<NodesType>) {
  const location = useLocation();
  const currentPage =
    Number(new URLSearchParams(location.search).get(PAGE_PARAM_NAME)) || 1;

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
                  aria-label="Previous page"
                  className="paginated-resource-section__arrow"
                >
                  <span aria-hidden="true">&larr;</span>
                </Link>
              ) : (
                <span
                  aria-hidden="true"
                  className="paginated-resource-section__arrow paginated-resource-section__arrow--disabled"
                >
                  &larr;
                </span>
              )}

              <span
                className="paginated-resource-section__page-number"
                aria-live="polite"
              >
                {isLoading ? 'Loading…' : `Page ${currentPage}`}
              </span>

              {hasNextPage ? (
                <Link
                  to={withPageNumber(nextPageUrl, currentPage + 1)}
                  prefetch="intent"
                  preventScrollReset
                  replace
                  aria-label="Next page"
                  className="paginated-resource-section__arrow"
                >
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              ) : (
                <span
                  aria-hidden="true"
                  className="paginated-resource-section__arrow paginated-resource-section__arrow--disabled"
                >
                  &rarr;
                </span>
              )}
            </nav>
          </div>
        );
      }}
    </Pagination>
  );
}