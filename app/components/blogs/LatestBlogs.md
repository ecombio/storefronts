# LatestBlogs

"Latest blogs" article sidebar widget. Shows the most recently
published posts from the same blog, stacked in the article's right
rail alongside (or instead of) RelatedProducts.

## Data source

Automatic, not editor-curated — this is the one widget in the right
rail that isn't driven by a metafield. It reuses the same candidate
pool already fetched for `RelatedBlogPosts`
(`RELATED_POSTS_CANDIDATES_QUERY`, queried once per article route),
so pulling this list costs zero extra network round-trips.

Selection logic (`getLatestBlogsData`):

1. Start from the shared candidate pool (same-blog articles).
2. Drop the article currently being viewed.
3. Drop anything already shown in the "Related blogs" section
   (`RelatedBlogPosts`), so the two widgets never duplicate a post.
4. Sort newest-published-first.
5. Cap to `LATEST_BLOGS_LIMIT` (4 by default).

## Usage

**1. In the route loader**, after computing `relatedPosts`:

```ts
import {getLatestBlogsData} from '~/components/blogs/LatestBlogs';

const relatedPostIds = new Set(
  (relatedPosts?.posts ?? []).map((post) => post.id),
);

const latestBlogs = getLatestBlogsData(
  article.id,
  candidateBlog?.articles?.nodes ?? [],
  relatedPostIds,
);
```

**2. Render it** — no manual empty-check needed, the component
self-hides if there are no posts or no `blogHandle` to link into:

```tsx
import LatestBlogs from '~/components/blogs/LatestBlogs';

<LatestBlogs posts={latestBlogs} blogHandle={blogHandle} />
```

**3. Link the stylesheet** in the route's `links()`:

```ts
import latestBlogsStyles from '~/components/blogs/LatestBlogs.css?url';
```

## Notes

- `blogHandle` is required to build each card's
  `/blogs/{blogHandle}/{handle}` link — pass `null`/`undefined` and
  the component renders nothing, same as an empty `posts` array.
- Pairs with `RelatedProducts` inside a shared `.article-right-rail`
  wrapper in the article route — see `article.css` for that wrapper
  and `TableOfContents.css` for the grid column it sits in.
- Raise `LATEST_BLOGS_LIMIT` if you want more than 4 cards shown; this
  only affects the display cap, not how many candidates
  `RELATED_POSTS_CANDIDATES_QUERY` fetches upstream.
