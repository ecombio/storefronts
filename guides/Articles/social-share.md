# Social Share

A "Social sharing" card with email, Facebook, X, and Pinterest links,
shown on every blog article — right after the body/TOC grid, directly
above the author section.

## How this is different from FAQ / CTA button / Quote

Those three are **markers**: an editor types a snippet like
`[faq]...[/faq]` somewhere inside the article body in the Shopify
blog editor, and the loader replaces it with real markup at that
exact spot.

Social Share has **no marker and no editor-controlled placement**.
It always renders in the same spot (between the article body and the
author section) on every article, the same way the author section
and related-posts section do. There is nothing to type into the
article body for this feature — if you're looking for marker syntax,
this isn't that kind of block.

## What it shows

Four share links, generated automatically from data the page already
has — no editor input required for the links themselves:

| Platform  | Uses                                  |
|-----------|----------------------------------------|
| Email     | Article title (subject) + page URL (body) |
| Facebook  | Page URL |
| X         | Page URL + article title |
| Pinterest | Page URL + article title + hero image (if the article has one) |

If the article has no hero image, Pinterest still gets a working
share link — it just won't show a pre-filled image preview on
Pinterest's side.

## Turning it on/off per article

Off by default is *not* the behavior today — until `custom.show_social_share`
is added to `ARTICLE_QUERY`, this section renders on **every**
article, with no way to opt out from the editor. To make it
optional per article:

1. Add a `custom.show_social_share` boolean metafield to the Article
   resource in Shopify admin (Settings → Custom data → Article).
2. Add `metafield(namespace: "custom", key: "show_social_share") { value }`
   to `ARTICLE_QUERY` in `~/graphql/blog/ArticleQuery`.
3. That's it on the code side — `isSocialShareEnabled()` already
   reads `article.metafield?.value !== 'false'`, so it'll start
   respecting the field the moment the query returns it. Default
   behavior (metafield unset) is **on**, matching
   `isRelatedPostsEnabled`'s default-on pattern — an editor has to
   explicitly set it to `false` to hide the section, not explicitly
   turn it on.

There's currently no per-article way to change *which* platforms show
up (e.g. hide Pinterest on one article) — it's all four or the whole
section, same on/off granularity as the author section.

## Customizing the heading

The card's heading defaults to "Social sharing" via the `heading`
prop's default value in `SocialShare.tsx`. To change the copy
site-wide, edit that default. To make it editable per-article instead
(e.g. from a metafield), that'd be a small addition: read a new
metafield in `getAuthorSectionData`-style fashion... actually simpler
here, since Social Share has no loader-side data resolver at all —
you'd just pass an extra prop straight from `article` in the route
component, no new loader logic needed:

```tsx
<SocialShare
  url={canonicalUrl}
  title={title}
  imageUrl={image?.url}
  heading={article.socialShareHeading?.value}  // falls back to "Social sharing" if unset
/>
```

## Adding or removing a platform

Platforms are a flat array (`PLATFORMS` in `SocialShare.tsx`), each
entry is:

```ts
{
  id: 'facebook',
  label: 'Share on Facebook',        // aria-label on the link
  href: ({url, title, imageUrl}) => `...`,  // builds the share-intent URL
  popup: true,                       // true = _blank + small popup window on click; false = plain same-tab navigation (only email uses false)
  icon: FacebookIcon,                // inline SVG component, 18x18 (X is 16x16 to visually balance stroke weight)
}
```

To add a platform (e.g. WhatsApp, LinkedIn), add an entry with its
share-intent URL format and an icon component, following the same
shape. To remove one, delete its entry — nothing else references the
`PLATFORMS` array by index or count.

## Behavior notes

- **Works with zero JavaScript.** Every `href` is a real, complete
  share-intent URL. The `onClick` popup behavior is a progressive
  enhancement on top of hrefs that already function as plain links —
  disable JS and every button still works, it just navigates instead
  of popping up a small window.
- **Popup vs. navigation.** Email always navigates the current tab
  (opens the user's mail client). Facebook/X/Pinterest open in a new
  tab (`target="_blank"`) as the no-JS fallback, and — when JS is
  available — in a small centered popup window instead, so the reader
  never fully leaves the article.
- **No client-side data fetching or state.** Unlike the shoppable/
  newsletter/video/gallery blocks, there's no portal step and no
  DOM-scanning effect for this component — it's mounted directly in
  the route's JSX tree, same as the author section.

## Where the URL comes from

`SocialShare`'s `url` prop is the loader's `canonicalUrl`
(`request.url`, captured in `loadCriticalData` **after**
`redirectIfHandleIsLocalized` runs), not something rebuilt from
`params.blogHandle`/`params.articleHandle`. That matters for
localized markets: if the requested handle isn't the canonical one
for the resolved locale, the redirect fires first, so `request.url`
by the time it's captured always reflects the canonical, shareable
URL — never a handle that's about to redirect.

## Related files

- `~/components/blogs/SocialShare.tsx` — component + platform list +
  `isSocialShareEnabled` gating fn
- `~/assets/social-share.css` — styles (`.ss-root`, `.ss-heading`,
  `.ss-list`, `.ss-button`)
- `~/templates/blogs.$blogHandle.$articleHandle.tsx` — where it's
  wired in (stylesheet link, `canonicalUrl` in the loader payload,
  render call between the body/TOC grid and `<AuthorSection>`)
