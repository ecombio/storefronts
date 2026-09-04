import {ARTICLE_QUERY, SHOPPABLE_PRODUCTS_QUERY} from '~/graphql/blog/ArticleQuery';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useLoaderData, Link} from 'react-router';
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
// Purely editor-curated off custom.related_blog_posts — no gating
// metafield, no tag-ranked fallback, no separate candidates query.
// See RelatedBlogPosts.md.
import RelatedBlogPosts, {
  getRelatedPostsData,
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
// "Related products" sidebar. Editor-curated list (see
// RelatedProducts.md) resolved via the same shoppable-products batch
// query used for in-body product embeds, not a recommendations call.
import RelatedProducts, {
  getRelatedProductIds,
} from '~/components/blogs/RelatedProducts';
// "Latest blogs" sidebar. Editor-curated list (see LatestBlogs.md),
// resolved directly off the article's custom.latest_blogs metafield —
// no batch query needed.
import LatestBlogs, {getLatestBlogsData} from '~/components/blogs/LatestBlogs';
import type {ProductCardFragment} from 'storefrontapi.generated';
import articleStyles from '~/assets/article.css?url';
import articleTocStyles from '~/components/blogs/TableOfContents.css?url';
import authorSectionStyles from '~/components/blogs/AuthorSection.css?url';
import twoColumnContentStyles from '~/components/blogs/TwoColumnContent.css?url';
import videoStyles from '~/components/blogs/Video.css?url';
import galleryStyles from '~/components/blogs/ImagesGallery.css?url';
import blogButtonStyles from '~/components/blogs/Button.css?url';
import quoteStyles from '~/assets/quote.css?url';
import recipeHeaderStyles from '~/components/blogs/RecipeHeader.css?url';
import newsletterFormStyles from '~/components/blogs/NewsletterForm.css?url';
import relatedBlogPostsStyles from '~/components/blogs/RelatedBlogPosts.css?url';
import blogPostCardStyles from '~/components/blogs/BlogPostCard.css?url';
import relatedProductsStyles from '~/components/blogs/RelatedProducts.css?url';
import latestBlogsStyles from '~/components/blogs/LatestBlogs.css?url';
import summaryStyles from '~/components/blogs/Summary.css?url';
import socialShareStyles from '~/components/blogs/SocialShare.css?url';

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
    {rel: 'stylesheet', href: relatedProductsStyles},
    {rel: 'stylesheet', href: latestBlogsStyles},
    {rel: 'stylesheet', href: summaryStyles},
    {rel: 'stylesheet', href: socialShareStyles},
  ];
}

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.article.title ?? ''} article`}];
};

const WORDS_PER_MINUTE = 200;

function calculateReadingTime(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .trim();
  const wordCount = text.length ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}


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

  // Only ARTICLE_QUERY is needed now. RELATED_POSTS_CANDIDATES_QUERY
  // (a parallel Promise.all fetch of a same-blog article pool) has
  // been removed entirely — RelatedBlogPosts is purely editor-curated
  // off custom.related_blog_posts now, with no tag-ranked fallback to
  // rank a candidate pool against, so that second query has no
  // remaining caller.
  const {blog} = await context.storefront.query(ARTICLE_QUERY, {
    variables: {blogHandle, articleHandle},
  });

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

  // Editor-curated "Related products" list off custom.related_products
  // (see RelatedProducts.tsx). These ids are merged into the SAME
  // batch query as the in-body shoppable products below, so the
  // curated sidebar list costs zero extra round-trips.
  const relatedProductGids = getRelatedProductIds(article);
  const relatedProductIds = relatedProductGids.map(
    (gid) => gid.split('/').pop()!,
  );

  let contentHtml = article.contentHtml;

  let shoppableProducts: [string, ProductCardFragment][] = [];
  let relatedProducts: ProductCardFragment[] = [];

  const allProductIds = Array.from(
    new Set([...productIds, ...relatedProductIds]),
  );

  if (allProductIds.length > 0) {
    const gids = allProductIds.map((id) => `gid://shopify/Product/${id}`);

    const {nodes} = await context.storefront.query(SHOPPABLE_PRODUCTS_QUERY, {
      variables: {ids: gids},
    });

    const productsById = new Map(
      allProductIds
        .map((id, i) => [id, nodes?.[i]] as const)
        .filter(
          (entry): entry is [string, ProductCardFragment] =>
            Boolean(entry[1]),
        ),
    );

    // Body-embedded shoppable slots only ever needed the ids pulled
    // from contentHtml — scope injection + the returned pair list to
    // just those, so relatedProducts (below) doesn't leak into the
    // in-body ProductFocus/Grid/etc. map.
    if (productIds.length > 0) {
      contentHtml = injectShoppableProducts(article.contentHtml, productsById);
      shoppableProducts = productIds
        .map((id) => [id, productsById.get(id)] as const)
        .filter(
          (entry): entry is [string, ProductCardFragment] =>
            Boolean(entry[1]),
        );
    }

    // Preserves the merchant's list order from the metafield, not
    // whatever order the batch query happened to return nodes in.
    relatedProducts = relatedProductIds
      .map((id) => productsById.get(id))
      .filter((product): product is ProductCardFragment => Boolean(product));
  }

  const {html: contentHtmlWithoutSummary, summary} =
    extractSummarySection(contentHtml);
  contentHtml = contentHtmlWithoutSummary;

  const summaryHtml = summary ? renderSummary(summary) : null;

  contentHtml = injectBlogButtons(contentHtml);

  contentHtml = injectQuoteEmbeds(contentHtml);

  contentHtml = injectRecipeHeader(contentHtml);

  contentHtml = injectTwoColumnContent(contentHtml);

  contentHtml = injectFaqSections(contentHtml);

  contentHtml = injectNewsletterForm(contentHtml);

  contentHtml = injectVideoEmbeds(contentHtml);

  contentHtml = injectImagesGallery(contentHtml);

  const tocEnabled = isTocEnabled(article);

  let tocHeadings: ReturnType<typeof withHeadingIds>['headings'] = [];

  if (tocEnabled) {
    const {html: contentHtmlWithHeadingIds, headings} =
      withHeadingIds(contentHtml);
    contentHtml = contentHtmlWithHeadingIds;
    tocHeadings = headings;
  }

  const authorSection = getAuthorSectionData(article);

  // Purely editor-curated now — no candidate pool, no tag ranking, no
  // gating metafield. Empty custom.related_blog_posts = null = the
  // section doesn't render.
  const relatedPosts = getRelatedPostsData(article);

  const canonicalUrl = request.url;

  const readingTime = calculateReadingTime(article.contentHtml);

  // "Latest blogs" is editor-curated straight off the article's
  // custom.latest_blogs metafield (see LatestBlogs.md).
  const latestBlogs = getLatestBlogsData(article);

  return {
    article: {...article, contentHtml},
    shoppableProducts,
    relatedProducts,
    tocEnabled,
    tocHeadings,
    authorSection,
    relatedPosts,
    summaryHtml,
    canonicalUrl,
    readingTime,
    latestBlogs,
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

type ShoppableSlot = {
  el: HTMLElement;
  kind: string;
  ids: string[];
  heading?: string;
  body?: string;
};

type NewsletterSlot = {
  el: HTMLElement;
  heading: string;
  subheading: string;
};

type GallerySlot = {
  el: HTMLElement;
  images: GalleryImage[];
  title?: string;
  columns?: 2 | 3 | 4 | 5;
  layout?: 'grid' | 'fullscreen' | 'slideshow' | 'carousel';
};

export default function ArticleTemplate() {
  const {
    article,
    shoppableProducts = [],
    relatedProducts = [],
    tocEnabled,
    tocHeadings,
    authorSection,
    relatedPosts,
    summaryHtml,
    canonicalUrl,
    readingTime,
    latestBlogs,
  } = useLoaderData<typeof loader>();
  const {title, image, contentHtml, author} = article;

  const bodyRef = useRef<HTMLDivElement>(null);

  const [slots, setSlots] = useState<ShoppableSlot[]>([]);

  const [newsletterSlots, setNewsletterSlots] = useState<NewsletterSlot[]>(
    [],
  );

  const [videoSlots, setVideoSlots] = useState<HTMLElement[]>([]);

  const [gallerySlots, setGallerySlots] = useState<GallerySlot[]>([]);

  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  const isHub = article.blog?.handle === 'category';
  const layoutVariant = article.layoutVariant?.value;
  const blogHandle = article.blog?.handle;

  const articleClassName = [
    'article',
    isHub ? 'article--hub' : 'article--spoke',
    layoutVariant ? `article--${layoutVariant}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const hasToc = tocEnabled;
  // RelatedProducts and Latest Blogs share one right-rail grid column
  // (see .article-right-rail in article.css), so the layout class
  // logic only needs to know whether that combined rail has anything
  // in it at all, not which specific widget(s). Both self-hide when
  // empty (see their component files) — this flag exists purely for
  // the layout-class math below, not to gate whether either component
  // renders.
  const hasRelatedProducts = relatedProducts.length > 0;
  const hasLatestBlogs = latestBlogs.length > 0;
  const hasRightRail = hasRelatedProducts || hasLatestBlogs;

  const articleLayoutClassName = [
    'article-layout',
    !hasToc && !hasRightRail ? 'article-layout--no-toc' : null,
    hasToc && hasRightRail ? 'article-layout--both-sidebars' : null,
    !hasToc && hasRightRail ? 'article-layout--right-sidebar' : null,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
  }, [contentHtml]);

  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;

    const found: ShoppableSlot[] = [];

    container
      .querySelectorAll<HTMLElement>('[data-shoppable-slot]')
      .forEach((el) => {
        const kind = el.getAttribute('data-shoppable-slot');
        const ids = (el.getAttribute('data-product-ids') ?? '')
          .split(',')
          .filter(Boolean);

        if (!kind || ids.length === 0) return;

        const rawHeading = el.getAttribute('data-heading');
        const rawBody = el.getAttribute('data-body');
        const heading = rawHeading ? decodeURIComponent(rawHeading) : undefined;
        const body = rawBody ? decodeURIComponent(rawBody) : undefined;

        el.innerHTML = '';
        found.push({el, kind, ids, heading, body});
      });

    setSlots(found);

    const foundNewsletters: NewsletterSlot[] = [];

    container
      .querySelectorAll<HTMLElement>('[data-newsletter-slot]')
      .forEach((el) => {
        const heading =
          el.getAttribute('data-newsletter-heading') ??
          NEWSLETTER_DEFAULT_HEADING;
        const subheading =
          el.getAttribute('data-newsletter-subheading') ??
          NEWSLETTER_DEFAULT_SUBHEADING;

        el.innerHTML = '';
        foundNewsletters.push({el, heading, subheading});
      });

    setNewsletterSlots(foundNewsletters);

    const foundVideos = Array.from(
      container.querySelectorAll<HTMLElement>('[data-video-slot]'),
    );
    setVideoSlots(foundVideos);

    const foundGalleries: GallerySlot[] = [];

    container
      .querySelectorAll<HTMLElement>('[data-gallery-slot]')
      .forEach((el) => {
        const data = readGallerySlot(el);

        if (!data) return;

        el.innerHTML = '';
        foundGalleries.push({el, ...data});
      });

    setGallerySlots(foundGalleries);
  }, [contentHtml]);

  const productsById = new Map(shoppableProducts);

  return (
    <div className={articleClassName}>
      {/* Hero image now leads, ahead of the title block below it.
          Shortened from 16/9 to 21/9 — same width, less height, no
          CSS change needed since Hydrogen's <Image> derives its
          rendered height directly from aspectRatio × the resolved
          `sizes` width. Adjust this ratio (e.g. "3/1" for even
          shorter) to taste. */}
      {image && (
        <Image
          data={image}
          sizes="(min-width: 760px) 720px, 90vw"
          aspectRatio="21/9"
          crop="center"
          loading="eager"
          className="article-hero-image"
        />
      )}

      <div className="article-header">
        <h1>{title}</h1>

        <div className="article-reading-time">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Time to read : {readingTime} minute{readingTime === 1 ? '' : 's'}
        </div>

        <div className="article-meta">
          <time dateTime={article.publishedAt}>{publishedDate}</time> &middot;{' '}
          <address>{author?.name}</address>
        </div>
      </div>

      {summaryHtml && (
        <div
          dangerouslySetInnerHTML={{__html: summaryHtml}}
          className="summary"
        />
      )}

      <div className={articleLayoutClassName}>
        <div
          ref={bodyRef}
          dangerouslySetInnerHTML={{__html: contentHtml}}
          className="article-body"
        />

        {hasToc && (
          <div className="article-sidebar">
            <TableOfContents headings={tocHeadings} />
          </div>
        )}

        {hasRightRail && (
          <div className="article-right-rail">
            <RelatedProducts products={relatedProducts} />
            <LatestBlogs posts={latestBlogs} />
          </div>
        )}
      </div>

      {slots.map(({el, kind, ids, heading, body}) => {
        let node: React.ReactNode = null;

        switch (kind) {
          case 'focus':
            node = <ProductFocus productId={ids[0]} productsById={productsById} />;
            break;
          case 'grid':
            node = <ProductGrid productIds={ids} productsById={productsById} />;
            break;
          case 'gallery':
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

        if (!node) return null;

        return createPortal(node, el, `${kind}-${ids.join('-')}`);
      })}

      {newsletterSlots.map(({el, heading, subheading}, i) =>
        createPortal(
          <NewsletterForm data={{heading, subheading}} />,
          el,
          `newsletter-${i}`,
        ),
      )}

      {videoSlots.map((el, i) => {
        const props = readVideoSlot(el);
        if (!props) return null;
        return createPortal(<Video {...props} />, el, `video-${i}`);
      })}

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

      {isSocialShareEnabled(article) && (
        <SocialShare
          url={canonicalUrl}
          title={title}
          imageUrl={image?.url}
        />
      )}

      {authorSection && <AuthorSection data={authorSection} />}

      {relatedPosts && <RelatedBlogPosts posts={relatedPosts.posts} />}

      {blogHandle && (
        <Link to={`/blogs/${blogHandle}`} className="article-back-button">
          <span aria-hidden="true">&larr;</span> Go back
        </Link>
      )}
    </div>
  );
}