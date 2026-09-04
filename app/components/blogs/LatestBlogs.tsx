// app/components/blogs/LatestBlogs.tsx
//
// "Latest blogs" sidebar. Editor-curated, not algorithmic — the
// merchant picks the exact posts via the article's
// custom.latest_blogs metafield (Settings > Custom data > Articles >
// "Latest Blogs", type: List > Blog post).
//
// Mirrors RelatedProducts.tsx's pattern: this file only extracts data
// off the metafield shape and renders it. Unlike RelatedProducts, no
// second batch query is needed — Article nodes resolve fully
// (including their own `blog.handle`) directly inside ARTICLE_QUERY,
// so getLatestBlogsData() goes straight from article -> display list
// in one step, no loader-level id-merging required.
//
// Each post carries its own blog.handle, so cards can link into a
// different blog than the one currently being viewed — this is why
// the component takes no blogHandle prop, unlike the old
// candidate-pool version.

import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';

export type LatestBlogPost = {
  id: string;
  title: string;
  handle: string;
  publishedAt: string;
  image?: {url: string; altText?: string | null} | null;
  blog: {handle: string};
};

// How many posts show in the sidebar. Raise/lower to taste — the
// metafield query itself caps at 10 references (see
// ArticleQuery.ts), so raise that too if a merchant curates more
// than 10 posts.
export const LATEST_BLOGS_LIMIT = 4;

export interface LatestBlogsArticle {
  id: string;
  latestBlogs?: {
    references?: {
      nodes?: Array<{
        id: string;
        title: string;
        handle: string;
        publishedAt: string;
        image?: {url: string; altText?: string | null} | null;
        blog?: {handle: string} | null;
      } | null> | null;
    } | null;
  } | null;
}

/**
 * Builds the "Latest blogs" list straight off the article's
 * custom.latest_blogs metafield, preserving the merchant's list
 * order, capped to LATEST_BLOGS_LIMIT. Drops the current article as
 * a safety check (a merchant could technically reference the article
 * it's attached to) and drops any reference missing a resolvable
 * blog handle (e.g. a deleted/unpublished blog). Returns [] if the
 * metafield is unset or empty — callers don't need to special-case
 * that, an empty array flows straight through to <LatestBlogs />
 * rendering null.
 */
export function getLatestBlogsData(
  article: LatestBlogsArticle,
): LatestBlogPost[] {
  const nodes = article.latestBlogs?.references?.nodes ?? [];
  const posts: LatestBlogPost[] = [];

  for (const node of nodes) {
    if (!node?.id || !node.blog?.handle) continue;
    if (node.id === article.id) continue; // safety: self-reference

    posts.push({
      id: node.id,
      title: node.title,
      handle: node.handle,
      publishedAt: node.publishedAt,
      image: node.image,
      blog: {handle: node.blog.handle},
    });

    if (posts.length >= LATEST_BLOGS_LIMIT) break;
  }

  return posts;
}

interface LatestBlogsProps {
  posts: LatestBlogPost[];
}

export default function LatestBlogs({posts}: LatestBlogsProps) {
  if (posts.length === 0) return null;

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
              to={`/blogs/${post.blog.handle}/${post.handle}`}
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