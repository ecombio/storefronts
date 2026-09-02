// app/lib/shoppable-embeds.tsx
//
// NOTE: this file must keep the .tsx extension, not .ts - it contains
// JSX (renderToStaticMarkup(<StaticProductCard .../>) etc.) and won't
// compile as .ts.
//
// Resolves inline shoppable-product markers in article HTML:
//
//   <div data-shoppable-product="ID"></div>   -> single product card
//   <div data-solo="ID"></div>                -> 1-column row (Solo)
//   <div data-duo="ID,ID"></div>              -> 2-column row (Duo)
//   <div data-trio="ID,ID,ID"></div>          -> 3-column row (Trio)
//
// Rendering here uses the *Static* twins (StaticProductCard /
// StaticProductRow / StaticSolo/Duo/Trio) instead of the real,
// interactive components. The real ones call useNavigate(), useAside(),
// and CartForm's internal fetcher hook - none of which have a provider
// available during this SSR string-injection pass, and would throw.
//
// Each rendered slot is wrapped in a `[data-shoppable-slot]` container
// carrying what's needed to re-render it as the real, interactive
// component on the client: see the hydration effect in
// app/sections/Article.tsx, which finds these slots after mount and
// swaps each one for the live ProductCard/Solo/Duo/Trio via createRoot.
//
// Matching is intentionally strict, mirroring the single-marker contract
// in docs/shoppable-blog-articles.md: exact attribute name, digits-only
// IDs, no extra whitespace, no nested content. A marker that doesn't
// match is left untouched by extract (so it's never queried) and is
// therefore also left untouched by inject (nothing to replace it with) -
// same "fail silently, don't show a broken card" behavior as a bad or
// deleted product ID.

import {renderToStaticMarkup} from 'react-dom/server';
import {StaticProductCard} from '~/snippets/StaticProductCard';
import {
  StaticSolo,
  StaticDuo,
  StaticTrio,
} from '~/snippets/StaticRowSnippets';
import type {ProductCardFragment} from 'storefrontapi.generated';

type MarkerKind = 'single' | 'solo' | 'duo' | 'trio';

type MarkerSpec = {attr: string; count: number; kind: MarkerKind};

const MARKERS: MarkerSpec[] = [
  {attr: 'data-shoppable-product', count: 1, kind: 'single'},
  {attr: 'data-solo', count: 1, kind: 'solo'},
  {attr: 'data-duo', count: 2, kind: 'duo'},
  {attr: 'data-trio', count: 3, kind: 'trio'},
];

// Builds a strict matcher for one marker: empty self-closing-style div,
// exact attribute name, value = N comma-separated digit runs, no space
// around `=`. e.g. for {attr: 'data-duo', count: 2}:
//   <div data-duo="(\d+,\d+)"></div>
function markerRegex({attr, count}: MarkerSpec): RegExp {
  const value = Array(count).fill(String.raw`\d+`).join(',');
  return new RegExp(String.raw`<div ${attr}="(${value})"></div>`, 'g');
}

/**
 * Scans article HTML for every recognized marker type and returns the
 * deduped list of numeric product IDs referenced, in first-seen order.
 * Used by the loader to build the batched SHOPPABLE_PRODUCTS_QUERY
 * before rendering.
 */
export function extractShoppableProductIds(html: string): string[] {
  const seen = new Set<string>();

  for (const spec of MARKERS) {
    const regex = markerRegex(spec);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      for (const id of match[1].split(',')) seen.add(id);
    }
  }

  return [...seen];
}

/**
 * Replaces every recognized marker with its server-rendered (static)
 * product markup, wrapped in a `[data-shoppable-slot]` container for
 * client-side hydration. Degrades gracefully:
 *   - data-shoppable-product: unresolved ID -> dropped (empty string)
 *   - data-solo/duo/trio: renders with whichever IDs resolved
 *     (StaticProductRow filters unresolved ones internally); renders
 *     nothing if none resolve
 * Markers that failed the strict pattern were never extracted, so they
 * simply aren't matched here either and are left as inert HTML.
 */
export function injectShoppableProducts(
  html: string,
  productsById: Map<string, ProductCardFragment>,
): string {
  let result = html;

  for (const spec of MARKERS) {
    const regex = markerRegex(spec);
    result = result.replace(regex, (_full, idList: string) =>
      renderMarker(spec.kind, idList.split(','), productsById),
    );
  }

  return result;
}

function renderMarker(
  kind: MarkerKind,
  ids: string[],
  productsById: Map<string, ProductCardFragment>,
): string {
  const inner = renderInner(kind, ids, productsById);
  if (!inner) return '';

  // The wrapper carries the full original ID list (not just the ones
  // that resolved here - a product could get published between this
  // request and the client mounting) so the hydration effect can redo
  // the lookup with its own copy of the product data.
  return `<div data-shoppable-slot="${kind}" data-product-ids="${ids.join(',')}">${inner}</div>`;
}

function renderInner(
  kind: MarkerKind,
  ids: string[],
  productsById: Map<string, ProductCardFragment>,
): string {
  switch (kind) {
    case 'single': {
      const product = productsById.get(ids[0]);
      return product
        ? renderToStaticMarkup(<StaticProductCard product={product} />)
        : '';
    }
    case 'solo':
      return renderToStaticMarkup(
        <StaticSolo productIds={[ids[0]]} productsById={productsById} />,
      );
    case 'duo':
      return renderToStaticMarkup(
        <StaticDuo
          productIds={[ids[0], ids[1]]}
          productsById={productsById}
        />,
      );
    case 'trio':
      return renderToStaticMarkup(
        <StaticTrio
          productIds={[ids[0], ids[1], ids[2]]}
          productsById={productsById}
        />,
      );
  }
}