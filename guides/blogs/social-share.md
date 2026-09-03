# Social share — `SocialShare.tsx`

A "Social sharing" card shown on an article: email, Facebook, X, and
Pinterest share buttons.

Files:
- `app/components/blogs/SocialShare.tsx` — the component (default
  export) plus optional gating (`isSocialShareEnabled`).
- `app/assets/social-share.css` — route-scoped styles matching the
  reference design (bordered card, blue heading, circular blue
  buttons).

## Where this lives

Same placement as `AuthorSection` / `RelatedBlogPosts`: rendered
directly in the article tree, not a content marker. It's simpler than
either of those, though, for two reasons worth knowing before you wire
it in:

1. **No loader data fetch needed.** Its only inputs — the article's
   title, image, and the page's own URL — are things the route already
   has. There's no metafield to resolve, no related-articles query,
   nothing async.
2. **It works with zero JavaScript.** Every link is a real share-intent
   URL (`mailto:`, Facebook's sharer, X's intent, Pinterest's
   pin-create), so the buttons function as plain navigations even
   before hydration. The `onClick` handlers that open a small popup
   window are a progressive enhancement on top of hrefs that already
   work — remove them entirely and the buttons still share correctly,
   just as a full navigation instead of a popup.

## Wiring in

In `blogs.$blogHandle.$articleHandle.tsx`:

**1. Import and add the stylesheet:**

```ts
import SocialShare from '~/components/blogs/SocialShare';
import socialShareStyles from '~/assets/social-share.css?url';

export function links() {
  return [
    // ...existing entries
    {rel: 'stylesheet', href: socialShareStyles},
  ];
}
```

**2. Build the share URL in the loader.** Use the request's own URL
rather than constructing one by hand, so it's correct in every
environment (preview, staging, custom domains) without extra config:

```ts
// inside loadCriticalData, alongside the other resolved data
const shareUrl = request.url;
```

Add it to the loader's return object:

```ts
return {
  article: {...article, contentHtml},
  shoppableProducts,
  tocEnabled,
  tocHeadings,
  authorSection,
  relatedPosts,
  shareUrl,
};
```

**3. Render it in the component**, wherever it should sit relative to
the other end-of-article sections (the reference design shows it as
its own card, so most articles will want it near the author section
and related posts):

```tsx
const {article, /* ... */ shareUrl} = useLoaderData<typeof loader>();

// ...

<SocialShare
  url={shareUrl}
  title={article.title}
  imageUrl={article.image?.url}
/>
{authorSection && <AuthorSection data={authorSection} />}
{relatedPosts && <RelatedBlogPosts posts={relatedPosts.posts} />}
```

## Optional: per-article opt-out

`isSocialShareEnabled` follows the same shape as
`isRelatedPostsEnabled` — on by default, opt out per article via a
`custom.show_social_share` metafield set to `"false"`. Only worth
adding if you expect some articles (a policy page styled as an
article, for instance) shouldn't offer sharing:

```ts
metafield(namespace: "custom", key: "show_social_share") {
  value
}
```

```tsx
{isSocialShareEnabled(article) && (
  <SocialShare url={shareUrl} title={article.title} imageUrl={article.image?.url} />
)}
```

If you don't need per-article control, skip this — just render
`<SocialShare />` unconditionally.

## Props

| Prop       | Type     | Default            | Notes                                            |
|------------|----------|---------------------|----------------------------------------------------|
| `url`      | `string` | —                   | Required. The article's canonical/current URL.    |
| `title`    | `string` | —                   | Required. Used as share text/email subject.        |
| `imageUrl` | `string` | —                   | Optional. Used for Pinterest's share preview.       |
| `heading`  | `string` | `"Social sharing"`  | Section heading.                                   |

## Notes / limits

- Facebook and Pinterest's share dialogs pull their own preview
  (image/title/description) from the target page's Open Graph tags at
  share time, not from the props passed here — make sure the article
  route sets `og:title` / `og:image` / `og:url` in `meta()` so shared
  links look right regardless of which button was clicked.
- The popup enhancement uses `window.open(...)`, so it only runs in the
  browser — safe as-is since it's inside an `onClick`, which never
  executes during SSR.
- No X/Twitter card requirement beyond the same Open Graph tags above;
  X falls back to OG tags when its own `twitter:*` tags aren't present.
