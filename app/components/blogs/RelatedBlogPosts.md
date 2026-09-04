# Related Blog Posts

"Related blogs" section shown at the very bottom of an article, after
the "About the author" card — a carousel of other posts the reader
might want next.

- Component: `app/components/blogs/RelatedBlogPosts.tsx`
- Card component: `app/components/blogs/BlogPostCard.tsx`
- Styles (section wrapper + carousel track): `app/components/blogs/RelatedBlogPosts.css`
- Styles (individual card): `app/components/blogs/BlogPostCard.css`
- Route wiring: `app/templates/blogs.$blogHandle.$articleHandle.tsx`

## For editors: there is no marker, and there is no on/off switch

Like Social Share, Related Blog Posts has **no `data-*` marker** and
cannot be placed inline in the article body via HTML source view.
There's nothing to type into the article to control where it appears
— it always renders as one fixed block at the very end of the article,
after the author section.

There's also no separate "show/hide" metafield. The section's
existence is determined entirely by one thing:

| Metafield | Type | Effect |
|---|---|---|
| `custom.related_blog_posts` | `list.article_reference` | The editor's picks, in the order they're picked. **If this list is empty, the section does not render — nothing else can turn it on, and nothing else can turn it off.** |

Presence of items in the list *is* the toggle — the same pattern used
by `RelatedProducts` (`custom.related_products`) and `LatestBlogs`
(`custom.latest_blogs`). There is no automatic fallback anymore: if an
editor hasn't picked anything, the section simply isn't there. It does
not fill itself in from other posts in the blog.

## Data points reference

Related Blog Posts has no editor-authored markers and no client-side
slot — it's resolved in the loader and rendered directly in the
route's JSX tree. There's no DOM scan or portal step for this feature.

### Gating input (`RelatedPostsSourceArticle`)

| Field | Purpose |
|---|---|
| `relatedBlogPosts` (`custom.related_blog_posts`) | The curated `list.article_reference` metafield. Its `references.nodes` are the editor's picks, reshaped into `RelatedPost` objects and capped at the slot limit. **This property name must exactly match the alias `ArticleQuery.ts` gives the field** (`relatedBlogPosts: metafield(...)`) — if the two ever drift apart, `nodes` silently resolves to `[]` on every article and the section never renders, with no error anywhere, no matter what's curated in the admin. This is exactly what happened before this doc was updated: the field here was named `relatedArticlesField`, which didn't exist anywhere in the query's actual response shape. Also make sure each node selects `id` — a missing `id` silently drops that node when it's reshaped. |

## How it works (engineering summary)

1. **No loader transform on `contentHtml`.** Like the marker-based
   blocks it isn't — this feature never touches the article body
   string at all — it only reads one metafield off `article`.
2. **`getRelatedPostsData(article, {limit})`** reads
   `article.relatedBlogPosts.references.nodes`, reshapes each node
   into a `RelatedPost`, and caps the result at `limit` (default 3).
   Returns `null` if the list is empty — `null` means "nothing to
   show," which the route uses to skip rendering entirely.
3. **No candidate-pool query.** There is no tag-ranking, no
   `RELATED_POSTS_CANDIDATES_QUERY`, and no second network round-trip
   for this feature — everything it needs resolves inside
   `ARTICLE_QUERY` itself.
4. **No portal, no DOM scan.** `<RelatedBlogPosts posts={...} />` is
   mounted directly in the route's JSX, at the very bottom, after
   `<AuthorSection>`. It doesn't hydrate into anything that came from
   `dangerouslySetInnerHTML`, so there's no slot to find.
5. **It's a carousel, not a static grid.** `posts` renders into a
   horizontally-scrolling, `scroll-snap`-based track
   (`app/components/blogs/RelatedBlogPosts.css`'s `.rbp-track`), not a
   CSS grid. Prev/next buttons above the track just call `scrollBy()`
   on it by one card's width — there's no separate "current slide"
   index in component state, so a manual swipe/drag can never fall out
   of sync with the buttons. Native scroll also means touch/trackpad
   swiping works without any extra code, and `prefers-reduced-motion`
   is respected by switching the scroll behavior to instant.
6. **Card rendering is delegated.** This file owns only the section
   heading, nav buttons, and carousel track (`.rbp-*` classes) — each
   post is rendered by `<BlogPostCard>`, a separate, independently
   reusable component (and stylesheet, `BlogPostCard.css`) so it can
   later be mounted from other routes or sections (a blog index page,
   a "recent posts" widget) without pulling in this file's section/
   track rules. The whole card is one click target via a stretched
   link on the card's title — see `BlogPostCard.tsx`'s header comment.

### Notes for future maintenance

- `RelatedPost` is a type alias for `BlogPostCardData` (re-exported
  under its original name) so nothing importing `RelatedPost` needed
  to change when the card's shape moved into `BlogPostCard.tsx`.
- `blogHandle` is genuinely dynamic per post, not a fixed segment —
  the route itself is `$blogHandle`/`$articleHandle`, and other links
  in the same route (the "Latest blogs" rail, the back button) all
  build their URLs from each post's own blog handle too. Don't
  hardcode a blog handle anywhere in this feature as a shortcut around
  a missing/undefined value; fix the missing value at its source
  instead (i.e. the `blog { handle }` selection in `ArticleQuery.ts`).
- Previously this section defaulted to "on" and auto-filled from a
  tag-ranked candidate pool (`custom.show_related_posts` +
  `RELATED_POSTS_CANDIDATES_QUERY`) when nothing was curated. That
  entire fallback path — the gating metafield, the candidates query,
  and the ranking logic — has been removed. If you're looking for it
  in an older version of this file, it's gone on purpose: the section
  is now curated-only.