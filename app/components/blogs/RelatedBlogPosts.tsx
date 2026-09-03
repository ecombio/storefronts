import {Image} from '@shopify/hydrogen';
import {Link} from 'react-router';

/**
 * RelatedBlogPosts
 * -----------------
 * "Related blogs" section rendered at the end of an article — same
 * pattern as AuthorSection, NOT the marker/inject/portal pattern used
 * by ProductGallery/FaqSection/NewsletterForm/video/ImagesGallery.
 *
 * Why this one is different: those blocks exist because an editor
 * manually drops a marker at a specific point *inside* the article's
 * rich text. Related posts aren't placed like that — they're picked
 * (curated by the editor via a metafield, or worked out from shared
 * tags) and always show as one fixed block after the article body, so
 * there's no inline marker to parse and nothing to portal into. This
 * file exports the same three-part shape as AuthorSection instead:
 *
 *   - `isRelatedPostsEnabled(article)` — gating, same shape as
 *     isTocEnabled/getAuthorSectionData's own gating.
 *   - `getRelatedPostsData(article, candidatePool)` — resolves
 *     render-ready data or null, run in the loader (see wiring
 *     instructions in related-blog-posts.md).
 *   - `RelatedBlogPosts` (default export) — the presentational
 *     component, rendered directly (no portal — it doesn't need one,
 *     since it's not hydrating into markup that came from
 *     dangerouslySetInnerHTML).
 */

export interface RelatedPost {
  id: string;
  title: string;
  handle: string;
  blogHandle: string;
  publishedAt: string;
  image?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
}

export interface RelatedBlogPostsProps {
  posts: RelatedPost[];
  /** Defaults to "Related blogs" */
  title?: string;
  /** Grid columns at desktop width. Defaults to 3. */
  columns?: 2 | 3 | 4;
}

export default function RelatedBlogPosts({
  posts,
  title = 'Related blogs',
  columns = 3,
}: RelatedBlogPostsProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="rbp-root" aria-labelledby="rbp-heading">
      <h2 className="rbp-title" id="rbp-heading">
        {title}
      </h2>

      <ul
        className="rbp-grid"
        style={{['--rbp-columns' as string]: columns}}
      >
        {posts.map((post) => (
          <li className="rbp-card" key={post.id}>
            <Link
              to={`/blogs/${post.blogHandle}/${post.handle}`}
              className="rbp-image-link"
            >
              {post.image ? (
                <Image
                  data={post.image}
                  sizes="(min-width: 760px) 320px, 90vw"
                  aspectRatio="1/1"
                  crop="center"
                  loading="lazy"
                  className="rbp-image"
                />
              ) : (
                <div className="rbp-image rbp-image--placeholder" />
              )}
            </Link>

            <h3 className="rbp-card-title">
              <Link to={`/blogs/${post.blogHandle}/${post.handle}`}>
                {post.title}
              </Link>
            </h3>

            <time className="rbp-date" dateTime={post.publishedAt}>
              {formatShortDate(post.publishedAt)}
            </time>

            <Link
              to={`/blogs/${post.blogHandle}/${post.handle}`}
              className="rbp-read-more"
            >
              Read more
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Formats a date as "10.10.24" — matches the reference design. */
function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

// ---------------------------------------------------------------------
// Gating + data resolution — run in the route loader
// ---------------------------------------------------------------------

/**
 * Minimal shape this module needs from the article the loader already
 * fetched. Kept intentionally small/structural (rather than importing
 * the generated Article type) so this file doesn't need to know about
 * the rest of ARTICLE_QUERY's shape — same "just the fields I use"
 * approach as getAuthorSectionData likely takes for its own metafields.
 */
export interface RelatedPostsSourceArticle {
  id: string;
  tags?: string[] | null;
  metafield?: {value: string} | null; // custom.show_related_posts
  relatedArticlesField?: {
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
  } | null; // custom.related_articles (list.article_reference)
}

/**
 * isRelatedPostsEnabled — gating for the section. Unlike the TOC and
 * author section (both off by default), related posts default to ON:
 * the whole point is to increase time-on-site, so an article should
 * show them unless an editor has explicitly opted out via
 * custom.show_related_posts = false. Mirrors the metafield-boolean
 * shape of isTocEnabled, just with the default flipped.
 */
export function isRelatedPostsEnabled(
  article: RelatedPostsSourceArticle,
): boolean {
  return article.metafield?.value !== 'false';
}

/**
 * A candidate for the tag-based fallback needs its own tags to be
 * rankable — RelatedPost itself stays lean (it's also the shape the
 * curated-metafield path returns, which has no reason to carry tags
 * once it's been picked), so the fallback pool uses this extended
 * shape instead.
 */
export interface RelatedPostCandidate extends RelatedPost {
  tags?: string[] | null;
}

/**
 * getRelatedPostsData — resolves the posts to show, preferring an
 * editor-curated list and falling back to a tag-based match:
 *
 *   1. If custom.related_articles (a list.article_reference metafield)
 *      is set, use those articles, in the order the editor picked
 *      them — this is the "Picked by relevant further reading" path.
 *   2. Otherwise, fall back to `candidatePool` (articles from the same
 *      blog, fetched separately — see wiring instructions), ranked by
 *      how many tags they share with the current article (ties broken
 *      by recency), and sliced to `limit`. An article with zero shared
 *      tags can still appear if the pool is thin — this is a "keep
 *      the section populated" fallback, not a strict relevance filter.
 *
 * Returns null when the section is disabled or there's nothing to
 * show, so the caller can skip rendering entirely — same "null means
 * don't render" contract as getAuthorSectionData.
 */
export function getRelatedPostsData(
  article: RelatedPostsSourceArticle,
  candidatePool: RelatedPostCandidate[],
  {limit = 3}: {limit?: number} = {},
): {posts: RelatedPost[]} | null {
  if (!isRelatedPostsEnabled(article)) return null;

  const curated = article.relatedArticlesField?.references?.nodes;
  if (curated && curated.length > 0) {
    const posts: RelatedPost[] = curated.slice(0, limit).map((node) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      blogHandle: node.blog.handle,
      publishedAt: node.publishedAt,
      image: node.image,
    }));
    return posts.length > 0 ? {posts} : null;
  }

  const pool = candidatePool.filter((post) => post.id !== article.id);
  if (pool.length === 0) return null;

  const currentTags = new Set(article.tags ?? []);
  const scored = pool
    .map((post) => {
      const sharedTagCount = (post.tags ?? []).filter((tag) =>
        currentTags.has(tag),
      ).length;
      return {post, sharedTagCount};
    })
    .sort((a, b) => {
      if (b.sharedTagCount !== a.sharedTagCount) {
        return b.sharedTagCount - a.sharedTagCount;
      }
      return (
        new Date(b.post.publishedAt).getTime() -
        new Date(a.post.publishedAt).getTime()
      );
    });

  return {posts: scored.slice(0, limit).map((entry) => entry.post)};
}
