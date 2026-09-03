# Related Blog Posts

"Related blogs" section rendered at the end of an article. Same
three-part shape as `AuthorSection` (gating fn + data-resolver fn +
presentational component) — **not** the marker/inject/portal pattern
used by `ProductGallery`/`FaqSection`/`NewsletterForm`/`video`/
`ImagesGallery`, since related posts aren't placed via an inline
editor marker — they're picked (curated, or worked out from tags) and
always render as one fixed block after the article body.

Files:
- `app/components/blogs/RelatedBlogPosts.tsx` — the "related posts"
  feature itself: gating, the candidate-pool GraphQL query, the
  curated+fallback merge logic, and the section/grid wrapper
  component. Renders one `<BlogPostCard>` per post.
- `app/components/blogs/BlogPostCard.tsx` — a single post-preview
  card (image, title, date, "Read more"), extracted out so it's
  reusable anywhere a post preview is needed, not just here.
- `app/assets/related-blog-posts.css` — section/grid styles only
  (`.rbp-*`)
- `app/assets/blog-post-card.css` — card styles only (`.bpc-*`),
  loaded wherever `<BlogPostCard>` is rendered
- This file — setup + wiring + examples

## Why BlogPostCard is a separate component

Nothing about a post-preview card — image, title, date, "Read more" —
is specific to the "related posts" section. Keeping it as its own
component means a future blog index page, search results page, or
"recent posts" widget can render the exact same card:

```tsx
import BlogPostCard from '~/components/blogs/BlogPostCard';
import blogPostCardStyles from '~/assets/blog-post-card.css?url';

// in links():
{rel: 'stylesheet', href: blogPostCardStyles},

// in JSX, inside whatever <ul>/<ol> the caller provides:
{posts.map((post) => <BlogPostCard key={post.id} post={post} />)}
```

`RelatedBlogPosts` only owns the section heading, grid layout, and
column count — it has no opinion on what a card looks like anymore.
`BlogPostCard` has no opinion on grids, headings, or sections — it
renders one `<li>` and expects its parent to be a list.


---

## 1. Metafield setup (Shopify Admin)

Two metafield definitions on the **Article** resource:

| Name | Namespace.key | Type | Required |
|---|---|---|---|
| Related blog posts | `custom.related_blog_posts` | List of Blog post (`list.article_reference`) | No |
| Show related posts | `custom.show_related_posts` | Boolean | No |

**`custom.related_blog_posts`**
The curated pick list. Leave it empty on an article and the section
falls back entirely to tag-based matching (see §3). Fill in 1–2 and
the remaining slots (up to `limit`, default 3) auto-fill from tags.
Fill in 3+ and the fallback never runs.

Order matters: articles render in the exact order they're added to
this list.

Optional but recommended: set a max list length of `3` (or whatever
`limit` you render with) on the definition itself, so editors get
inline validation instead of silently having extra picks truncated by
`.slice(0, limit)` in code.

**`custom.show_related_posts`**
Defaults to **shown**. Only set this to `false` to opt an individual
article out of the section entirely (no curated picks, no fallback).
Leaving it unset, or setting it to anything other than the literal
string `"false"`, keeps the section on — this mirrors how
`show_toc`/`show_author_section` work elsewhere in this codebase,
just with the default flipped (related posts are on-by-default since
the point of the feature is to increase time-on-site).

---

## 2. GraphQL — additions to `ARTICLE_QUERY`

Add the metafield lookup to the article query
(`app/graphql/blog/ArticleQuery.ts`), inside the `Article` fragment:

