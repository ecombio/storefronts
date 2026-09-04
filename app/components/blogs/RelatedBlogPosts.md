# Related Blog Posts

"Related blogs" section shown at the very bottom of an article, after
the "About the author" card — a carousel of other posts the reader
might want next.

- Component: `app/components/blogs/RelatedBlogPosts.tsx`
- Card component: `app/components/blogs/BlogPostCard.tsx`
- Styles (section wrapper + carousel track): `app/components/blogs/RelatedBlogPosts.css`
- Styles (individual card): `app/components/blogs/BlogPostCard.css`
- Route wiring: `app/templates/blogs.$blogHandle.$articleHandle.tsx`

## For editors: there is no marker

Like Social Share, Related Blog Posts has **no `data-*` marker** and
cannot be placed inline in the article body via HTML source view.
There's nothing to type into the article to control where it appears
— it always renders as one fixed block at the very end of the article,
after the author section.

What an editor *can* control is:

1. **Whether it shows at all**, via a metafield.
2. **Which posts get priority**, via a curated list metafield.

If nothing is curated, the section still shows automatically — it
fills itself in from other posts in the same blog.

### Metafields

| Metafield | Type | Effect |
|---|---|---|
| `custom.show_related_posts` | Boolean-as-string | Set to `false` to hide the section on this article entirely. Any other value, or unset, shows it — **default is on** (opposite default from the table of contents and author section, which are off by default). |
| `custom.related_blog_posts` | `list.article_reference` | Editor-picked articles to feature, in the order they're picked. These always take the front-most slots in the carousel. |

### How curated picks and automatic fallback combine

This section never shows a completely empty state and never requires
manual curation — the two sources **merge**, they aren't either/or:

- Editor picks from `custom.related_blog_posts` always go first, in
  the order the editor chose them.
- Any slots left over (up to a limit of 3 posts by default) are filled
  automatically with other articles from the same blog, ranked by how
  many tags they share with the current article — most shared tags
  first, ties broken by most recent.
- If an editor picks 0 posts, all 3 slots fill automatically.
- If an editor picks 3 or more, the automatic fallback never runs at
  all.
- If an editor picks 2, the 3rd slot is filled by the best-ranked
  automatic candidate.

An automatically-filled post can have zero tags in common with the
current article if the pool of other posts is thin — this fallback is
there to keep the section populated, not to enforce strict topical
relevance.

## Data points reference

Related Blog Posts has no editor-authored markers and no client-side
slot — like Author Section and Social Share, it's resolved in the
loader and rendered directly in the route's JSX tree. There's no DOM
scan or portal step for this feature.

### Gating input (`RelatedPostsSourceArticle`)

| Field | Purpose |
|---|---|
| `id` | The current article's own id — used to exclude it from the automatic-fallback pool, in case it ever shows up there. |
| `tags` | The current article's tags, used to rank fallback candidates by shared-tag count. |
| `metafield` (`custom.show_related_posts`) | When its `value` is exactly `'false'`, `isRelatedPostsEnabled` returns `false` and the section doesn't render. Any other value, or none at all, is treated as enabled. |
| `relatedArticlesField` (`custom.related_blog_posts`) | The curated `list.article_reference` metafield. Its `references.nodes` are the editor's picks, reshaped into `RelatedPost` objects and capped at the slot limit. If curated picks never show up despite being set in the admin, check that `ARTICLE_QUERY` actually requests this field with `references(first: N) { nodes {...} }` under this alias — an unaliased or unexpanded metafield resolves to `undefined` here with no error, so the section silently falls back to auto-fill instead of failing loudly. |

### Candidate pool input (`RelatedPostCandidate[]`)

Not part of `article` — fetched separately in the loader (see
`RELATED_POSTS_CANDIDATES_QUERY` below) and passed into
`getRelatedPostsData` as its own argument. Each candidate carries the
same shape as `RelatedPost` plus `tags`, needed only for the ranking
step and dropped once a candidate is selected.

**Gotcha:** `RELATED_POSTS_CANDIDATES_QUERY` returns each candidate
with a **nested** `blog: {handle}`, but `RelatedPostCandidate` (like
`RelatedPost`) expects a **flat** `blogHandle` field — the same
flattening `getRelatedPostsData` already does inline for curated
picks. The loader must map the raw query nodes into that flat shape
*before* calling `getRelatedPostsData`; skipping this step doesn't
error, it just leaves `blogHandle` as `undefined` on any post that
came from the fallback path, which surfaces downstream as a broken
`/blogs/undefined/{handle}` link on that card.

### Component props (`RelatedBlogPostsProps`)

| Prop | Required | Purpose |
|---|---|---|
| `posts` | Yes | The already-merged (curated + fallback) list to render, one `<BlogPostCard>` each. |
| `title` | No | Section heading. Defaults to `"Related blogs"`. |
| `columns` | No | Visible-card count at desktop width: `2`, `3`, or `4`. Defaults to `3`. Passed through as the `--rbp-columns` CSS custom property, which the stylesheet reads to size each card's `flex-basis` in the carousel track (not a `grid-template-columns` count anymore — see "How it works" below). |

## How it works (engineering summary)

1. **No loader transform on `contentHtml`.** Unlike the marker-based
   blocks, this feature never touches the article body string at all
   — it only reads metafields off `article` and ranks against a
   separately-fetched candidate pool.
2. **`RELATED_POSTS_CANDIDATES_QUERY`** fetches a window of recent
   articles from the same blog (`first: 20` by default in the route),
   fetched in parallel with `ARTICLE_QUERY` via `Promise.all` in the
   loader, since the candidate query only needs `blogHandle` and
   doesn't depend on anything the article query returns. This
   over-fetches on purpose — the Storefront API has no server-side
   "related articles" or tag-overlap ranking, only simple `tag:`
   filtering, so `getRelatedPostsData` does the ranking client-side
   (loader-side) against whatever this query returns. The loader must
   flatten each raw node's `blog.handle` into `blogHandle` before
   passing the array in — see the candidate-pool gotcha above.
3. **`getRelatedPostsData(article, candidatePool, {limit})`** runs the
   merge logic described above and returns either `{posts: [...]}` or
   `null` — `null` means "opted out, or nothing to show at all," which
   the route uses to skip rendering entirely.
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
- The metafield comparison is against the string `'false'`, not a
  boolean — Storefront API metafields always come back as raw strings.
- `blogHandle` is genuinely dynamic per post, not a fixed segment —
  the route itself is `$blogHandle`/`$articleHandle`, and other links
  in the same route (the "Latest blogs" rail, the back button) all
  build their URLs from the current article's real blog handle too.
  Don't hardcode a blog handle anywhere in this feature as a shortcut
  around a missing/undefined value; fix the missing value at its
  source instead (see the candidate-pool gotcha above).