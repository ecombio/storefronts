import {useCallback, useEffect, useRef, useState} from 'react';
import BlogPostCard, {type BlogPostCardData} from './BlogPostCard';

/**
 * RelatedBlogPosts
 * -----------------
 * "Related blogs" section rendered at the end of an article.
 *
 * Purely editor-curated, same presence-as-toggle pattern as
 * RelatedProducts and LatestBlogs: the merchant picks the exact posts,
 * in order, via the article's custom.related_blog_posts metafield
 * (list.article_reference). There is no separate enable/disable
 * metafield and no automatic fallback — an empty list means the
 * section doesn't exist on the page at all, full stop. If nothing's
 * curated, nothing shows.
 *
 * This file exports the same two-part shape as RelatedProducts:
 *
 *   - `getRelatedPostsData(article)` — reads the curated metafield
 *     off the article and reshapes it into render-ready data, or null
 *     if there's nothing there. Run in the loader.
 *   - `RelatedBlogPosts` (default export) — the presentational
 *     component, rendered directly (no portal — it doesn't need one,
 *     since it's not hydrating into markup that came from
 *     dangerouslySetInnerHTML). Renders one `<BlogPostCard>` per post
 *     (see BlogPostCard.tsx) — this file only owns the section
 *     wrapper and carousel track, not the card markup itself.
 *
 * CAROUSEL, not a static grid: posts render in a horizontally-
 * scrolling, scroll-snap track with prev/next buttons. Native scroll +
 * snap (rather than a JS-driven slide animation) means touch/trackpad
 * swiping works for free on mobile, and the buttons just nudge that
 * same scroll position by one card at a time. This part is unchanged
 * from before — only the gating/fallback logic below it was removed.
 */

// The shape one card needs — defined in BlogPostCard.tsx (the
// component that actually renders it) and re-exported here under the
// name the rest of this module and its callers already use.
export type RelatedPost = BlogPostCardData;

export interface RelatedBlogPostsProps {
  posts: RelatedPost[];
  /** Defaults to "Related blogs" */
  title?: string;
  /** Visible cards at desktop width. Defaults to 3. */
  columns?: 2 | 3 | 4;
}

export default function RelatedBlogPosts({
  posts,
  title = 'Related blogs',
  columns = 3,
}: RelatedBlogPostsProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Re-checked on scroll and on resize (columns-per-view — and so
  // whether the track even overflows — changes at the mobile
  // breakpoint). An 8px slop avoids the buttons flickering
  // enabled/disabled from sub-pixel scroll rounding at the very ends.
  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollPrev(track.scrollLeft > 8);
    setCanScrollNext(
      track.scrollLeft + track.clientWidth < track.scrollWidth - 8,
    );
  }, []);

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', updateScrollState, {passive: true});
    window.addEventListener('resize', updateScrollState);
    return () => {
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
    // Re-run when the post list itself changes (e.g. a different
    // article's related posts swap in via client-side navigation),
    // since scrollWidth depends on how many cards are in the track.
  }, [updateScrollState, posts]);

  const scrollByCards = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    // Scroll by roughly one card's width (including its gap) rather
    // than a full page, so a card that's only partially visible at
    // the edge becomes the natural next stop instead of jumping past
    // it. Falls back to the track's own width if a card can't be
    // measured (e.g. an empty track, though that case never renders).
    const card = track.querySelector<HTMLElement>('.bpc-card');
    const amount = card
      ? card.getBoundingClientRect().width + 20
      : track.clientWidth;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    track.scrollBy({
      left: amount * direction,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  // Nothing curated — render nothing rather than an empty heading +
  // empty track. Mirrors the "null means don't render" contract that
  // getRelatedPostsData follows in the loader.
  if (!posts || posts.length === 0) return null;

  return (
    <section className="rbp-root" aria-labelledby="rbp-heading">
      <div className="rbp-header">
        <h2 className="rbp-title" id="rbp-heading">
          {title}
        </h2>

        {/* Buttons only nudge the same native scroll position the user
            could reach by swiping/dragging — there's no separate "current
            slide" state to keep in sync with them. */}
        <div className="rbp-nav">
          <button
            type="button"
            className="rbp-nav-btn"
            onClick={() => scrollByCards(-1)}
            disabled={!canScrollPrev}
            aria-label="Previous related posts"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="rbp-nav-btn"
            onClick={() => scrollByCards(1)}
            disabled={!canScrollNext}
            aria-label="Next related posts"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <ul
        className="rbp-track"
        ref={trackRef}
        // Columns are passed through as a CSS custom property rather than
        // a className switch (e.g. "rbp-track--cols-3"), so the stylesheet
        // only needs one flex-basis rule that reads var(--rbp-columns)
        // instead of one rule per column count.
        style={{['--rbp-columns' as string]: columns}}
      >
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------
// Data resolution — run in the route loader
// ---------------------------------------------------------------------

/**
 * Minimal shape this module needs from the article the loader already
 * fetched. Kept intentionally small/structural (rather than importing
 * the generated Article type) so this file doesn't need to know about
 * the rest of ARTICLE_QUERY's shape.
 */
export interface RelatedPostsSourceArticle {
  // NOTE: this property name must match the alias ArticleQuery.ts
  // gives the metafield field ("relatedBlogPosts:"), not an
  // arbitrary label — a mismatch here means `nodes` silently
  // resolves to [] on every article, and the section never renders,
  // no matter what's curated in the admin. (This is exactly the bug
  // that was here before: the field was previously misnamed
  // `relatedArticlesField`, which doesn't exist anywhere in the
  // query's response shape.)
  relatedBlogPosts?: {
    references?: {
      nodes: Array<{
        id: string;
        title: string;
        handle: string;
        publishedAt: string;
        blog: {handle: string};
        image?: RelatedPost['image'];
      }>;
    };
  } | null; // custom.related_blog_posts (list.article_reference)
}

/**
 * getRelatedPostsData — reads custom.related_blog_posts straight off
 * the article and reshapes it into render-ready RelatedPost[], in the
 * merchant's chosen order, capped at `limit`. No gating metafield, no
 * tag-based fallback, no separate candidate pool — presence of items
 * in the metafield IS the toggle, same as RelatedProducts/LatestBlogs.
 *
 * Returns null when there's nothing curated, so the caller can skip
 * rendering entirely — same "null means don't render" contract as
 * before.
 */
export function getRelatedPostsData(
  article: RelatedPostsSourceArticle,
  {limit = 3}: {limit?: number} = {},
): {posts: RelatedPost[]} | null {
  const nodes = article.relatedBlogPosts?.references?.nodes ?? [];

  if (nodes.length === 0) return null;

  const posts: RelatedPost[] = nodes.slice(0, limit).map((node) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    blogHandle: node.blog.handle,
    publishedAt: node.publishedAt,
    image: node.image,
  }));

  return {posts};
}