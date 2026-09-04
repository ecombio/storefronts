// app/components/blogs/LatestBlogs.tsx
//
// "Latest blogs" sidebar. Automatic, not editor-curated — pulls from
// the same candidate pool as RelatedBlogPosts (RELATED_POSTS_CANDIDATES_QUERY,
// queried once per article route and shared between both widgets),
// filtered down to whatever wasn't already used as a "related" pick,
// sorted newest-first, and capped to LATEST_BLOGS_LIMIT.
//
// Pairs with RelatedProducts inside a shared .article-right-rail
// wrapper in the article route (see article.css) — this widget's own
// heading/list/card styling lives in LatestBlogs.css, matching the
// componentization pattern used for every other blogs/ widget.

import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';

export type LatestBlogPost = {
  id: string;
  title: string;
  handle: string;
  publishedAt: string;
  image?: {url: string; altText?: string | null} | null;
};

// How many posts show in the sidebar. Raise/lower to taste — this
// only trims the display list, it doesn't change how many candidates
// RELATED_POSTS_CANDIDATES_QUERY fetches upstream (see that query's
// own `first` argument in the route loader for that cap).
export const LATEST_BLOGS_LIMIT = 4;

/**
 * Builds the "Latest blogs" list: candidates minus the current
 * article minus anything already shown in the "Related blogs"
 * section, newest-published-first, capped to LATEST_BLOGS_LIMIT.
 *
 * @param currentArticleId - id of the article currently being viewed,
 *   excluded so the sidebar never links back to the page you're on.
 * @param candidates - the shared candidate pool from
 *   RELATED_POSTS_CANDIDATES_QUERY (candidateBlog?.articles?.nodes).
 * @param excludeIds - ids already used elsewhere on the page (the
 *   RelatedBlogPosts picks) so the two widgets never show duplicate
 *   posts.
 */
export function getLatestBlogsData(
  currentArticleId: string,
  candidates: LatestBlogPost[],
  excludeIds: Set<string>,
): LatestBlogPost[] {
  return candidates
    .filter((node) => node.id !== currentArticleId && !excludeIds.has(node.id))
    .slice()
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, LATEST_BLOGS_LIMIT);
}

interface LatestBlogsProps {
  posts: LatestBlogPost[];
  /** Blog handle to build each post's /blogs/{blogHandle}/{handle} link. */
  blogHandle?: string | null;
}

export default function LatestBlogs({posts, blogHandle}: LatestBlogsProps) {
  if (posts.length === 0 || !blogHandle) return null;

  return (
    <div className="article-latest-blogs">
      <h3 className="article-latest-blogs__heading">Latest blogs</h3>
      <ul className="article-latest-blogs__list">
        {posts.map((post) => (
          <li key={post.id} className="article-latest-blogs__item">
            {post.image && (
              <Image
                data={post.image}
                sizes="280px"
                aspectRatio="4/3"
                crop="center"
                className="article-latest-blogs__thumb"
              />
            )}
            <span className="article-latest-blogs__title">{post.title}</span>
            <Link
              to={`/blogs/${blogHandle}/${post.handle}`}
              className="article-latest-blogs__cta"
            >
              Read more
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}