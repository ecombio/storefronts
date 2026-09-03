// app/components/blogs/ProductSections.tsx
//
// Supersedes app/components/blogs/ProductGallery.tsx (now obsolete —
// delete that file once this one is wired into Article.tsx).
//
// Shoppable-product-embed system for blog articles, authored by
// marketers via the Shopify Blog Editor's HTML view. Renders four
// layouts:
//
//   1. Focus   — one product, large card                (1 product)
//   2. Grid    — 2x2 grid of products                    (2-4 products)
//   3. Gallery — heading + body copy, row of products     (1-4 products)
//   4. Text    — heading + body copy beside one product   (1 product)
//
// Same two-layer pattern as the old file:
//   - Interactive components (ProductFocus/Grid/Gallery/Text) — real,
//     hook-driven, used client-side and portaled into hydrated slots
//     by Article.tsx.
//   - Static* twins — hook-free, server-safe versions used ONLY by the
//     renderToStaticMarkup pass below. The real ProductCard can't
//     render there because it calls useNavigate(), useAside(), and
//     CartForm's internal fetcher hook, none of which have a provider
//     available inside the article loader's SSR string-injection pass.
//
// NOTE: kept as .tsx, not .ts — contains JSX.
//
// IMPORTANT — Article.tsx dependency:
// The hydration effect in app/sections/Article.tsx currently switches
// on the OLD kind strings ('single' | 'solo' | 'duo' | 'trio'). It
// needs to be updated to switch on 'focus' | 'grid' | 'gallery' |
// 'text' instead, and for 'gallery'/'text' it must read the
// data-heading / data-body attributes off the slot wrapper (both are
// encodeURIComponent-encoded) rather than re-scraping DOM text, since
// the wrapper's inner HTML is only the static render, not a reliable
// source for the original copy.
//
// NOTE: the legacy-marker support added below does NOT depend on that
// Article.tsx fix. renderMarker() always writes the slot's
// data-shoppable-slot attribute using the NEW kind string ('focus' /
// 'grid'), regardless of which marker attribute (new or legacy)
// matched — so a legacy `data-solo` marker produces the exact same
// data-shoppable-slot="focus" wrapper a native data-shoppable-focus
// marker would. Any code reading these slots only ever sees the new
// kind vocabulary.
//
// CHANGELOG (this pass):
//   - Added: legacy marker support (data-single / data-solo / data-duo
//     / data-trio) — see "Legacy markers" section below for why and
//     the assumptions involved.
//   - Fixed: StaticProductCard rendered NO link/button at all when
//     `selectedOrFirstAvailableVariant` was null/undefined (e.g. a
//     product with no variants indexed yet). It now always renders a
//     "View product" link to the product page, and only swaps in
//     "Sold out" text when a variant is present and confirmed
//     unavailable. This matches the "never render strictly less than
//     a plain link" contract the rest of this file follows for
//     unresolved/degraded state.

import {renderToStaticMarkup} from 'react-dom/server';
import {ProductCard} from '~/snippets/ProductCard';
import type {ProductCardFragment} from 'storefrontapi.generated';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type ProductsById = Map<string, ProductCardFragment>;

type FocusProps = {productId: string; productsById: ProductsById};
type GridProps = {productIds: string[]; productsById: ProductsById};
type GalleryProps = {
  heading?: string;
  body?: string;
  productIds: string[];
  productsById: ProductsById;
};
type TextProps = {
  heading?: string;
  body?: string;
  productId: string;
  productsById: ProductsById;
};

// ---------------------------------------------------------------------------
// Interactive components (client-side; real hooks, real context)
// ---------------------------------------------------------------------------

// Large single-card layout. CSS (product-section--focus) handles the
// bigger image/button treatment — structurally it's just a one-item
// row.
export function ProductFocus({productId, productsById}: FocusProps) {
  const product = productsById.get(productId);
  if (!product) return null;

  return (
    <div className="product-section product-section--focus">
      <ProductCard product={product} />
    </div>
  );
}

