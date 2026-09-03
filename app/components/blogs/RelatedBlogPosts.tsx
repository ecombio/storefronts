import BlogPostCard, {type BlogPostCardData} from './BlogPostCard';

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
 *     dangerouslySetInnerHTML). Renders one `<BlogPostCard>` per post
 *     (see BlogPostCard.tsx) — this file only owns the section
 *     wrapper and grid, not the card markup itself.
 *
 * Curated + fallback are MERGED, not either/or: editor picks (from
 * custom.related_blog_posts, a list.article_reference metafield)
 * always take the front slots, in the order they were picked, and any
 * slots left over (including all of them, if nothing was picked) are
 * filled by tag-ranked candidates from the same blog. See
 * getRelatedPostsData below for the exact merge logic.
 */

// The shape one card needs — now defined in BlogPostCard.tsx (the
// component that actually renders it) and re-exported here under the
// name the rest of this module and its callers already use. Keeping
// the `RelatedPost` name (rather than forcing every import site to
// switch to `BlogPostCardData`) means getRelatedPostsData's return
// type and every route file that destructures `relatedPosts.posts`
// doesn't need to change just because the card moved files.
export type RelatedPost = BlogPostCardData;

// ---------------------------------------------------------------------
// Candidate-pool query — fetched in the loader alongside ARTICLE_QUERY
// ---------------------------------------------------------------------

/**
 * RELATED_POSTS_CANDIDATES_QUERY — fetches a pool of "other articles
 * in this blog" for getRelatedPostsData's tag-based fallback to rank
 * against. Lives here rather than in ArticleQuery.ts (or its own
 * file) so this module is the single source of truth for the whole
 * related-posts feature: gating, this query, the ranking logic, and
 * the component that renders the result, all in one place.
 *
 * Deliberately independent of ARTICLE_QUERY: this doesn't need
 * anything about the current article — only `blogHandle` — so it's
 * meant to be fetched in parallel with ARTICLE_QUERY in the loader's
 * Promise.all, not folded into it as a nested field.
 *
 * The Storefront API has no server-side "related articles" concept,
 * and Blog.articles has no relevance/tag-overlap ranking — only
 * simple `tag:` filtering and sorting. So this intentionally
 * over-fetches (a window of `first` articles, most recent first) and
 * leaves the actual shared-tag ranking to getRelatedPostsData below.
 */
export const RELATED_POSTS_CANDIDATES_QUERY = `#graphql
  query RelatedPostsCandidates(
    $blogHandle: String!
    $first: Int!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    blog(handle: $blogHandle) {
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        nodes {
          id
          title
          handle
          tags
          publishedAt
          blog {
            handle
          }
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
  }
` as const;

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
  // Nothing to show (empty curated list AND empty fallback pool, or the
  // section is disabled upstream) — render nothing rather than an empty
  // heading + empty grid. Mirrors the "null means don't render" contract
  // that getRelatedPostsData follows in the loader.
  if (!posts || posts.length === 0) return null;

  return (
    <section className="rbp-root" aria-labelledby="rbp-heading">
      <h2 className="rbp-title" id="rbp-heading">
        {title}
      </h2>

      <ul
        className="rbp-grid"
        // Columns are passed through as a CSS custom property rather than
        // a className switch (e.g. "rbp-grid--cols-3"), so the stylesheet
        // only needs one grid-template-columns rule that reads
        // var(--rbp-columns) instead of one rule per column count.
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
  } | null; // custom.related_blog_posts (list.article_reference)
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
  // Note the comparison is against the *string* 'false', not a boolean —
  // metafields come back as raw strings over the Storefront API. Any
  // value other than the literal "false" (including undefined/unset,
  // "true", or garbage) is treated as enabled, which is what gives the
  // "on by default" behavior described above.
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
 * getRelatedPostsData — resolves the posts to show, MERGING an
 * editor-curated list with a tag-based fallback rather than picking
 * one or the other:
 *
 *   1. Start with whatever's in custom.related_blog_posts (a
 *      list.article_reference metafield), in the order the editor
 *      picked them — this is the "Picked by relevant further reading"
 *      path, and it always wins the front-most slots.
 *   2. If that list is short of `limit` (including empty — 0 curated
 *      picks is just the n=0 case of "short"), fill the remaining
 *      slots from `candidatePool` (articles from the same blog,
 *      fetched separately — see wiring instructions), ranked by how
 *      many tags they share with the current article (ties broken by
 *      recency). An article with zero shared tags can still appear if
 *      the pool is thin — this is a "keep the section populated"
 *      fallback, not a strict relevance filter.
 *
 * So picking 2 curated posts with `limit: 3` gives you those 2 first,
 * plus 1 tag-ranked fallback post filling the last slot. Picking 0
 * curated posts falls all the way back to 3 tag-ranked posts — the
 * old all-fallback behavior. Picking 3+ curated posts (at `limit: 3`)
 * never touches the fallback at all — the old all-curated behavior.
 * Both of the previous either/or paths still exist; they're just the
 * two ends of this same spectrum now, not separate branches.
 *
 * Returns null when the section is disabled or there's nothing to
 * show at all, so the caller can skip rendering entirely — same "null
 * means don't render" contract as getAuthorSectionData.
 */
