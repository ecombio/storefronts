// app/templates/blogs.$blogHandle.$articleHandle.tsx
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {extractShoppableProductIds, injectShoppableProducts} from '~/components/blogs/ProductGallery';
import {injectFaqSections} from '~/components/blogs/FaqSection';
import {withHeadingIds, TableOfContents} from '~/components/blogs/TableOfContents';
import {ProductCard} from '~/snippets/ProductCard';
import {Solo, Duo, Trio} from '~/components/blogs/ProductGallery';

import {ARTICLE_QUERY, SHOPPABLE_PRODUCTS_QUERY} from '~/graphql/blog/ArticleQuery';
import type {ProductCardFragment} from 'storefrontapi.generated';
import articleStyles from '~/assets/article.css?url';

export function links() {
  return [{rel: 'stylesheet', href: articleStyles}];
}

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.article.title ?? ''} article`}];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;

  const productIds = extractShoppableProductIds(article.contentHtml);
  let contentHtml = article.contentHtml;

  let shoppableProducts: [string, ProductCardFragment][] = [];

  if (productIds.length > 0) {
    const gids = productIds.map((id) => `gid://shopify/Product/${id}`);

    const {nodes} = await context.storefront.query(SHOPPABLE_PRODUCTS_QUERY, {
      variables: {ids: gids},
    });

    const productsById = new Map(
      productIds
        .map((id, i) => [id, nodes?.[i]] as const)
        .filter(
          (entry): entry is [string, ProductCardFragment] =>
            Boolean(entry[1]),
        ),
    );

    contentHtml = injectShoppableProducts(article.contentHtml, productsById);
    shoppableProducts = [...productsById.entries()];
  }
  // ...existing shoppable-embed block unchanged...

  contentHtml = injectFaqSections(contentHtml); // runs regardless of
  // whether shoppable products were present, since FAQ injection needs
  // no async data fetch (unlike the product-embed block above it).

  // Assigns ids to any h2/h3 that doesn't already have one and returns
  // the flat heading list TableOfContents renders from. Order relative
  // to the FAQ injection above doesn't matter — injectFaqSections only
  // ever touches the <script data-faq> marker, never h2/h3 tags, so
  // there's nothing for this pass to double-process either way.
  const {html: contentHtmlWithHeadingIds, headings: tocHeadings} =
    withHeadingIds(contentHtml);
  contentHtml = contentHtmlWithHeadingIds;

  return {article: {...article, contentHtml}, shoppableProducts, tocHeadings};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

// Describes one shoppable-embed slot found in the rendered article
// body: the DOM node to portal into, what layout it wants (single /
// solo / duo / trio), and which product IDs it references.
type ShoppableSlot = {
  el: HTMLElement;
  kind: string;
  ids: string[];
};

