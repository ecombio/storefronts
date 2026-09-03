// app/templates/blogs.$blogHandle.$articleHandle.tsx
//
// Route for a single blog article (e.g. /blogs/news/my-article). The
// loader does most of the heavy lifting: it fetches the article, then
// runs a pipeline of string-transform passes over its raw contentHtml
// to resolve editor-authored markers (shoppable products, CTA buttons,
// pull-quotes, recipe headers, two-column layout, FAQs, newsletter
// form, video embeds, image galleries) into real markup, and assigns
// heading ids for the optional table of contents. The component then
// renders that HTML via dangerouslySetInnerHTML and, for the marker
// types that need live React behavior (shoppable cards, newsletter
// form, video, gallery), scans the rendered DOM for the slots the
// loader left behind and portals the real interactive components into
// them client-side. CTA buttons, pull-quotes, and recipe headers are
// the exception — they resolve to fully static markup with no slot
// and no hydration step (see button.tsx / button.md, Quote.tsx /
// quote.md, and RecipeHeader.tsx / recipe-header.md for the marker
// syntax editors use in the Shopify blog editor).
//
// Shoppable-product embeds now come from ~/components/blogs/
// ProductSections (focus / grid / gallery / text layouts), which
// supersedes the old ProductGallery.tsx (single / solo / duo / trio).
// See ProductSections.tsx's header comment for the marker authoring
// contract and the static/interactive component split. The slot type,
// scan effect, and portal switch below were updated to match its
// 'focus' | 'grid' | 'gallery' | 'text' kinds and to read the
// data-heading / data-body attributes it writes for gallery/text
// slots (both encodeURIComponent-encoded, decoded back out at scan
// time rather than re-scraped from the static inner markup).
//
// "Related blogs" (bottom of article, below the author section) is a
// third shape again — not a marker/portal block, since it isn't
// placed inline by an editor. It follows AuthorSection's shape
// instead: gating fn + loader-side data resolver + presentational
// component, rendered directly. Unlike every other block on this
// route, RelatedBlogPosts.tsx is the single source of truth for its
// whole feature — gating, the candidate-pool GraphQL query, the
// curated+fallback merge logic, AND the component all live in that
// one file (see related-blog-posts.md for setup instructions), so
// this route only ever imports from that one path for the feature.
//
// "Summary" ("Key takeaways") is a fourth shape: authored via a
// data-summary-embed marker like FAQ/quote/CTA, but NOT rendered
// inline where that marker appears. It's pulled out of the body
// entirely in the loader (extractSummarySection) and, whenever a
// valid marker is found, rendered as its own static block at the
// very top of the article — below the hero image, above the
// body/TOC grid — regardless of where in the body the editor placed
// the marker. No metafield gate: the marker is hand-authored, so its
// presence is itself the signal to render it. See Summary.tsx /
// Summary.md for the marker syntax and editor-facing guidelines.
//
// "Social sharing" follows AuthorSection's shape too — no marker, no
// portal, no DOM-scanning effect. Its inputs (article title, hero
// image, and the page's own canonical URL) are already available in
// the route/loader rather than embedded in the rich text body, so
// editors have no control over its placement — it's a fixed section
// rendered right after the body/TOC grid, directly above
// AuthorSection. See SocialShare.tsx / social-share.md for the
// component, its (currently no-op until ARTICLE_QUERY grows the
// metafield) opt-out gating, and setup notes.
import {ARTICLE_QUERY, SHOPPABLE_PRODUCTS_QUERY} from '~/graphql/blog/ArticleQuery';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {Image} from '@shopify/hydrogen';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {
  extractShoppableProductIds,
  injectShoppableProducts,
  ProductFocus,
  ProductGrid,
  ProductGallery as ProductGallerySection,
  ProductWithText,
} from '~/components/blogs/ProductSections';
import {injectFaqSections} from '~/components/blogs/FaqSection';
import {injectTwoColumnContent} from '~/components/blogs/TwoColumnContent';
import {withHeadingIds, TableOfContents, isTocEnabled} from '~/components/blogs/TableOfContents';
import {AuthorSection, getAuthorSectionData} from '~/components/blogs/AuthorSection';
import SocialShare, {isSocialShareEnabled} from '~/components/blogs/SocialShare';
import RelatedBlogPosts, {
  getRelatedPostsData,
  RELATED_POSTS_CANDIDATES_QUERY,
} from '~/components/blogs/RelatedBlogPosts';
import {
  injectNewsletterForm,
  NewsletterForm,
  DEFAULT_HEADING as NEWSLETTER_DEFAULT_HEADING,
  DEFAULT_SUBHEADING as NEWSLETTER_DEFAULT_SUBHEADING,
} from '~/components/blogs/NewsletterForm';
import Video, {injectVideoEmbeds, readVideoSlot} from '~/components/blogs/Video';
import ImagesGallery, {
  injectImagesGallery,
  readGallerySlot,
  type GalleryImage,
} from '~/components/blogs/ImagesGallery';
import {injectBlogButtons} from '~/components/blogs/Button';
import {injectQuoteEmbeds} from '~/components/blogs/Quote';
import {injectRecipeHeader} from '~/components/blogs/RecipeHeader';
import {
  extractSummarySection,
  renderSummary,
} from '~/components/blogs/Summary';
import type {ProductCardFragment} from 'storefrontapi.generated';
import articleStyles from '~/assets/article.css?url';
import articleTocStyles from '~/assets/article-toc.css?url';
import authorSectionStyles from '~/assets/article-author.css?url';
import twoColumnContentStyles from '~/assets/two-column-content.css?url';
import videoStyles from '~/assets/video.css?url';
import galleryStyles from '~/components/blogs/ImagesGallery.css?url';
import blogButtonStyles from '~/components/blogs/Button.css?url';
import quoteStyles from '~/assets/quote.css?url';
import recipeHeaderStyles from '~/assets/recipe-header.css?url';
import newsletterFormStyles from '~/assets/newsletter-form.css?url';
import relatedBlogPostsStyles from '~/assets/related-blog-posts.css?url';
import blogPostCardStyles from '~/assets/blog-post-card.css?url';
import summaryStyles from '~/assets/summary.css?url';
import socialShareStyles from '~/assets/social-share.css?url';
// newsletter-form.css moved HERE from root.tsx (previously loaded
// globally there, on the reasoning that the data-newsletter-form
// marker might be used outside blog articles). In practice the marker
// is only ever authored inside a blog article body, so it now follows
// the same route-scoped ?url + links() convention as
// blog-button.css/quote.css below, rather than shipping on every page
// on the site. If a non-blog surface starts using
// injectNewsletterForm/<NewsletterForm> later, that surface should
// import newsletter-form.css itself the same way this route does —
// not force it back onto every route via root.tsx.
// two-column-content.css stays route-scoped, same reasoning as
// article.css/article-author.css: the data-two-col marker only ever
// appears inside a blog article body, unlike the newsletter marker.
// video.css stays route-scoped too, same reasoning: the
// data-video-embed marker (see video.tsx) only ever appears
// inside a blog article body.
// ImagesGallery.css stays route-scoped for the same reason again: the
// data-gallery-embed marker (see ImagesGallery.tsx) only ever appears
// inside a blog article body. Unlike video.css, ImagesGallery.css also has
// to style the STATIC server-rendered grid (see injectImagesGallery),
// not just the hydrated component, since the grid is visible and
// functional before any JS runs.
// Button.css is ALSO explicitly linked here rather than relying
// solely on Button.tsx's own bare side-effect import (`import
// './Button.css'` at the top of Button.tsx). That side-effect import
// covers <BlogButton> usages mounted directly in JSX elsewhere in the
// route tree (e.g. inside AuthorSection), but injectBlogButtons()
// below is a pure server-side string transform with no component in
// the React tree for this route — nothing guarantees its CSS
// dependency is included in *this* route's client bundle unless we
// say so explicitly, so we do, matching every other route-scoped
// stylesheet's ?url + links() convention here. Same "only ever
// appears inside a blog article body" scoping reasoning as the
// marker-based stylesheets above, per Button.tsx's own header comment
// (usage is scoped to blog articles + AuthorSection, unlike the
// newsletter form). Redundant with the side-effect import in any case
// where both fire on this route — harmless, since it's the same
// stylesheet deduped by the browser. Now co-located at
// ~/components/blogs/Button.css — same placement convention as
// ImagesGallery.css next to ImagesGallery.tsx — rather than living
// under app/assets/ like the marker-only stylesheets (quote.css,
// recipe-header.css) that have no component counterpart. The
// stylesheet was previously app/assets/blog-button.css; that file has
// been removed now that this route and Button.tsx both point here
// instead.
// quote.css is route-scoped for the same reason as Button.css:
// the data-quote-embed marker only ever appears inside a blog article
// body, and injectQuoteEmbeds() is a pure server-side string transform
// with no component in this route's React tree, so nothing guarantees
// its CSS ships in this route's client bundle unless we say so
// explicitly here.
// recipe-header.css is route-scoped for the same reason as
// Button.css/quote.css: the data-recipe-header marker only ever
// appears inside a blog article body, and injectRecipeHeader() is a
// pure server-side string transform with no component in this
// route's React tree, so nothing guarantees its CSS ships in this
// route's client bundle unless we say so explicitly here.
// newsletter-form.css follows that same "only ever appears inside a
// blog article body, and its injector has no component in this
// route's React tree" reasoning too now that it's scoped here instead
// of root.tsx — see the note above.
// related-blog-posts.css is route-scoped for the same "only ever
// appears on this route" reasoning as article-author.css: unlike the
// marker-based stylesheets above, <RelatedBlogPosts> IS a component
// directly in this route's React tree (same as <AuthorSection>), so
// in principle its styles could be pulled in via a bare side-effect
// import inside RelatedBlogPosts.tsx instead — but every other
// directly-rendered block in this route (AuthorSection, TableOfContents)
// links its stylesheet explicitly here rather than relying on that, so
// this follows the same convention rather than introducing a new one.
// This file now covers ONLY the section wrapper + grid — card-level
// styles were split out to blog-post-card.css (see below) when
// BlogPostCard.tsx was extracted into its own reusable component.
// blog-post-card.css is linked separately (not folded into
// related-blog-posts.css) for the same reason BlogPostCard.tsx is its
// own file and not inlined into RelatedBlogPosts.tsx: <BlogPostCard>
// is meant to be renderable from other routes/sections later (a blog
// index page, a "recent posts" widget, etc.), each of which would
// need this stylesheet without needing related-blog-posts.css's
// section/grid rules. It's linked here because THIS route happens to
// render it (via <RelatedBlogPosts>) — a future route rendering
// <BlogPostCard> directly would link it the same way, independently.
// summary.css is route-scoped for the same "only ever appears on this
// route" reasoning as related-blog-posts.css/article-author.css.
// Unlike the marker-based stylesheets above (Button.css,
// quote.css), the summary box is not rendered via
// dangerouslySetInnerHTML alongside the rest of the article body — it
// is resolved in the loader (extractSummarySection + renderSummary in
// Summary.tsx) and rendered directly in this component's JSX, right
// after the hero image — but it is still a raw HTML string rendered
// via dangerouslySetInnerHTML rather than a real component, so its
// CSS still needs to be linked explicitly here rather than riding
// along with a component's own side-effect import, same reasoning as
// Button.css/quote.css.
// social-share.css is route-scoped for the same "only ever appears on
// this route" reasoning as related-blog-posts.css/article-author.css.
// <SocialShare> IS a component directly in this route's React tree
// (same as <AuthorSection>/<RelatedBlogPosts>), so it's linked
// explicitly here rather than via a side-effect import, matching the
// convention every other directly-rendered block in this route
// follows.
//
// product-sections.css is NOT linked here, unlike the marker
// stylesheets above — it's imported directly in root.tsx alongside product-card.css, since
// .product-card's own internals (image/title/price/button) already
// live there and this file only adds the per-layout arrangement rules
// on top. It is intentionally absent from this route's links() array.

