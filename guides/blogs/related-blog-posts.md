# Related blog posts — `RelatedBlogPosts.tsx`

A "Related blogs" section shown at the end of an article: a grid of
cards (image, title, date, "Read more") linking to other articles.

Files:
- `app/components/blogs/RelatedBlogPosts.tsx` — gating
  (`isRelatedPostsEnabled`), data resolution (`getRelatedPostsData`),
  and the presentational component (default export).
- `app/assets/related-blog-posts.css` — route-scoped styles, matching
  the reference design (bordered cards, square image, uppercase blue
  "Read more" button).

## Where this lives: below the article, not a content marker

You asked whether this should be a marker like the gallery/video/FAQ
blocks, or plain code below the article content. **Below the article,
as its own fixed section** — same pattern as `AuthorSection`, not the
marker → inject → portal pattern the other blocks use. Two reasons:

1. **Those markers exist for editor placement.** An editor drops
   `data-gallery-embed` at a specific spot *inside* the article's rich
   text because they're choosing where, mid-article, that block
   appears. Related posts don't have a "where in the paragraph" — they
   always show as one block after the content, so there's no inline
   position to mark.
2. **The data isn't in `contentHtml` at all.** The other blocks parse
   something the editor already typed into the body (product IDs, FAQ
   text, image tags). Related posts come from elsewhere — a curated
   metafield list, or a query across other articles — so there's
   nothing in the HTML string to find a marker in. It has to be
   resolved in the loader and passed down as data, exactly like
   `authorSection` already is.

So `RelatedBlogPosts` follows `AuthorSection`'s shape: resolve data in
`loadCriticalData`, return it from the loader, render the component
directly (no `createPortal`, no DOM-scanning effect — it was never
inside `dangerouslySetInnerHTML` to begin with).

## How posts are picked

`getRelatedPostsData` tries two sources, in order:

1. **Curated** — if the article has a `custom.related_articles`
   metafield (type `list.article_reference`), those articles are used,
   in the order the editor picked them. This is the "Picked by
   relevant further reading" path — an editor explicitly choosing what
   to surface.
2. **Tag-based fallback** — if no curated list is set, it ranks a pool
   of candidate articles (from the same blog) by how many tags they
   share with the current article, breaking ties by recency, and takes
   the top 3.

Either way, `RelatedBlogPosts` (the component) doesn't care which path
produced the list — it just renders `RelatedPost[]`.

## Wiring into the loader

This needs two additions on the data side that live in files this
session doesn't have visibility into (`ArticleQuery.ts`, the loader in
`blogs.$blogHandle.$articleHandle.tsx`) — add these yourself:

**1. Extend `ARTICLE_QUERY`** with the curated-list metafield and the
show/hide flag, following the same shape `layoutVariant` already uses:

```graphql
metafield(namespace: "custom", key: "show_related_posts") {
  value
}
relatedArticlesField: metafield(namespace: "custom", key: "related_articles") {
  references(first: 3) {
    nodes {
      ... on Article {
        id
        title
        handle
        publishedAt
        blog { handle }
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
```

**2. Add a fallback query** for the tag-based path, run only when the
curated list is empty — something like:

```graphql
query RelatedArticlesPool($blogHandle: String!, $first: Int!) @inContext(language: $language) {
  blog(handle: $blogHandle) {
    articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        tags
        publishedAt
        blog { handle }
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
```

**3. In `loadCriticalData`**, after `article` is resolved:

```ts
import RelatedBlogPosts, {
  getRelatedPostsData,
  isRelatedPostsEnabled,
} from '~/components/blogs/RelatedBlogPosts';

// ...inside loadCriticalData, after `const article = blog.articleByHandle;`

let relatedPosts: ReturnType<typeof getRelatedPostsData> = null;

if (isRelatedPostsEnabled(article)) {
  const curated = article.relatedArticlesField?.references?.nodes;

  // Only run the fallback query when there's no curated list — no
  // reason to fetch a whole article pool if the editor already picked.
  const candidatePool = curated?.length
    ? []
    : (
        await context.storefront.query(RELATED_ARTICLES_POOL_QUERY, {
          variables: {blogHandle, first: 12},
        })
      ).blog?.articles.nodes ?? [];

  relatedPosts = getRelatedPostsData(article, candidatePool);
}
```

Add `relatedPosts` to the loader's return object alongside
`authorSection`.

**4. Add the stylesheet** to `links()`:

```ts
import relatedBlogPostsStyles from '~/assets/related-blog-posts.css?url';
// ...
{rel: 'stylesheet', href: relatedBlogPostsStyles},
```

**5. In the component**, destructure `relatedPosts` from
`useLoaderData()` and render it right after `AuthorSection`:

```tsx
{authorSection && <AuthorSection data={authorSection} />}
{relatedPosts && <RelatedBlogPosts posts={relatedPosts.posts} />}
```

## Props

| Prop      | Type            | Default            | Notes                                   |
|-----------|-----------------|---------------------|------------------------------------------|
| `posts`   | `RelatedPost[]` | —                   | Required.                                |
| `title`   | `string`        | `"Related blogs"`  | Section heading.                         |
| `columns` | `2 \| 3 \| 4`    | `3`                 | Collapses to 1 column under 720px.       |

### `RelatedPost`

```ts
interface RelatedPost {
  id: string;
  title: string;
  handle: string;
  blogHandle: string;
  publishedAt: string;
  image?: {url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
}
```

## Default on, opt-out per article

Unlike the table of contents and author section (both off by default),
related posts default to **on** — an editor turns them off per article
via `custom.show_related_posts = false` rather than turning them on.
That's a deliberate call given the goal (more time on site): most
articles benefit from it, and it's easy to miss enabling a
metafield on every new article but easy to remember disabling it on
the rare one where it doesn't fit (a policy page styled as an
article, for instance).

## Notes / limits

- The tag-based fallback pool is capped at 12 candidates
  (`first: 12`) to keep the fallback query cheap; raise it if your
  blogs are large and tag overlap is sparse.
- If neither a curated list nor any candidates produce results (e.g. a
  brand-new blog with only one article), `getRelatedPostsData` returns
  `null` and the section doesn't render — no empty "Related blogs"
  heading with nothing under it.
- Cards link to `/blogs/{blogHandle}/{handle}`; adjust if your route
  structure differs.