// 2x2 grid. Renders however many of the 2-4 requested IDs resolved —
// same graceful-degradation contract as the rest of this file.
export function ProductGrid({productIds, productsById}: GridProps) {
  const products = productIds
    .map((id) => productsById.get(id))
    .filter((p): p is ProductCardFragment => Boolean(p));

  if (products.length === 0) return null;

  return (
    <div
      className="product-section product-section--grid"
      data-columns={products.length}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Heading + body copy above a row of 1-4 products.
export function ProductGallery({
  heading,
  body,
  productIds,
  productsById,
}: GalleryProps) {
  const products = productIds
    .map((id) => productsById.get(id))
    .filter((p): p is ProductCardFragment => Boolean(p));

  if (products.length === 0) return null;

  return (
    <div className="product-section product-section--gallery">
      {(heading || body) && (
        <div className="product-section__copy">
          {heading && <h3 className="product-section__heading">{heading}</h3>}
          {body && (
            <div
              className="product-section__body"
              dangerouslySetInnerHTML={{__html: body}}
            />
          )}
        </div>
      )}
      <div
        className="product-section__row"
        data-columns={products.length}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

// Heading + body copy beside a single product card.
export function ProductWithText({heading, body, productId, productsById}: TextProps) {
  const product = productsById.get(productId);
  if (!product) return null;

  return (
    <div className="product-section product-section--text">
      {(heading || body) && (
        <div className="product-section__copy">
          {heading && <h3 className="product-section__heading">{heading}</h3>}
          {body && (
            <div
              className="product-section__body"
              dangerouslySetInnerHTML={{__html: body}}
            />
          )}
        </div>
      )}
      <ProductCard product={product} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StaticProductCard — hook-free, server-safe twin of ProductCard
// ---------------------------------------------------------------------------
//
// Folded in from the now-obsolete ProductGallery.tsx. Renders the same
// classes/markup as ProductCard so the page looks correct immediately;
// Article.tsx's hydration effect swaps each slot for the real,
// interactive ProductCard on the client.
//
// Deliberately omits: wishlist button, quick view button, compare
// checkbox, and the CartForm add-to-cart button — all need JS to do
// anything. The add-to-cart slot becomes a plain link to the product
// page instead.
//
// The reviews block (product-card__reviews) is kept as an empty
// placeholder to avoid a layout shift when hydration mounts the real
// StarRating (product-card.css gives it a fixed min-height above the
// pricing block).

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
  // Only show "Sold out" when we positively know the variant is
  // unavailable. No variant resolved at all (e.g. not indexed yet) is
  // NOT the same as confirmed sold out — default to the "View
  // product" link rather than guessing either way.
  const isConfirmedSoldOut = variant ? !variant.availableForSale : false;

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

        {/* Always render a link — even with no variant resolved, a
            plain "View product" link is strictly better than nothing.
            Previously this whole block was gated on `variant`, which
            meant a card with no indexed variant rendered no
            link/button at all. */}
        <div className="product-card__bottom-row">
          <a
            href={url}
            className="product-card__atc-btn"
            aria-disabled={isConfirmedSoldOut || undefined}
          >
            {isConfirmedSoldOut ? 'Sold out' : 'View product'}
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static section components (SSR-only; no hooks, no context — used
// below by injectShoppableProducts via renderToStaticMarkup)
// ---------------------------------------------------------------------------

function StaticProductFocus({productId, productsById}: FocusProps) {
  const product = productsById.get(productId);
  if (!product) return null;

  return (
    <div className="product-section product-section--focus">
      <StaticProductCard product={product} />
    </div>
  );
}

function StaticProductGrid({productIds, productsById}: GridProps) {
  const products = productIds
    .map((id) => productsById.get(id))
    .filter((p): p is ProductCardFragment => Boolean(p));

  if (products.length === 0) return null;

  return (
    <div
      className="product-section product-section--grid"
      data-columns={products.length}
    >
      {products.map((product) => (
        <StaticProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function StaticProductGallery({
  heading,
  body,
  productIds,
  productsById,
}: GalleryProps) {
  const products = productIds
    .map((id) => productsById.get(id))
    .filter((p): p is ProductCardFragment => Boolean(p));

  if (products.length === 0) return null;

  return (
    <div className="product-section product-section--gallery">
      {(heading || body) && (
        <div className="product-section__copy">
          {heading && <h3 className="product-section__heading">{heading}</h3>}
          {body && (
            <div
              className="product-section__body"
              dangerouslySetInnerHTML={{__html: body}}
            />
          )}
        </div>
      )}
      <div className="product-section__row" data-columns={products.length}>
        {products.map((product) => (
          <StaticProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function StaticProductWithText({heading, body, productId, productsById}: TextProps) {
  const product = productsById.get(productId);
  if (!product) return null;

  return (
    <div className="product-section product-section--text">
      {(heading || body) && (
        <div className="product-section__copy">
          {heading && <h3 className="product-section__heading">{heading}</h3>}
          {body && (
            <div
              className="product-section__body"
              dangerouslySetInnerHTML={{__html: body}}
            />
          )}
        </div>
      )}
      <StaticProductCard product={product} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marker extract/inject (server-side article HTML processing)
// ---------------------------------------------------------------------------
//
// Marker authoring contract (what a marketer types into the Shopify
// Blog Editor's HTML view):
//
//   Focus (1 product, no copy):
//     <div data-shoppable-focus="123"></div>
//
//   Grid (2-4 products, no copy):
//     <div data-shoppable-grid="123,456,789,012"></div>
//
//   Gallery (1-4 products, with copy):
//     <div data-shoppable-gallery="123,456,789">
//       <div data-shoppable-heading>Recommended</div>
//       <div data-shoppable-body>Body copy, may include &lt;p&gt; tags.</div>
//     </div>
//
//   Text (1 product, with copy):
//     <div data-shoppable-text="123">
//       <div data-shoppable-heading>Recommended</div>
//       <div data-shoppable-body>Body copy, may include &lt;p&gt; tags.</div>
//     </div>
//
// NOTE: both data-shoppable-heading and data-shoppable-body must be
// present for a gallery/text marker to match, even if you want one of
// them empty (e.g. <div data-shoppable-body></div> for a heading-only
// section). Omitting either div entirely — rather than leaving it
// empty — makes the whole marker fail to match, and per the
// fail-silent contract below it is then left untouched in the
// rendered page with no visible indication of why.
//
// Matching is strict, same philosophy as the old file: exact attribute
// name, digits-only comma-separated IDs within the kind's min/max
// count, no extra whitespace inside the id-list attribute, and — for
// gallery/text — exactly one data-shoppable-heading div followed by
// exactly one data-shoppable-body div as the only children. A marker
// that doesn't match is left untouched by extract (so it's never
// queried) and therefore also left untouched by inject (nothing to
// replace it with) — same "fail silently, don't show a broken card"
// behavior as a bad or deleted product ID.

type MarkerKind = 'focus' | 'grid' | 'gallery' | 'text';

type MarkerSpec = {
  attr: string;
  kind: MarkerKind;
  minIds: number;
  maxIds: number;
  hasContent: boolean; // wraps data-shoppable-heading / data-shoppable-body
};

// The full set of NEW, currently-documented markers. To add a new
// layout, this is the single place a new spec would be added —
// extract/inject both iterate MARKERS (below, which includes this
// list plus LEGACY_MARKERS) generically.
const CURRENT_MARKERS: MarkerSpec[] = [
  {attr: 'data-shoppable-focus', kind: 'focus', minIds: 1, maxIds: 1, hasContent: false},
  {attr: 'data-shoppable-grid', kind: 'grid', minIds: 2, maxIds: 4, hasContent: false},
  {attr: 'data-shoppable-gallery', kind: 'gallery', minIds: 1, maxIds: 4, hasContent: true},
  {attr: 'data-shoppable-text', kind: 'text', minIds: 1, maxIds: 1, hasContent: true},
];

// ---------------------------------------------------------------------------
// Legacy markers — backward compatibility with app/components/blogs/
// ProductGallery.tsx (the file this module supersedes; see this file's
// header comment).
//
// WHY THIS EXISTS: after the migration to ProductSections.tsx, at
// least one already-published article was found still using the OLD
// marker syntax (`<div data-solo="9468552413398"></div>`). Because
// extractShoppableProductIds/injectShoppableProducts previously only
// recognized the new `data-shoppable-*` attribute names, that marker:
//   1. Was never matched by extractShoppableProductIds, so its
//      product ID was never added to the batched product query.
//   2. Was therefore never rewritten by injectShoppableProducts into a
//      data-shoppable-slot wrapper.
//   3. Was left in the final HTML as an empty, inert <div> — which the
//      client-side hydration scan (which only looks for
//      [data-shoppable-slot]) has no way to find.
// Every step in that chain fails silently (per this file's existing
// "fail silently, don't show a broken card" philosophy for bad/
// deleted product IDs), so the embed just never appeared, with no
// error anywhere to point at.
//
// FIX: recognize the old attribute names here too, mapped onto the
// closest equivalent NEW kind. Because renderMarker() always writes
// the wrapper's data-shoppable-slot using the NEW kind string — never
// the attribute name that matched — a legacy marker below produces
// exactly the same data-shoppable-slot="focus"|"grid" markup a native
// data-shoppable-focus/grid marker would. No changes are needed
// anywhere else in this file, and no changes are needed to the
// client-side hydration switch in blogs.$blogHandle.$articleHandle.tsx
// (or the older Article.tsx, once it's updated per this file's
// "IMPORTANT — Article.tsx dependency" note above) — both already only
// need to understand the new kind vocabulary.
//
// ⚠️ ASSUMPTION FLAGGED FOR VERIFICATION — ProductGallery.tsx itself
// was not available when this mapping was written (it's described as
// already obsolete/slated for deletion), so the counts and shapes
// below are inferred purely from naming convention and the one
// real-world example we have (`data-solo="123"`, a single bare empty
// div with one product ID, no child markup):
//   - "solo"   -> 1 product  -> mapped to 'focus'
//   - "single" -> 1 product  -> mapped to 'focus'
//   - "duo"    -> 2 products -> mapped to 'grid'
//   - "trio"   -> 3 products -> mapped to 'grid'
// Two names ("single" and "solo") both implying "1 product" is a
// little odd, and could mean one of them actually carried
// heading/body copy the way gallery/text do now (hasContent: true)
// rather than being a plain duplicate. hasContent is set to `false`
// for all four below because that's what the one confirmed example
// looked like — if "single" (or any of these) turns out to need
// content support, add a `hasContent: true` legacy spec for it using
// the same `<div data-shoppable-heading>...</div><div
// data-shoppable-body>...</div>` child pattern gallery/text already
// use, and remove it from this list once ProductGallery.tsx's real
// contract has been checked (e.g. in version control history) or the
// affected articles have been re-authored with new markers and this
// whole legacy block can be deleted.
//
// Also note: legacy counts are modeled as fixed (minIds === maxIds)
// rather than a range, since there's no evidence any legacy marker
// ever accepted a variable number of IDs — "duo"/"trio" read as exact
// counts by name, unlike the new data-shoppable-grid, which
// deliberately supports 2-4.
const LEGACY_MARKERS: MarkerSpec[] = [
  {attr: 'data-single', kind: 'focus', minIds: 1, maxIds: 1, hasContent: false},
  {attr: 'data-solo', kind: 'focus', minIds: 1, maxIds: 1, hasContent: false},
  {attr: 'data-duo', kind: 'grid', minIds: 2, maxIds: 2, hasContent: false},
  {attr: 'data-trio', kind: 'grid', minIds: 3, maxIds: 3, hasContent: false},
];

// extract/inject both iterate this combined list, so a legacy marker
// is treated identically to a native one everywhere below — no
// separate code path, no separate regex builder, no separate render
// step.
const MARKERS: MarkerSpec[] = [...CURRENT_MARKERS, ...LEGACY_MARKERS];

// Builds the `\d+,\d+,...` alternation for an id-list attribute value,
// allowing anywhere from minIds to maxIds comma-separated digit runs.
function idListPattern(minIds: number, maxIds: number): string {
  if (minIds === maxIds) {
    return Array(minIds).fill(String.raw`\d+`).join(',');
  }
  // Build one alternative per allowed count, longest first so the
  // regex engine doesn't stop early on a shorter partial match.
  const alternatives: string[] = [];
  for (let n = maxIds; n >= minIds; n--) {
    alternatives.push(Array(n).fill(String.raw`\d+`).join(','));
  }
  return alternatives.join('|');
}

// Builds a strict matcher for one marker. Content-bearing markers
// (gallery/text) require exactly one heading div and one body div as
// the marker's only children; content-free markers (focus/grid, and
// every legacy marker per the assumption above) must be empty
// self-closing-style divs.
function markerRegex(spec: MarkerSpec): RegExp {
  const ids = `(${idListPattern(spec.minIds, spec.maxIds)})`;
  const pattern = spec.hasContent
    ? String.raw`<div ${spec.attr}="${ids}">\s*<div data-shoppable-heading>([\s\S]*?)<\/div>\s*<div data-shoppable-body>([\s\S]*?)<\/div>\s*<\/div>`
    : String.raw`<div ${spec.attr}="${ids}"><\/div>`;
  return new RegExp(pattern, 'g');
}

/**
 * Scans article HTML for every recognized marker type — current AND
 * legacy — and returns the deduped list of numeric product IDs
 * referenced, in first-seen order. Used by the loader to build the
 * batched SHOPPABLE_PRODUCTS_QUERY before rendering.
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
 * Replaces every recognized marker — current AND legacy — with its
 * server-rendered (static) section markup, wrapped in a
 * `[data-shoppable-slot]` container for client-side hydration. A
 * legacy marker's slot carries the same NEW kind string ('focus' /
 * 'grid') its mapped-to spec declares, so it's indistinguishable from
 * a native marker's slot by the time it reaches the client. Degrades
 * gracefully:
 *   - focus/text (and legacy solo/single): unresolved product ID ->
 *     marker dropped entirely
 *   - grid/gallery (and legacy duo/trio): renders with whichever IDs
 *     resolved; dropped entirely if none resolve
 * Markers that failed the strict pattern were never extracted, so
 * they simply aren't matched here either and are left as inert HTML.
 */
export function injectShoppableProducts(
  html: string,
  productsById: ProductsById,
): string {
  let result = html;

  for (const spec of MARKERS) {
    const regex = markerRegex(spec);
    result = result.replace(
      regex,
      (_full: string, idList: string, g2?: string, g3?: string) => {
        const heading = spec.hasContent ? g2?.trim() : undefined;
        const body = spec.hasContent ? g3?.trim() : undefined;
        return renderMarker(spec.kind, idList.split(','), heading, body, productsById);
      },
    );
  }

  return result;
}

// Renders one marker's replacement HTML: the inner section markup
// plus the outer data-shoppable-slot wrapper the client hydrates
// against. heading/body are stored on the wrapper URI-encoded (rather
// than left for the client to re-scrape from rendered text) so
// Article.tsx's hydration effect has the original copy verbatim, even
// though the static inner markup below is a plain rendered <h3>/<div>.
//
// `kind` here is always one of the NEW kind strings — see spec.kind on
// every entry in MARKERS, legacy included — never the original
// attribute name that matched, which is what lets a legacy marker
// hydrate through the exact same client-side path as a native one.
function renderMarker(
  kind: MarkerKind,
  ids: string[],
  heading: string | undefined,
  body: string | undefined,
  productsById: ProductsById,
): string {
  const inner = renderInner(kind, ids, heading, body, productsById);
  // Nothing could be rendered (e.g. the sole product ID for a focus/
  // text marker didn't resolve) -> drop the marker entirely rather
  // than emitting an empty wrapper div.
  if (!inner) return '';

  const attrs = [`data-shoppable-slot="${kind}"`, `data-product-ids="${ids.join(',')}"`];
  if (heading) attrs.push(`data-heading="${encodeURIComponent(heading)}"`);
  if (body) attrs.push(`data-body="${encodeURIComponent(body)}"`);

  return `<div ${attrs.join(' ')}>${inner}</div>`;
}

// Renders the actual section markup for a marker, using the hook-free
// Static* components so this works during a plain string-rendering
// pass with no React context available.
function renderInner(
  kind: MarkerKind,
  ids: string[],
  heading: string | undefined,
  body: string | undefined,
  productsById: ProductsById,
): string {
  switch (kind) {
    case 'focus':
      return renderToStaticMarkup(
        <StaticProductFocus productId={ids[0]} productsById={productsById} />,
      );
    case 'grid':
      return renderToStaticMarkup(
        <StaticProductGrid productIds={ids} productsById={productsById} />,
      );
    case 'gallery':
      return renderToStaticMarkup(
        <StaticProductGallery
          heading={heading}
          body={body}
          productIds={ids}
          productsById={productsById}
        />,
      );
    case 'text':
      return renderToStaticMarkup(
        <StaticProductWithText
          heading={heading}
          body={body}
          productId={ids[0]}
          productsById={productsById}
        />,
      );
  }
}