export default function ArticleTemplate() {
  const {article, shoppableProducts = [], tocHeadings} = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  // Ref to the container the raw article HTML is injected into, so we
  // can scan its actual DOM for shoppable slots after render.
  const bodyRef = useRef<HTMLDivElement>(null);

  // The shoppable slots discovered in the DOM (populated by the effect
  // below), used to know what to portal and where.
  const [slots, setSlots] = useState<ShoppableSlot[]>([]);

  // Human-readable published date, e.g. "September 2, 2026".
  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  // Layout variant resolution:
  // 1. Which blog this article lives in (hub = "category", spoke = "articles")
  // 2. An optional per-article metafield override (custom.layout_variant),
  //    for cases where a single blog needs more than one look (e.g. a
  //    "feature" article inside the normally-plain "articles" blog).
  // The metafield, when set, layers on top of - it doesn't replace - the
  // hub/spoke class, so both can drive CSS at once.
  const isHub = article.blog?.handle === 'category';
  const layoutVariant = article.layoutVariant?.value; // e.g. "feature" | undefined

  // Build the wrapper class list: base class, hub/spoke variant, and
  // an optional extra variant class — falsy entries filtered out so
  // there's never a stray "article--" or "article--null" in the DOM.
  const articleClassName = [
    'article',
    isHub ? 'article--hub' : 'article--spoke',
    layoutVariant ? `article--${layoutVariant}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  // dangerouslySetInnerHTML content lives outside the React tree, so any
  // <details id="..."> deep-linked via a URL hash (e.g. #faq-range)
  // needs to be opened imperatively - CSS :target can only fake the visual
  // state and leaves the item stuck open/unclosable. Re-run when contentHtml
  // changes (e.g. client-side navigation between articles).
  //
  // Uses getElementById rather than querySelector(hash) — a heading
  // whose text starts with a digit (e.g. "2. Understand motor types")
  // slugifies to an id like "2-understand-...", which is a perfectly
  // valid HTML id but NOT a valid CSS selector when used unescaped
  // with a leading "#". querySelector() throws a SyntaxError on that,
  // which crashed the whole page (500) instead of just failing to
  // scroll. getElementById takes a raw id string, no selector parsing
  // involved, so it has no such restriction.
  useEffect(() => {
    if (!window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
  }, [contentHtml]);

  // Finds each server-rendered shoppable-embed slot (rendered with the
  // hook-free Static* components in ~/components/blogs/ProductGallery)
  // and records it so the real, interactive component can be portaled
  // into it below.
  //
  // Deliberately NOT createRoot(el).render(...) here: that would spin up
  // a brand-new, disconnected React tree with no access to this app's
  // context providers (Router context for useNavigate(), the Aside
  // context for useAside(), cart context for CartForm's fetcher) - any
  // of those hooks throws immediately, the isolated root unmounts on
  // error, and the slot goes blank right after it briefly shows the
  // static SSR markup. createPortal keeps the interactive component
  // inside *this* component's tree (rendered below, alongside the rest
  // of this JSX) while still targeting the slot's DOM node, so it
  // inherits every provider this tree already has (via PageLayout in
  // root.tsx, which wraps the route's <Outlet />).
  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;

    const found: ShoppableSlot[] = [];

    // Look for every element the server marked as a shoppable slot.
    container
      .querySelectorAll<HTMLElement>('[data-shoppable-slot]')
      .forEach((el) => {
        // `data-shoppable-slot` holds the layout kind: single/solo/duo/trio.
        const kind = el.getAttribute('data-shoppable-slot');
        // `data-product-ids` holds a comma-separated list of numeric
        // product IDs for this slot; split and drop empty entries.
        const ids = (el.getAttribute('data-product-ids') ?? '')
          .split(',')
          .filter(Boolean);

        // Skip malformed slots (missing kind, or no product IDs).
        if (!kind || ids.length === 0) return;

        // Clear the static server-rendered markup - the portal below
        // renders the live replacement into this same node.
        el.innerHTML = '';
        found.push({el, kind, ids});
      });

    setSlots(found);
  }, [contentHtml]);

  // Keyed by numeric ID, matching the numeric IDs in each slot's
  // data-product-ids attribute (not product.id, a GID).
  const productsById = new Map(shoppableProducts);

  return (
    <div className={articleClassName}>
      <h1>{title}</h1>
      <div className="article-meta">
        <time dateTime={article.publishedAt}>{publishedDate}</time> &middot;{' '}
        <address>{author?.name}</address>
      </div>

      {/* Hero image, eagerly loaded since it's above the fold. */}
      {image && (
        <Image
          data={image}
          sizes="(min-width: 760px) 720px, 90vw"
          aspectRatio="16/9"
          crop="center"
          loading="eager"
        />
      )}

      {/* Body + TOC live in a two-column grid on desktop (see
          article-toc.css); h1/meta/hero above stay full-width. */}
      <div className="article-layout">
        {/* Raw article HTML from Shopify, with shoppable-embed markers
            already resolved and heading ids assigned by the loader
            above. bodyRef lets the effects above scan this DOM
            subtree once it's mounted. */}
        <div
          ref={bodyRef}
          dangerouslySetInnerHTML={{__html: contentHtml}}
          className="article-body"
        />

        <TableOfContents headings={tocHeadings} />
      </div>

      {/* For each discovered slot, build the appropriate interactive
          component and portal it into that slot's DOM node — replacing
          the static SSR markup that was cleared above. */}
      {slots.map(({el, kind, ids}) => {
        let node: React.ReactNode = null;

        switch (kind) {
          case 'single': {
            // A single standalone product card.
            const product = productsById.get(ids[0]);
            node = product ? <ProductCard product={product} /> : null;
            break;
          }
          case 'solo':
            // Single-product row layout (distinct styling from 'single').
            node = (
              <Solo productIds={[ids[0]]} productsById={productsById} />
            );
            break;
          case 'duo':
            // Two-product row layout.
            node = (
              <Duo
                productIds={[ids[0], ids[1]]}
                productsById={productsById}
              />
            );
            break;
          case 'trio':
            // Three-product row layout.
            node = (
              <Trio
                productIds={[ids[0], ids[1], ids[2]]}
                productsById={productsById}
              />
            );
            break;
        }

        // Nothing resolved for this slot (unknown kind, or the
        // product(s) weren't found) — render nothing rather than an
        // empty portal.
        if (!node) return null;

        // Portal the live component into the slot's DOM node. A
        // unique key (kind + ids) keeps portals stable across
        // re-renders of `slots`.
        return createPortal(node, el, `${kind}-${ids.join('-')}`);
      })}
    </div>
  );
}