```graphql
tags
metafield(namespace: "custom", key: "show_related_posts") {
  value
}
relatedArticlesField: metafield(namespace: "custom", key: "related_blog_posts") {
  value
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

> Adjust `first: 3` if you render with a different `limit`.

## 3. GraphQL — candidate-pool query (already in RelatedBlogPosts.tsx)

The tag-based fallback needs a separate pool of "other articles in
this blog" to rank against — the Storefront API has no native
"related articles" concept and no server-side tag-overlap ranking
(confirmed against the current `Article`/`Blog` object docs: `Blog`
only exposes `articles`, filterable by simple `tag:` query syntax and
sortable, with no relevance scoring). So the ranking happens in your
loader, against a pool fetched by `RELATED_POSTS_CANDIDATES_QUERY` —
already exported from `RelatedBlogPosts.tsx`, nothing to add here.
Import it alongside the component itself:

```ts
import RelatedBlogPosts, {
  getRelatedPostsData,
  RELATED_POSTS_CANDIDATES_QUERY,
} from '~/components/blogs/RelatedBlogPosts';
```

`first` (passed as a query variable at call time — see §4) should be
a window comfortably larger than `limit` — e.g. 20 — since ranking
happens loader-side over whatever this returns, not server-side.

---

## 4. Loader wiring

In `loadCriticalData` (`blogs.$blogHandle.$articleHandle.tsx`), using
the `RELATED_POSTS_CANDIDATES_QUERY` imported from
`RelatedBlogPosts.tsx` (see §3):

```ts
// Fetch the candidate pool alongside the main article query — same
// blog, most recent N articles, with tags for ranking.
const [{blog}, {blog: candidateBlog}] = await Promise.all([
  context.storefront.query(ARTICLE_QUERY, {
    variables: {blogHandle, articleHandle},
  }),
  context.storefront.query(RELATED_POSTS_CANDIDATES_QUERY, {
    variables: {blogHandle, first: 20},
  }),
]);

// ...after `article` is resolved...

const relatedPosts = getRelatedPostsData(
  article,
  candidateBlog?.articles?.nodes ?? [],
);
```

Return `relatedPosts` alongside `tocEnabled`/`tocHeadings`/
`authorSection` in the loader's final payload.

## 5. Component wiring

One import covers the whole feature — component, resolver, and query
all come from the same file:

```tsx
import RelatedBlogPosts, {
  getRelatedPostsData,
  RELATED_POSTS_CANDIDATES_QUERY,
} from '~/components/blogs/RelatedBlogPosts';
import relatedBlogPostsStyles from '~/assets/related-blog-posts.css?url';
import blogPostCardStyles from '~/assets/blog-post-card.css?url';

export function links() {
  return [
    // ...existing entries...
    {rel: 'stylesheet', href: relatedBlogPostsStyles},
    {rel: 'stylesheet', href: blogPostCardStyles},
  ];
}
```

Render after `AuthorSection`, at the very end of the article:

```tsx
{authorSection && <AuthorSection data={authorSection} />}
{relatedPosts && <RelatedBlogPosts posts={relatedPosts.posts} />}
```

---

## How the merge works

`getRelatedPostsData(article, candidatePool, {limit = 3})` **merges**
curated picks with the tag-based fallback rather than choosing one or
the other:

1. Curated picks (from `custom.related_blog_posts`) fill the front
   slots, in the order they were added.
2. Whatever slots are left (`limit - curated.length`) are filled by
   candidates ranked by shared-tag count, ties broken by recency.
3. A curated pick can never also appear via the fallback (already-
   curated ids are excluded from the candidate pool before ranking).

| Curated picks | `limit` | Result |
|---|---|---|
| 0 | 3 | 3 tag-ranked posts (pure fallback) |
| 2 | 3 | Those 2, in order, + 1 tag-ranked post |
| 3 | 3 | Those 3, in order (fallback never runs) |
| 5 | 3 | First 3 of the 5, in order (fallback never runs) |

If there's nothing to show at all (section disabled, or 0 curated
picks and an empty/exhausted candidate pool), `getRelatedPostsData`
returns `null` and the caller skips rendering — same contract as
`getAuthorSectionData`.

## Notes / gotchas

- **Tag overlap is unranked by the API.** The Storefront API's
  `Blog.articles(query: "tag:x")` filters, it doesn't score relevance
  — the shared-tag ranking is entirely client-side, over whatever
  candidate window you fetch. A wider `first` on the candidate query
  gives the ranking more to work with, at the cost of a slightly
  bigger response.
- **A deleted/unpublished curated article** resolves to nothing in
  `references.nodes` — the metafield reference just silently drops
  it, no error. No special handling needed on your end.
- **`limit` is a prop of `getRelatedPostsData`, not the component.**
  The component just renders whatever `posts` array it's given —
  change how many show by passing a different `limit` to
  `getRelatedPostsData` in the loader, not by trimming in JSX.