export function getRelatedPostsData(
  article: RelatedPostsSourceArticle,
  candidatePool: RelatedPostCandidate[],
  {limit = 3}: {limit?: number} = {},
): {posts: RelatedPost[]} | null {
  // Editor opted out via the metafield — bail before doing any of the
  // (potentially wasted) curated/fallback resolution work below.
  if (!isRelatedPostsEnabled(article)) return null;

  // --- Curated picks, reshaped and capped at `limit` -----------------
  // Trusted as-is: no ranking, no filtering out the current article
  // (an editor presumably wouldn't reference the article it's
  // attached to), just reshape each node from the GraphQL response
  // into the lean RelatedPost the component expects. `curated` can be
  // empty — that's the "0 picks, full fallback" end of the spectrum
  // described above, not a special case handled separately.
  const curatedNodes = article.relatedArticlesField?.references?.nodes ?? [];
  const curated: RelatedPost[] = curatedNodes.slice(0, limit).map((node) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    blogHandle: node.blog.handle,
    publishedAt: node.publishedAt,
    image: node.image,
  }));

  // Curated already fills every slot — no need to touch the fallback
  // pool or even look at tags. This is the old "Path 1" return, minus
  // the early-return branch that used to make Path 2 unreachable.
  const remaining = limit - curated.length;
  if (remaining <= 0) return {posts: curated};

  // --- Tag-ranked fallback, filling whatever's left -------------------
  // Exclude the current article (in case it's in the fetched pool) AND
  // every already-curated post, so a manually-picked article can never
  // also show up "again" via the fallback ranking below it.
  const curatedIds = new Set(curated.map((post) => post.id));
  const pool = candidatePool.filter(
    (post) => post.id !== article.id && !curatedIds.has(post.id),
  );

  // Nothing left to fill the remaining slots with — return whatever
  // curated posts we do have (could be 0, in which case this is null,
  // same "nothing to show" contract as before).
  if (pool.length === 0) {
    return curated.length > 0 ? {posts: curated} : null;
  }

  const currentTags = new Set(article.tags ?? []);
  const scored = pool
    .map((post) => {
      // How many of this candidate's tags also appear on the current
      // article — the higher this count, the more "related" it's
      // considered.
      const sharedTagCount = (post.tags ?? []).filter((tag) =>
        currentTags.has(tag),
      ).length;
      return {post, sharedTagCount};
    })
    .sort((a, b) => {
      // Primary sort: most shared tags first.
      if (b.sharedTagCount !== a.sharedTagCount) {
        return b.sharedTagCount - a.sharedTagCount;
      }
      // Tiebreaker: newest article first. This also determines the
      // ordering when every candidate has zero shared tags (the "thin
      // pool" case mentioned in the doc comment above), so the section
      // still degrades gracefully to "most recent posts" rather than an
      // arbitrary/unstable order.
      return (
        new Date(b.post.publishedAt).getTime() -
        new Date(a.post.publishedAt).getTime()
      );
    });

  // Curated posts keep their editor-chosen order and occupy the front
  // slots; fallback posts are appended after them, filling only the
  // `remaining` slots curation didn't use.
  const fallback = scored.slice(0, remaining).map((entry) => entry.post);
  return {posts: [...curated, ...fallback]};
}
