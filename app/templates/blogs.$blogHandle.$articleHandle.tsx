// app/templates/blogs.$blogHandle.$articleHandle.tsx
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {extractShoppableProductIds, injectShoppableProducts} from '~/components/blogs/ProductGallery';
import {injectFaqSections} from '~/components/blogs/FaqSection';
import {withHeadingIds, TableOfContents, isTocEnabled} from '~/components/blogs/TableOfContents';
import {AuthorSection, getAuthorSectionData} from '~/components/blogs/AuthorSection';
import {injectNewsletterForm, NewsletterForm} from '~/components/blogs/NewsletterForm';
import {ProductCard} from '~/snippets/ProductCard';
import {Solo, Duo, Trio} from '~/components/blogs/ProductGallery';

import {ARTICLE_QUERY, SHOPPABLE_PRODUCTS_QUERY} from '~/graphql/blog/ArticleQuery';
import type {ProductCardFragment} from 'storefrontapi.generated';
import articleStyles from '~/assets/article.css?url';
import authorSectionStyles from '~/assets/article-author.css?url';
// newsletter-form.css is NOT imported here — it now loads globally
// via root.tsx (see the ADDED comment there), since the
// data-newsletter-form marker is reusable outside blog articles too.

export function links() {
  return [
    {rel: 'stylesheet', href: articleStyles},
    {rel: 'stylesheet', href: authorSectionStyles},
  ];
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

  // Rewrites data-newsletter-form markers into a static, no-JS-
  // required form wrapped in a data-newsletter-slot node (see
  // NewsletterForm.tsx). Pure string transform, no data fetch needed
  // — same reasoning as running this alongside injectFaqSections
  // rather than the product-embed block above. Runs before the
  // heading-id pass below for consistency with that ordering, though
  // it doesn't touch h2/h3 tags either, so the order isn't load-
  // bearing.
  contentHtml = injectNewsletterForm(contentHtml);

  // Whether the TOC should render at all for this article — defaults
  // to off (see isTocEnabled in TableOfContents.tsx), same off-by-
  // default pattern as authorSection below. Resolved before the
  // heading-id pass so we can skip that pass entirely when disabled:
  // no point scanning/rewriting for headings nobody will see links to.
  const tocEnabled = isTocEnabled(article);

  // Assigns ids to any h2/h3 that doesn't already have one and returns
  // the flat heading list TableOfContents renders from. Order relative
  // to the FAQ/newsletter injection above doesn't matter — neither of
  // those passes ever touches an h2/h3 tag, so there's nothing for
  // this pass to double-process either way.
  let tocHeadings: ReturnType<typeof withHeadingIds>['headings'] = [];

  if (tocEnabled) {
    const {html: contentHtmlWithHeadingIds, headings} =
      withHeadingIds(contentHtml);
    contentHtml = contentHtmlWithHeadingIds;
    tocHeadings = headings;
  }

  // Resolves the show_author_section / author_bio / author_avatar
  // metafields (added to ARTICLE_QUERY — see README.md) into render-
  // ready data, or null if the section shouldn't appear at all (see
  // AuthorSection.tsx for the exact gating rules).
  const authorSection = getAuthorSectionData(article);

  return {
    article: {...article, contentHtml},
    shoppableProducts,
    tocEnabled,
    tocHeadings,
    authorSection,
  };
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

// Describes one newsletter-form slot found in the rendered article
// body: the DOM node to portal into, plus the heading/subheading
// resolved server-side by injectNewsletterForm (read back off the
// slot's data attributes rather than re-parsed from scratch).
type NewsletterSlot = {
  el: HTMLElement;
  heading: string;
  subheading: string;
};

export default function ArticleTemplate() {
  const {
    article,
    shoppableProducts = [],
    tocEnabled,
    tocHeadings,
    authorSection,
  } = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  // Ref to the container the raw article HTML is injected into, so we
  // can scan its actual DOM for shoppable/newsletter slots after render.
  const bodyRef = useRef<HTMLDivElement>(null);

  // The shoppable slots discovered in the DOM (populated by the effect
  // below), used to know what to portal and where.
  const [slots, setSlots] = useState<ShoppableSlot[]>([]);

  // The newsletter-form slots discovered in the DOM, same idea as
  // `slots` above but kept separate since the data shape (heading/
  // subheading vs kind/product ids) and the component portaled in
  // are both different.
  const [newsletterSlots, setNewsletterSlots] = useState<NewsletterSlot[]>(
    [],
  );

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

  // Body + TOC grid class — collapses to a single column (no reserved
  // 240px sidebar gutter) whenever the TOC is disabled, via the
  // .article-layout--no-toc rule in article-toc.css.
  const articleLayoutClassName = [
    'article-layout',
    tocEnabled ? null : 'article-layout--no-toc',
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

  // Finds each server-rendered shoppable-embed and newsletter-form slot
  // (rendered with the hook-free Static* components in
  // ~/components/blogs/ProductGallery, and the static <form> from
  // injectNewsletterForm respectively) and records them so the real,
  // interactive components can be portaled into them below.
  //
  // Deliberately NOT createRoot(el).render(...) here: that would spin up
  // a brand-new, disconnected React tree with no access to this app's
  // context providers (Router context for useNavigate()/useFetcher(),
  // the Aside context for useAside(), cart context for CartForm's
  // fetcher) - any of those hooks throws immediately, the isolated root
  // unmounts on error, and the slot goes blank right after it briefly
  // shows the static SSR markup. createPortal keeps the interactive
  // component inside *this* component's tree (rendered below, alongside
  // the rest of this JSX) while still targeting the slot's DOM node, so
  // it inherits every provider this tree already has (via PageLayout in
  // root.tsx, which wraps the route's <Outlet />). The newsletter form's
  // useFetcher() needs exactly this same Router context, which is why
  // it's scanned/portaled the same way rather than mounted separately.
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

    const foundNewsletters: NewsletterSlot[] = [];

    // Look for every element the server marked as a newsletter-form
    // slot (see injectNewsletterForm in NewsletterForm.tsx).
    container
      .querySelectorAll<HTMLElement>('[data-newsletter-slot]')
      .forEach((el) => {
        const heading =
          el.getAttribute('data-newsletter-heading') ?? 'Join the newsletter';
        const subheading = el.getAttribute('data-newsletter-subheading') ?? '';

        // Clear the static server-rendered form - the portal below
        // renders the live, fetcher-backed replacement into this same
        // node. The static form remains fully functional (real POST)
        // right up until this swap happens.
        el.innerHTML = '';
        foundNewsletters.push({el, heading, subheading});
      });

    setNewsletterSlots(foundNewsletters);
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

      {/* Body + TOC live in a two-column grid on desktop when the TOC
          is enabled (see article-toc.css); collapses to one column via
          --no-toc when it's not. h1/meta/hero above stay full-width. */}
      <div className={articleLayoutClassName}>
        {/* Raw article HTML from Shopify, with shoppable-embed and
            newsletter-form markers already resolved and heading ids
            assigned by the loader above. bodyRef lets the effects
            above scan this DOM subtree once it's mounted. */}
        <div
          ref={bodyRef}
          dangerouslySetInnerHTML={{__html: contentHtml}}
          className="article-body"
        />

        {/* Only rendered when the editor has explicitly set
            custom.show_toc = true (see isTocEnabled). Defaults off —
            an article with h2/h3 headings but no metafield set shows
            no TOC. TableOfContents also no-ops on an empty headings
            list, but gating here keeps intent explicit and avoids
            mounting the component (and its scroll-spy effect) at all
            when it's disabled. */}
        {tocEnabled && <TableOfContents headings={tocHeadings} />}
      </div>

      {/* For each discovered shoppable slot, build the appropriate
          interactive component and portal it into that slot's DOM
          node — replacing the static SSR markup that was cleared
          above. */}
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

      {/* For each discovered newsletter-form slot, portal the live,
          fetcher-backed <NewsletterForm> in — replacing the static
          server-rendered form that was cleared above. Keyed by the
          slot's position among newsletter slots, since (unlike
          shoppable slots) there's no natural id to key on — an
          article can repeat the same heading/subheading in more than
          one placement. */}
      {newsletterSlots.map(({el, heading, subheading}, i) =>
        createPortal(
          <NewsletterForm data={{heading, subheading}} />,
          el,
          `newsletter-${i}`,
        ),
      )}

      {/* "About the author" card, bottom of the article. Only renders
          when the editor has both flipped show_author_section on AND
          filled in a bio — see getAuthorSectionData() for the exact
          gating rules. No metafields set at all → authorSection is
          null → nothing renders here, same as before this feature
          existed. */}
      {authorSection && <AuthorSection data={authorSection} />}
    </div>
  );
}