// app/components/blogs/ProductGallery.tsx
//
// Consolidated shoppable-product-embed system for blog articles: merges
// what were previously ~/snippets/RowSnippets.tsx,
// ~/snippets/StaticRowSnippets.tsx, ~/snippets/ProductRow.tsx,
// ~/lib/shoppable-embeds.tsx, ~/snippets/StaticProductCard.tsx, and
// ~/snippets/StaticProductRow.tsx into a single file.
//
// NOTE: kept as .tsx, not .ts — contains JSX
// (renderToStaticMarkup(<StaticProductCard .../>) etc.) and won't
// compile as .ts.
//
// Four layers live here:
//   1. Interactive components (Solo/Duo/Trio, ProductRow) — real,
//      hook-driven rows used client-side and portaled into hydrated
//      slots by Article.tsx.
//   2. StaticProductCard — hook-free, server-safe twin of ProductCard
//      (~/snippets/ProductCard). Used ONLY by the renderToStaticMarkup
//      pass below — ProductCard itself can't render there because it
//      calls useNavigate(), useAside(), and CartForm's internal
//      fetcher hook, none of which have a provider available inside
//      the article loader's SSR string-injection pass, and would
//      throw.
//   3. StaticProductRow / StaticSolo/Duo/Trio — hook-free twins of
//      ProductRow/Solo/Duo/Trio, built on StaticProductCard, used only
//      for the same SSR pass.
//   4. Marker extract/inject logic — scans article HTML for
//      data-shoppable-product / data-solo / data-duo / data-trio
//      markers and resolves them against fetched product data.
//
// Each rendered slot is wrapped in a `[data-shoppable-slot]` container
// carrying what's needed to re-render it as the real, interactive
// component on the client: see the hydration effect in
// app/sections/Article.tsx, which finds these slots after mount and
// swaps each one for the live Solo/Duo/Trio/ProductCard via
// createPortal.
//
// Matching is intentionally strict, mirroring the single-marker
// contract in docs/shoppable-blog-articles.md: exact attribute name,
// digits-only IDs, no extra whitespace, no nested content. A marker
// that doesn't match is left untouched by extract (so it's never
// queried) and is therefore also left untouched by inject (nothing to
// replace it with) — same "fail silently, don't show a broken card"
// behavior as a bad or deleted product ID.

import {renderToStaticMarkup} from 'react-dom/server';
import {ProductCard} from '~/snippets/ProductCard';
import type {ProductCardFragment} from 'storefrontapi.generated';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

// Type-level helper that pins the array length to exactly N elements
// (1, 2, or 3), falling back to a plain array for any other N. This is
// what makes Solo/Duo/Trio's (and StaticSolo/Duo/Trio's) props require
// exactly 1/2/3 product IDs at the type level rather than just "an
// array of strings".
type FixedArray<T, N extends number> = N extends 1
  ? [T]
  : N extends 2
    ? [T, T]
    : N extends 3
      ? [T, T, T]
      : T[];

// Shared prop shape for Solo/Duo/Trio and StaticSolo/Duo/Trio,
// parameterized by how many product IDs they require.
type RowProps<N extends number> = {
  productIds: FixedArray<string, N>;
  productsById: Map<string, ProductCardFragment>;
};

type ProductRowProps = {
  productIds: string[];
  productsById: Map<string, ProductCardFragment>;
};

// ---------------------------------------------------------------------------
// Interactive components (client-side; real hooks, real context)
// ---------------------------------------------------------------------------

