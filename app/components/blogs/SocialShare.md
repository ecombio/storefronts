# Social Share

"Social sharing" card shown on a blog article: email, Facebook, X, and
Pinterest share links.

- Component: `app/components/blogs/SocialShare.tsx`
- Styles: `app/components/blogs/SocialShare.css`
- Route wiring: `app/templates/blogs.$blogHandle.$articleHandle.tsx`

## For editors: there is no marker

Unlike the newsletter form, FAQ, CTA, quote, recipe header, two-column,
video, and gallery blocks, **Social Share has no `data-*` marker and
cannot be placed by editors in the HTML source view.** There is
nothing to type into the article body for this section.

Its only inputs — article title, hero image, and the page's own
canonical URL — are already available to the route/loader rather than
embedded in the rich text body, so there's no per-article placement
control. It always renders as a fixed section, directly after the
body/TOC grid and directly above the "About the author" card.

### Turning it off for a specific article

The one thing an editor *can* control is whether it shows up at all,
via a metafield:

| Metafield | Effect |
|---|---|
| `custom.show_social_share` | Set to `false` to hide Social Share on this article. Any other value (or unset) shows it — **default is on.** |

> As of this writing, `custom.show_social_share` has not yet been
> added to `ARTICLE_QUERY`, so `isSocialShareEnabled` currently always
> returns `true` regardless of any metafield. The opt-out is wired in
> the component but not yet reachable from Shopify admin. See
> "Known limitation" below.

## Data points reference

Social Share has no editor-authored markers and no client-side slot —
it is rendered directly in the route's JSX tree, the same shape as
`AuthorSection` and `RelatedBlogPosts`. There is nothing to scan for
in the DOM after mount.

### Component props (`SocialShareProps`)

| Prop | Required | Source | Purpose |
|---|---|---|---|
| `url` | Yes | Loader's `canonicalUrl` (`request.url`, post locale-redirect) | The link being shared. |
| `title` | Yes | `article.title` | Used as share text/subject across all four platforms. |
| `imageUrl` | No | `article.image?.url` (hero image) | Used for Pinterest's richer share preview. Falls back to no image if the article has none. |
| `heading` | No | — | Section heading text. Defaults to `"Social sharing"`. |

### Gating input (`SocialShareSourceArticle`)

| Field | Purpose |
|---|---|
| `metafield` (`custom.show_social_share`) | When its `value` is exactly `'false'`, `isSocialShareEnabled` returns `false` and the section doesn't render. Any other value, or no metafield at all, renders it. |

## How it works (engineering summary)

1. **No loader transform.** Nothing in `contentHtml` is scanned or
   rewritten for this feature — it's the simplest block in the
   pipeline. `isSocialShareEnabled(article)` is just a metafield check.
2. **No client-side scan or portal.** `<SocialShare>` is mounted
   directly in the route's JSX, right after the body/TOC grid. There's
   no slot, no `useEffect` DOM query, no hydration swap — the
   component that server-renders is the component that runs on the
   client.
3. **Zero-JS by default.** Every share link is a real, fully-functional
   URL on its own:
   - Email → `mailto:` link
   - Facebook → `https://www.facebook.com/sharer/sharer.php?u=...`
   - X → `https://twitter.com/intent/tweet?url=...&text=...`
   - Pinterest → `https://pinterest.com/pin/create/button/?url=...&description=...&media=...`

   Clicking any of them navigates like any other `<a>` even with no
   JavaScript at all.
4. **Popup as progressive enhancement.** Facebook/X/Pinterest links
   also carry `target="_blank"` and `rel="noopener noreferrer"` as a
   no-JS fallback (opens in a new tab). Once hydrated, an `onClick`
   calls `event.preventDefault()` and opens the same URL in a small
   `window.open(...)` popup instead — a nicer share experience, but
   never required for the link to work. The email link has no popup
   handling; it always just navigates the current tab.

### Known limitation

`custom.show_social_share` is referenced in code
(`SocialShareSourceArticle['metafield']`) but has **not yet been added
to `ARTICLE_QUERY`**. Until that query is extended to fetch it,
`article.metafield` is always `undefined`, so `isSocialShareEnabled`
always returns `true` — there is currently no way for an editor to
actually opt an article out of Social Share, despite the gating logic
being fully implemented. Add the metafield to `ARTICLE_QUERY` to make
the opt-out functional.
