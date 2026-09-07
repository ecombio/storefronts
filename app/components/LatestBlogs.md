# LatestBlogs

"Latest blogs" article sidebar widget. Shows merchant-picked posts,
stacked in the article's right rail alongside (or instead of)
RelatedProducts.

## Data source

Editor-curated, not algorithmic — mirrors RelatedProducts.tsx's
pattern. The merchant picks the exact posts, in order, via the
article's `custom.latest_blogs` metafield (Settings > Custom data >
Articles > "Latest Blogs", type: List > Blog post).

Unlike RelatedProducts, this needs **no second batch query**: Article
reference nodes resolve fully — including their own `blog.handle` —
directly inside `ARTICLE_QUERY` (see `ArticleQuery.ts`'s `latestBlogs`
field), so `getLatestBlogsData()` goes straight from `article` to a
display list in one step.

Selection logic (`getLatestBlogsData`):

1. Read `article.latestBlogs.references.nodes`.
2. Drop any node missing an id or a resolvable `blog.handle` (e.g. a
   deleted/unpublished blog).
3. Drop the current article as a safety check (self-reference).
4. Preserve the merchant's list order.
5. Cap to `LATEST_BLOGS_LIMIT` (4 by default).

## Usage

**1. In the route loader**:

```ts
import {getLatestBlogsData} from '~/components/blogs/LatestBlogs';

const latestBlogs = getLatestBlogsData(article);
```

**2. Render it** — no manual empty-check needed, the component
self-hides if there are no posts:

```tsx
import LatestBlogs from '~/components/blogs/LatestBlogs';

<LatestBlogs posts={latestBlogs} />
```

**3. Link the stylesheet** in the route's `links()`:

```ts
import latestBlogsStyles from '~/components/blogs/LatestBlogs.css?url';
```

## Notes

- No `blogHandle` prop — each post carries its own `blog.handle`
  (resolved off the Article reference), so cards can link into a
  different blog than the one currently being viewed.
- Pairs with `RelatedProducts` inside a shared `.article-right-rail`
  wrapper in the article route — see `article.css` for that wrapper.
- Raise `LATEST_BLOGS_LIMIT` if you want more than 4 cards shown, and
  raise the `first: 10` cap on the `latestBlogs` metafield field in
  `ArticleQuery.ts` to match if a merchant curates more than 10.
- `RELATED_POSTS_CANDIDATES_QUERY` is unrelated to this widget now —
  that query still exists solely to feed `RelatedBlogPosts`' tag-ranked
  fallback candidates.