// Route-scoped stylesheets — Remix/React Router collects these via
// links() and injects <link> tags only when this route is active, so
// blog-article-only CSS never ships on unrelated pages.
export function links() {
  return [
    {rel: 'stylesheet', href: articleStyles},
    {rel: 'stylesheet', href: articleTocStyles},
    {rel: 'stylesheet', href: authorSectionStyles},
    {rel: 'stylesheet', href: twoColumnContentStyles},
    {rel: 'stylesheet', href: videoStyles},
    {rel: 'stylesheet', href: galleryStyles},
    {rel: 'stylesheet', href: blogButtonStyles},
    {rel: 'stylesheet', href: quoteStyles},
    {rel: 'stylesheet', href: recipeHeaderStyles},
    {rel: 'stylesheet', href: newsletterFormStyles},
    {rel: 'stylesheet', href: relatedBlogPostsStyles},
    {rel: 'stylesheet', href: blogPostCardStyles},
    {rel: 'stylesheet', href: summaryStyles},
    {rel: 'stylesheet', href: socialShareStyles},
  ];
}

// Page <title>, driven off the loaded article. Optional-chained/
// defaulted to '' since meta() can run before the loader resolves in
// some error/boundary states.
export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.article.title ?? ''} article`}];
};

// Standard Hydrogen loader split: critical data is awaited before the
// page renders (needed for meta/SEO and to avoid layout shift), while
// loadDeferredData is for anything safe to stream in after first
// paint. Currently nothing is deferred for this route (see below).
export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;

  // Both route params are required to look anything up — missing
  // either one means a malformed URL, not a valid "not found" article.
  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  // Fetched together: the article itself, and a same-blog candidate
  // pool for the related-posts tag-based fallback (see
  // RELATED_POSTS_CANDIDATES_QUERY, exported alongside the component
  // from RelatedBlogPosts.tsx / related-blog-posts.md). The
  // candidate query doesn't depend on anything from the article
  // response — both only need blogHandle — so there's no reason to
  // sequence them; running them in parallel here is what actually
  // uses Promise.all for concurrency, rather than the previous
  // single-query placeholder shape.
  const [{blog}, {blog: candidateBlog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
    context.storefront.query(RELATED_POSTS_CANDIDATES_QUERY, {
      // Fetches a window comfortably larger than the 3-post limit
      // getRelatedPostsData renders with, since ranking by shared
      // tags happens over whatever this returns — see
      // related-blog-posts.md §3 for why this can't be done
      // server-side.
      variables: {blogHandle, first: 20},
    }),
  ]);

  // No blog, or blog exists but has no article at this handle — both
  // are a 404, not just a missing article.
  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  // Shopify content can be localized under a different handle per
  // market/language; if the requested handle isn't the canonical one
  // for the resolved locale, this redirects to the canonical URL
  // (SEO/duplicate-content hygiene) rather than silently serving
  // content under the "wrong" handle.
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

  // Scan the raw article HTML for shoppable-product markers (see
  // ProductSections.tsx) and collect the numeric product IDs they
  // reference, so they can be fetched in one batched query rather
  // than one request per marker.
  const productIds = extractShoppableProductIds(article.contentHtml);
  let contentHtml = article.contentHtml;

  // Pairs of [numeric id, resolved product]; stays empty when the
  // article has no shoppable markers, so nothing downstream needs to
  // special-case "no products".
  let shoppableProducts: [string, ProductCardFragment][] = [];

  if (productIds.length > 0) {
    // Shopify's numeric product IDs need to be turned into full GIDs
    // before they're usable in a GraphQL `ids` filter.
    const gids = productIds.map((id) => `gid://shopify/Product/${id}`);

    const {nodes} = await context.storefront.query(SHOPPABLE_PRODUCTS_QUERY, {
      variables: {ids: gids},
    });

    // Re-key the fetched nodes back to the original numeric ids (the
    // order/format the markers use), dropping any id the query
    // couldn't resolve (deleted/unpublished product) rather than
    // carrying a null/undefined entry forward.
    const productsById = new Map(
      productIds
        .map((id, i) => [id, nodes?.[i]] as const)
        .filter(
          (entry): entry is [string, ProductCardFragment] =>
            Boolean(entry[1]),
        ),
    );

    // Replace each shoppable marker in the HTML with its resolved
    // static section markup (see ProductSections.tsx for the
    // marker → markup transform: focus / grid / gallery / text).
    contentHtml = injectShoppableProducts(article.contentHtml, productsById);
    shoppableProducts = [...productsById.entries()];
  }

  // Pulls the data-summary-embed marker (if any) out of the body
  // entirely and returns it separately — a summary box is rendered
  // as its own top-of-article block (see below), not inline where the
  // editor happened to place the marker. Runs here, before
  // injectBlogButtons/injectQuoteEmbeds/injectRecipeHeader/
  // injectTwoColumnContent, so a summary marker can never be mistaken
  // for content nested inside a button/quote/recipe-header/two-col
  // block by those passes' parsing — by the time any of them run, the
  // marker is already gone from contentHtml.
  //
  // Always extracted (regardless of the metafield below) so a marker
  // an editor leaves in the body is stripped either way — otherwise
  // toggling custom.show_summary off after publishing would leave
  // raw, unstyled <li>/<p> markup sitting in the article body.
  const {html: contentHtmlWithoutSummary, summary} =
    extractSummarySection(contentHtml);
  contentHtml = contentHtmlWithoutSummary;

  // Renders whenever a valid data-summary-embed marker was found —
  // no metafield gate. The marker is authored by hand (never
  // auto-generated), so its presence in the article body is itself
  // the editor's signal to show it.
  const summaryHtml = summary ? renderSummary(summary) : null;

  // Resolves data-cta button markers (see button.tsx / button.md for
  // marker syntax) into real <a class="blog-cta ..."> markup. Runs
  // here, before injectTwoColumnContent, for the same reason the
  // shoppable-embed pass runs before it: a CTA marker's output is a
  // self-contained <div class="blog-cta-row">...</div>, so resolving
  // it first keeps two-column's div-depth counting accurate if a
  // button marker is ever nested inside a column. No async data fetch
  // needed — pure string transform, same shape as the FAQ/newsletter/
  // video/gallery passes below, just ordered earlier to match the
  // shoppable-embed precedent. Fully static output — no slot, no
  // client-side scan/portal step needed (see button.tsx header
  // comment for why).
  contentHtml = injectBlogButtons(contentHtml);

  // Resolves data-quote-embed markers (see Quote.tsx / quote.md for
  // marker syntax) into a static <figure class="quote ..."> card. Runs
  // here, immediately after injectBlogButtons, for the same reason:
  // its output is a self-contained node, so resolving it before
  // injectTwoColumnContent keeps that pass's div-depth counting
  // accurate if a quote marker is ever nested inside a column. No
  // async data fetch needed — pure string transform, same shape as
  // the FAQ/newsletter/video/gallery passes below. Fully static
  // output — no slot, no client-side scan/portal step needed (see
  // Quote.tsx header comment for why).
  contentHtml = injectQuoteEmbeds(contentHtml);

  // Resolves data-recipe-header markers (see RecipeHeader.tsx /
  // recipe-header.md for marker syntax) into a static, print-ready
  // recipe info card. Runs here, alongside injectBlogButtons/
  // injectQuoteEmbeds, for the same reason: its output is a
  // self-contained node (an optional shared <script> plus a
  // <div class="recipe-header">), so resolving it before
  // injectTwoColumnContent keeps that pass's div-depth counting
  // accurate if a recipe header is ever nested inside a column. No
  // async data fetch needed — pure string transform, same shape as
  // the button/quote passes. Fully static output — no slot, no
  // client-side scan/portal step needed (see RecipeHeader.tsx header
  // comment for why).
  contentHtml = injectRecipeHeader(contentHtml);

  // Normalizes data-two-col marker blocks into two-column grid markup
  // (see TwoColumnContent.tsx for the marker syntax). Pure string
  // transform, no data fetch needed — runs right after the CTA
  // button/quote/recipe-header passes so a shoppable-product, button,
  // quote, or recipe-header marker nested inside a column is already
  // resolved to its real markup by the time this pass counts div
  // depth. Not required for correctness (the depth-counting is
  // content-agnostic either way) but keeps transform order matching
  // how these blocks typically appear structurally in an article.
  contentHtml = injectTwoColumnContent(contentHtml);

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

  // Rewrites data-video-embed markers into a data-video-slot node
  // (see video.tsx) the client hydrates into the real <Video>
  // component via portal — same reasoning and same "no async data
  // fetch" shape as injectNewsletterForm just above, so it runs
  // alongside it. Unlike the newsletter form, there's no meaningful
  // static/no-JS version of the slot to render server-side (the
  // pre-activation poster + play button only does anything once
  // hydrated), so the slot starts empty and stays empty until the
  // portal below fills it in.
  contentHtml = injectVideoEmbeds(contentHtml);

  // Rewrites data-gallery-embed markers into a data-gallery-slot node
  // (see ImagesGallery.tsx) the client hydrates into the real
  // <ImagesGallery> component via portal — same "no async data fetch"
  // shape as injectNewsletterForm/injectVideoEmbeds, so it runs
  // alongside them. Unlike video, but like the newsletter form, there
  // IS a meaningful static/no-JS version: the marker's <img> tags are
  // parsed and re-rendered as a real, working thumbnail grid (each
  // thumbnail links straight to its full-size image) before hydration
  // swaps in the interactive lightbox. Runs after injectVideoEmbeds
  // so a gallery marker isn't accidentally matched by the broader
  // video div-scanning if the two ever get nested in an article body;
  // order isn't otherwise load-bearing.
  contentHtml = injectImagesGallery(contentHtml);

  // Whether the TOC should render at all for this article — defaults
  // to off (see isTocEnabled in TableOfContents.tsx), same off-by-
  // default pattern as authorSection below. Resolved before the
  // heading-id pass so we can skip that pass entirely when disabled:
  // no point scanning/rewriting for headings nobody will see links to.
  const tocEnabled = isTocEnabled(article);

  // Assigns ids to any h2/h3 that doesn't already have one and returns
  // the flat heading list TableOfContents renders from. Order relative
  // to the CTA/quote/recipe-header/two-col/FAQ/newsletter/video/
  // gallery injection above doesn't matter — none of those passes
  // ever touch an h2/h3 tag, so there's nothing for this pass to
  // double-process either way. (A heading nested inside a two-col
  // column is still just an h2/h3 in the final HTML by this point, so
  // it gets an id and a TOC entry like any other.) The summary block
  // is unaffected either way — by this point it's already been
  // extracted out of contentHtml entirely and lives in summaryHtml
  // instead.
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

  // Resolves custom.show_related_posts / custom.related_blog_posts
  // (added to ARTICLE_QUERY — see related-blog-posts.md §2) plus the
  // candidateBlog pool fetched above into render-ready related-posts
  // data, merging curated picks with tag-ranked fallback candidates —
  // or null if the section shouldn't appear at all (see
  // RelatedBlogPosts.tsx for the exact merge logic). Independent of
  // contentHtml/tocHeadings/authorSection above — this doesn't touch
  // the article body at all, just reads metafields off `article` and
  // ranks against `candidateBlog`.
  const relatedPosts = getRelatedPostsData(
    article,
    candidateBlog?.articles?.nodes ?? [],
  );

  // The page's own canonical URL — SocialShare's only input that
  // doesn't come from `article` itself. request.url already reflects
  // the post-redirectIfHandleIsLocalized canonical handle (the
  // redirect above throws/returns before this line runs when the
  // handle isn't canonical), so this is safe to hand straight to
  // SocialShare without re-deriving it from params.
  const canonicalUrl = request.url;

  // Final loader payload: the article with its fully-transformed
  // contentHtml, the resolved shoppable products (for the client-side
  // portal step to look up by id), the resolved summary box markup
  // (or null), the canonical URL for social sharing, and everything
  // the TOC/author section/related-posts section need to decide
  // whether/how to render.
  return {
    article: {...article, contentHtml},
    shoppableProducts,
    tocEnabled,
    tocHeadings,
    authorSection,
    relatedPosts,
    summaryHtml,
    canonicalUrl,
  };
}