// Renders a row of full ProductCard components — wishlist, quick view,
// compare, and add-to-cart all live — for a list of product IDs
// resolved against productsById. Unresolved IDs are silently dropped.
function ProductRow({productIds, productsById}: ProductRowProps) {
  const products = productIds
    .map((id) => productsById.get(id))
    .filter((p): p is ProductCardFragment => Boolean(p));

  if (products.length === 0) return null;

  return (
    <div className="product-row" data-columns={products.length}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// 1-product row layout. All three variants just forward to the same
// ProductRow — the distinction is purely at the type/call-site level
// (enforcing the right number of IDs) plus whatever CSS keys off the
// resulting product count.
export function Solo({productIds, productsById}: RowProps<1>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}

// 2-product row layout.
export function Duo({productIds, productsById}: RowProps<2>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}

// 3-product row layout.
export function Trio({productIds, productsById}: RowProps<3>) {
  return <ProductRow productIds={productIds} productsById={productsById} />;
}

// ---------------------------------------------------------------------------
// StaticProductCard — hook-free, server-safe twin of ProductCard
// ---------------------------------------------------------------------------
//
// Renders the same classes/markup as ProductCard so the page looks
// correct immediately. Article.tsx's hydration effect then swaps each
// rendered slot for the real, interactive ProductCard on the client -
// mirrors the same "static now, upgrade after mount" pattern already
// used there for FAQ deep-linking.
//
// Deliberately omits: wishlist button, quick view button, compare
// checkbox, and the CartForm add-to-cart button - all of them need JS to
// do anything, so nothing is lost by leaving them out of pre-hydration
// markup. The add-to-cart slot becomes a plain link to the product page
// instead, so it's still a usable affordance even if hydration is slow
// or fails outright.
//
// The reviews block (product-card__reviews) IS kept, as an empty
// placeholder, even though StarRating itself needs no hooks and could
// render live data here. product-card.css gives that div a fixed
// min-height and it sits in normal flow above the pricing block - if the
// static pass skipped it entirely, hydration would insert it after
// mount and shove the price down by ~18px+, a visible layout jump on
// every article page load. Kept empty (not populated with live rating
// data) rather than duplicating ProductCard's rating-parsing logic here;
// the visual gap is blank until hydration fills it in, which is a much
// smaller cost than the reflow.

interface StaticProductCardProps {
  product: ProductCardFragment;
  showVendor?: boolean;
}

function formatMoney(amount: string, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

function StaticProductCard({
  product,
  showVendor = true,
}: StaticProductCardProps) {
  const url = `/products/${product.handle}`;
  const image = product.featuredImage;
  const price = product.priceRange.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;
  const variant = product.selectedOrFirstAvailableVariant;
  const etaText = product.etaText?.value;
  const isSponsored = product.sponsored?.value === 'true';
  const onSale =
    !!compareAtPrice &&
    parseFloat(compareAtPrice.amount) > parseFloat(price.amount);

  return (
    <div
      className="product-card"
      data-product-id={product.id}
      data-product-handle={product.handle}
    >
      <div className="product-card__img-zone">
        {isSponsored && (
          <span className="product-card__sponsored-label">Sponsored</span>
        )}

        <a
          href={url}
          className="product-card__image-wrapper"
          aria-label={product.title}
        >
          {image ? (
            <img
              src={image.url}
              alt={image.altText ?? product.title}
              className="product-card__img product-card__img--primary"
              loading="lazy"
            />
          ) : (
            <div className="product-card__img-placeholder" aria-hidden="true" />
          )}
        </a>

        {onSale && (
          <span className="product-card__badge-slot">
            <span className="sale-badge">Sale</span>
          </span>
        )}
      </div>

      <div className="product-card__body">
        {showVendor && product.vendor && (
          <span className="product-card__vendor">{product.vendor}</span>
        )}

        <a href={url} className="product-card__title" title={product.title}>
          {product.title}
        </a>

        {/* Empty placeholder — see comment above StaticProductCard.
            Prevents a layout shift when hydration mounts the real
            ProductCard's StarRating. */}
        <div className="product-card__reviews" aria-hidden="true" />

        <div className="product-card__pricing">
          {onSale && compareAtPrice && (
            <span className="product-card__price product-card__price--compare">
              <s>{formatMoney(compareAtPrice.amount, compareAtPrice.currencyCode)}</s>
            </span>
          )}
          <span className="product-card__price product-card__price--sale">
            {formatMoney(price.amount, price.currencyCode)}
          </span>
        </div>

        {etaText && (
          <div className="product-card__eta" aria-label="Estimated delivery">
            <span>{etaText}</span>
          </div>
        )}

        {variant && (
          <div className="product-card__bottom-row">
            <a href={url} className="product-card__atc-btn">
              {variant.availableForSale ? 'View product' : 'Sold out'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static row components (SSR-only; no hooks, no context — used below by
// injectShoppableProducts via renderToStaticMarkup)
// ---------------------------------------------------------------------------

// Hook-free twin of ProductRow. Same resolve-and-drop contract: an ID
// with no match (deleted/unpublished product, typo) is dropped, not
// rendered as a broken card.
function StaticProductRow({productIds, productsById}: ProductRowProps) {
  const products = productIds
    .map((id) => productsById.get(id))
    .filter((p): p is ProductCardFragment => Boolean(p));

  if (products.length === 0) return null;

  return (
    <div className="product-row" data-columns={products.length}>
      {products.map((product) => (
        <StaticProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Static 1-product row — renders via StaticProductRow, no hooks.
function StaticSolo({productIds, productsById}: RowProps<1>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}

// Static 2-product row.
function StaticDuo({productIds, productsById}: RowProps<2>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}

// Static 3-product row.
function StaticTrio({productIds, productsById}: RowProps<3>) {
  return (
    <StaticProductRow productIds={productIds} productsById={productsById} />
  );
}

// ---------------------------------------------------------------------------
// Marker extract/inject (server-side article HTML processing)
// ---------------------------------------------------------------------------

// The four marker "kinds" this module understands. Mirrors the `kind`
// value that later gets written into `data-shoppable-slot` on the
// rendered wrapper, and read back by Article.tsx's hydration effect.
type MarkerKind = 'single' | 'solo' | 'duo' | 'trio';

// Describes one marker type: which HTML attribute identifies it, how
// many comma-separated IDs it expects, and its resolved "kind" name.
type MarkerSpec = {attr: string; count: number; kind: MarkerKind};

// The full set of recognized markers. To add a new layout (say, a
// 4-product grid), this is the single place a new spec would be added
// — extract/inject both iterate this list generically.
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
  // Repeat `\d+` `count` times, joined by literal commas, e.g.
  // count=3 -> "\d+,\d+,\d+" for a trio marker.
  const value = Array(count).fill(String.raw`\d+`).join(',');
  // Global flag so callers can find every occurrence in the document,
  // not just the first.
  return new RegExp(String.raw`<div ${attr}="(${value})"></div>`, 'g');
}

/**
 * Scans article HTML for every recognized marker type and returns the
 * deduped list of numeric product IDs referenced, in first-seen order.
 * Used by the loader to build the batched SHOPPABLE_PRODUCTS_QUERY
 * before rendering.
 */
export function extractShoppableProductIds(html: string): string[] {
  // Set dedupes automatically and preserves insertion order in JS,
  // which is what "first-seen order" relies on here.
  const seen = new Set<string>();

  for (const spec of MARKERS) {
    const regex = markerRegex(spec);
    let match: RegExpExecArray | null;
    // exec() with a /g regex is stateful — repeated calls advance
    // lastIndex, walking through every match in the string until none
    // remain (loop exits when exec returns null).
    while ((match = regex.exec(html)) !== null) {
      // match[1] is the captured ID-list group, e.g. "123,456" for a
      // duo marker — split it into individual IDs.
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

  // Run each marker type's regex over the (progressively rewritten)
  // HTML string, replacing every match with its rendered markup.
  for (const spec of MARKERS) {
    const regex = markerRegex(spec);
    result = result.replace(regex, (_full, idList: string) =>
      renderMarker(spec.kind, idList.split(','), productsById),
    );
  }

  return result;
}

// Renders one marker's replacement HTML: the inner product markup plus
// the outer data-shoppable-slot wrapper the client hydrates against.
function renderMarker(
  kind: MarkerKind,
  ids: string[],
  productsById: Map<string, ProductCardFragment>,
): string {
  const inner = renderInner(kind, ids, productsById);
  // If nothing could be rendered (e.g. a lone unresolved product ID
  // for a `single` marker), drop the marker entirely rather than
  // emitting an empty wrapper div.
  if (!inner) return '';

  // The wrapper carries the full original ID list (not just the ones
  // that resolved here - a product could get published between this
  // request and the client mounting) so the hydration effect can redo
  // the lookup with its own copy of the product data.
  return `<div data-shoppable-slot="${kind}" data-product-ids="${ids.join(',')}">${inner}</div>`;
}

// Renders the actual product markup for a marker, using the hook-free
// Static* components so this works during a plain string-rendering
// pass with no React context available.
function renderInner(
  kind: MarkerKind,
  ids: string[],
  productsById: Map<string, ProductCardFragment>,
): string {
  switch (kind) {
    case 'single': {
      const product = productsById.get(ids[0]);
      // No product resolved (deleted/inaccessible) -> render nothing.
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