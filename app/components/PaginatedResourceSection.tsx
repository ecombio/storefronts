// app/components/PaginatedResourceSection.tsx

import {Pagination} from '@shopify/hydrogen';
import type {ComponentProps, ReactNode} from 'react';

type ConnectionInput<NodesType> = ComponentProps<
  typeof Pagination<NodesType>
>['connection'];

interface PaginatedResourceSectionProps<NodesType> {
  connection: ConnectionInput<NodesType>;
  children: (props: {node: NodesType; index: number}) => ReactNode;
  resourcesClassName?: string;
}

/**
 * Renders paginated data in a grid, wrapping Hydrogen's <Pagination>
 * render-prop component. PreviousLink/NextLink render real <a href> links
 * (via react-router's Link under the hood), so they stay crawlable and
 * work without JS — no JS-only "Load more" click handler, per pagination
 * SEO best practice.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  resourcesClassName,
}: PaginatedResourceSectionProps<NodesType>) {
  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div className="paginated-resource-section">
            <div className="paginated-resource-section__previous">
              <PreviousLink>
                {isLoading ? 'Loading...' : 'Load previous'}
              </PreviousLink>
            </div>

            {resourcesClassName ? (
              <div className={resourcesClassName}>{resourcesMarkup}</div>
            ) : (
              resourcesMarkup
            )}

            <div className="paginated-resource-section__next">
              <NextLink>{isLoading ? 'Loading...' : 'Load more'}</NextLink>
            </div>
          </div>
        );
      }}
    </Pagination>
  );
}