// Nothing needs to stream in after first paint for this route today —
// kept as a no-op stub so the critical/deferred split stays consistent
// with other routes and is a one-line change to start using.
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

// Describes one shoppable-embed slot found in the rendered article
// body: the DOM node to portal into, which layout it wants (focus /
// grid / gallery / text — see ProductSections.tsx), which product IDs
// it references, and — for gallery/text — the original heading/body
// copy (decoded back off the slot's data-heading/data-body attributes
// at scan time, since the static inner markup is a plain rendered
// <h3>/<div> by the time this runs, not a reliable source to
// re-scrape from).
type ShoppableSlot = {
  el: HTMLElement;
  kind: string;
  ids: string[];
  heading?: string;
  body?: string;
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

// Describes one gallery slot found in the rendered article body: the
// DOM node to portal into, plus the image list/title/columns/layout
// resolved server-side by injectImagesGallery (read back off the
// slot's data attributes via readGallerySlot, same idea as
// NewsletterSlot above — different data shape since a gallery
// carries a full image array rather than two strings).
//
// `layout` added here (previously missing) so the visual treatment
// (grid / fullscreen / slideshow) survives the client-side portal
// swap instead of silently reverting to the 'grid' default the
// moment <ImagesGallery /> hydrates in — readGallerySlot already
// parsed and returned it, this type just wasn't carrying it through.
type GallerySlot = {
  el: HTMLElement;
  images: GalleryImage[];
  title?: string;
  columns?: 2 | 3 | 4 | 5;
  layout?: 'grid' | 'fullscreen' | 'slideshow';
};

export default function ArticleTemplate() {
  const {
    article,
    shoppableProducts = [],
    tocEnabled,
    tocHeadings,
    authorSection,
    relatedPosts,
    summaryHtml,
    canonicalUrl,
  } = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  // Ref to the container the raw article HTML is injected into, so we
  // can scan its actual DOM for shoppable/newsletter/video/gallery
  // slots after render. Note: two-col-content, CTA buttons, quotes,
  // and recipe headers are NOT scanned here — all four are fully
  // static (see TwoColumnContent.tsx, button.tsx, Quote.tsx,
  // RecipeHeader.tsx), so there's no slot type for any of them and
  // nothing for this component to find/portal. Related posts aren't
  // scanned either, for the same "fully static, no slot" reason as
  // author section — it's rendered directly below, outside
  // dangerouslySetInnerHTML entirely. The summary block is the same
  // story — it's rendered directly above the body/TOC grid (see
  // below), never inside this ref's DOM subtree, so there's no
  // marker/slot for it to be found here. Social share is the same
  // story too — it never touches contentHtml at all, so there's
  // nothing here to scan for it either.
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

  // The video slots discovered in the DOM. Kept separate from the
  // other two for the same reason — different data shape (full
  // <Video> props, read back via readVideoSlot) and a different
  // component portaled in.
  const [videoSlots, setVideoSlots] = useState<HTMLElement[]>([]);

  // The gallery slots discovered in the DOM. Kept separate for the
  // same reason as videoSlots/newsletterSlots — different data shape
  // (image array + optional title/columns/layout, read back via
  // readGallerySlot) and a different component (<ImagesGallery>)
  // portaled in. Unlike videoSlots, the props are resolved once here
  // (readGallerySlot at scan time) rather than per-render, since
  // there's no reason to re-parse the same JSON attribute on every
  // render — same choice as ShoppableSlot/NewsletterSlot above.
  const [gallerySlots, setGallerySlots] = useState<GallerySlot[]>([]);

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
    // No hash in the URL — nothing to auto-open, so skip the DOM lookup.
    if (!window.location.hash) return;
    // Hash may contain percent-encoded characters (e.g. spaces/unicode
    // in a heading), so decode before matching against the raw id.
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = document.getElementById(id);
    // Only <details> elements have an `.open` property to set — guard
    // in case the hash happens to match some other element's id.
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
  }, [contentHtml]);

  // Finds each server-rendered shoppable-embed, newsletter-form,
  // video, and gallery slot (rendered with the hook-free Static*
  // components in ~/components/blogs/ProductSections, the static
  // <form> from injectNewsletterForm, the empty data-video-slot node
  // from injectVideoEmbeds, and the static thumbnail grid from
  // injectImagesGallery respectively) and records them so the real,
  // interactive components can be portaled into them below. CTA
  // buttons, quotes, and recipe headers are NOT part of this scan —
  // their inject* functions already produce final markup, nothing to
  // swap in after mount. Related posts are ALSO not part of this
  // scan — it isn't inside dangerouslySetInnerHTML at all, so there's
  // no slot to find; it renders directly, further down this same JSX
  // tree. Same story for the summary block — it's resolved/rendered
  // directly above the body/TOC grid, so there's no slot for it here.
  // Same story again for social share — it's rendered directly below
  // the body/TOC grid too, no slot, no scan needed.
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
  // <Video> itself doesn't need any app context (no fetcher/router
  // hooks), but it's scanned/portaled the same way anyway for
  // consistency, and because it still needs *some* mount point inside
  // this tree — dangerouslySetInnerHTML content is otherwise inert.
  // <ImagesGallery> is in the same boat as <Video> — no app context
  // needed (just local React state for the lightbox), scanned/portaled
  // the same way purely for consistency and because it needs a mount
  // point inside this tree too. <RelatedBlogPosts>, like
  // <AuthorSection> and <SocialShare>, needs none of this — it's a
  // normal component mounted directly in JSX below, no portal
  // involved. The summary block needs none of this either — it's a
  // plain dangerouslySetInnerHTML string with nothing interactive in
  // it, rendered directly, same as the article body itself.
  useEffect(() => {
    const container = bodyRef.current;
    // Nothing mounted yet (or unmounted) — nothing to scan.
    if (!container) return;

    const found: ShoppableSlot[] = [];

    // Look for every element the server marked as a shoppable slot
    // (see injectShoppableProducts in ProductSections.tsx).
    container
      .querySelectorAll<HTMLElement>('[data-shoppable-slot]')
      .forEach((el) => {
        // `data-shoppable-slot` holds the layout kind: focus / grid /
        // gallery / text.
        const kind = el.getAttribute('data-shoppable-slot');
        // `data-product-ids` holds a comma-separated list of numeric
        // product IDs for this slot; split and drop empty entries.
        const ids = (el.getAttribute('data-product-ids') ?? '')
          .split(',')
          .filter(Boolean);

        // Skip malformed slots (missing kind, or no product IDs).
        if (!kind || ids.length === 0) return;

        // Only gallery/text markers carry heading/body copy;
        // renderMarker only writes these attributes when present, so
        // both are undefined for focus/grid slots. Values are
        // encodeURIComponent-encoded by injectShoppableProducts,
        // decoded back here rather than left for the client to
        // re-scrape from the static inner markup's rendered text.
        const rawHeading = el.getAttribute('data-heading');
        const rawBody = el.getAttribute('data-body');
        const heading = rawHeading ? decodeURIComponent(rawHeading) : undefined;
        const body = rawBody ? decodeURIComponent(rawBody) : undefined;

        // Clear the static server-rendered markup - the portal below
        // renders the live replacement into this same node.
        el.innerHTML = '';
        found.push({el, kind, ids, heading, body});
      });

    setSlots(found);

    const foundNewsletters: NewsletterSlot[] = [];

    // Look for every element the server marked as a newsletter-form
    // slot (see injectNewsletterForm in NewsletterForm.tsx). Falls
    // back to the same DEFAULT_HEADING/DEFAULT_SUBHEADING constants
    // NewsletterForm.tsx itself uses — imported, not retyped, so the
    // client-side fallback can never silently drift from the server's
    // actual default copy. (In normal operation injectNewsletterForm
    // always writes both attributes with a resolved value before this
    // ever runs, so this fallback is a safety net, not the common
    // path.)
    container
      .querySelectorAll<HTMLElement>('[data-newsletter-slot]')
      .forEach((el) => {
        const heading =
          el.getAttribute('data-newsletter-heading') ??
          NEWSLETTER_DEFAULT_HEADING;
        const subheading =
          el.getAttribute('data-newsletter-subheading') ??
          NEWSLETTER_DEFAULT_SUBHEADING;

        // Clear the static server-rendered form - the portal below
        // renders the live, fetcher-backed replacement into this same
        // node. The static form remains fully functional (real POST)
        // right up until this swap happens.
        el.innerHTML = '';
        foundNewsletters.push({el, heading, subheading});
      });

    setNewsletterSlots(foundNewsletters);

    // Look for every element the server marked as a video slot (see
    // injectVideoEmbeds in video.tsx). Unlike the other slot types,
    // the props themselves are read back per-element at render time
    // via readVideoSlot (see the .map() below) rather than pre-parsed
    // here — there's nothing to clear first since injectVideoEmbeds
    // never rendered any inner markup into the slot to begin with.
    const foundVideos = Array.from(
      container.querySelectorAll<HTMLElement>('[data-video-slot]'),
    );
    setVideoSlots(foundVideos);

    const foundGalleries: GallerySlot[] = [];

    // Look for every element the server marked as a gallery slot (see
    // injectImagesGallery in ImagesGallery.tsx).
    container
      .querySelectorAll<HTMLElement>('[data-gallery-slot]')
      .forEach((el) => {
        // Parses and validates the slot's data-gallery-images (and
        // optional title/columns/layout) attributes in one shot.
        const data = readGallerySlot(el);

        // Skip malformed slots (missing/unparsable data-gallery-images).
        if (!data) return;

        // Clear the static server-rendered grid - the portal below
        // renders the live, lightbox-capable replacement into this
        // same node. Same "static remains usable right up until the
        // swap" property as the newsletter form: the grid's <a> tags
        // work with no JS until this line runs.
        el.innerHTML = '';
        foundGalleries.push({el, ...data});
      });

    setGallerySlots(foundGalleries);
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

      {/* "Key takeaways" summary, top of the article, directly below
          the hero. No metafield gate — renders whenever a valid
          data-summary-embed marker was found, resolved once in the
          loader as a raw HTML string, not a component, since that
          box is fully static. */}
      {summaryHtml && (
        <div
          dangerouslySetInnerHTML={{__html: summaryHtml}}
          className="summary"
        />
      )}

      {/* Body + TOC live in a two-column grid on desktop when the TOC
          is enabled (see article-toc.css); collapses to one column via
          --no-toc when it's not. h1/meta/hero/summary above stay
          full-width. */}
      <div className={articleLayoutClassName}>
        {/* Raw article HTML from Shopify, with shoppable-embed, CTA
            button, quote, recipe-header, two-col, newsletter-form,
            video-embed, and gallery-embed markers already resolved
            and heading ids assigned by the loader above. The summary
            marker (if any) has already been extracted out entirely by
            this point — it never appears in this HTML string,
            regardless of where the editor placed it. bodyRef lets the
            effects above scan this DOM subtree once it's mounted. */}
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
          above. Kinds come from ProductSections.tsx: focus (1
          product), grid (2-4 products), gallery (heading + body + row
          of 1-4 products), text (heading + body beside 1 product). */}
      {slots.map(({el, kind, ids, heading, body}) => {
        let node: React.ReactNode = null;

        switch (kind) {
          case 'focus':
            // Single large product card.
            node = <ProductFocus productId={ids[0]} productsById={productsById} />;
            break;
          case 'grid':
            // 2x2 grid of product cards.
            node = <ProductGrid productIds={ids} productsById={productsById} />;
            break;
          case 'gallery':
            // Heading + body copy above a row of 1-4 products.
            node = (
              <ProductGallerySection
                heading={heading}
                body={body}
                productIds={ids}
                productsById={productsById}
              />
            );
            break;
          case 'text':
            // Heading + body copy beside a single product card.
            node = (
              <ProductWithText
                heading={heading}
                body={body}
                productId={ids[0]}
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

      {/* For each discovered video slot, read its props back off the
          slot's data-* attributes and portal the live <Video>
          component in. A slot missing required fields (src/title)
          resolves to null and renders nothing, same "skip malformed"
          behavior as the shoppable-slot switch above. Keyed by
          position for the same reason as the newsletter slots — an
          article can embed the same video twice. */}
      {videoSlots.map((el, i) => {
        const props = readVideoSlot(el);
        if (!props) return null;
        return createPortal(<Video {...props} />, el, `video-${i}`);
      })}

      {/* For each discovered gallery slot, portal the live
          <ImagesGallery> in — replacing the static thumbnail grid
          that was cleared above. Props (including layout) were
          already resolved at scan time (readGallerySlot, above), so
          this just spreads them through. Keyed by position for the
          same reason as the newsletter/video slots — an article can
          embed more than one gallery. */}
      {gallerySlots.map(
        ({el, images, title: galleryTitle, columns, layout}, i) =>
          createPortal(
            <ImagesGallery
              images={images}
              title={galleryTitle}
              columns={columns}
              layout={layout}
            />,
            el,
            `gallery-${i}`,
          ),
      )}

      {/* "Social sharing" card, right after the body/TOC grid and
          directly above the author section — closest section to
          AuthorSection, matching its rendered-directly shape (no
          marker, no portal). Always renders unless an editor has
          explicitly opted out via custom.show_social_share (see
          isSocialShareEnabled) — currently always true until that
          metafield is added to ARTICLE_QUERY. url is the loader's
          canonicalUrl (request.url, post-locale-redirect); imageUrl
          falls back to the hero image so Pinterest gets a share
          preview even on articles that never set a dedicated share
          image. */}
      {isSocialShareEnabled(article) && (
        <SocialShare
          url={canonicalUrl}
          title={title}
          imageUrl={image?.url}
        />
      )}

      {/* "About the author" card, bottom of the article. Only renders
          when the editor has both flipped show_author_section on AND
          filled in a bio — see getAuthorSectionData() for the exact
          gating rules. No metafields set at all → authorSection is
          null → nothing renders here, same as before this feature
          existed. */}
      {authorSection && <AuthorSection data={authorSection} />}

      {/* "Related blogs", very bottom of the article, after the
          author section. Renders whenever getRelatedPostsData found
          anything to show — curated picks from
          custom.related_blog_posts, tag-ranked fallback candidates,
          or a merge of both (see RelatedBlogPosts.tsx). An editor
          setting custom.show_related_posts = false, or an article
          with no curated picks AND an empty candidate pool, both
          resolve to relatedPosts === null → nothing renders here. */}
      {relatedPosts && <RelatedBlogPosts posts={relatedPosts.posts} />}
    </div>
  );
}