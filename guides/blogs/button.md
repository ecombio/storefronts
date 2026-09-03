# BlogButton

`app/components/blogs/button.tsx` · styles in `app/assets/blog-button.css`

CTA button for blog articles — mid-article product plugs, end-of-post "shop
the look," related-collection banners. Two ways to use it, sharing one
stylesheet so they render identically:

1. **`data-cta` marker** — editors drop a marker `<div>` straight into an
   article's HTML in the Shopify blog editor; `injectBlogButtons()` turns it
   into real button markup server-side, no app deploy needed per-post.
2. **`<BlogButton>`** — the React component, for CTAs you place directly in
   route/component JSX (e.g. a fixed CTA after `AuthorSection`).

This follows the same pattern already used by `injectFaqSections`,
`injectNewsletterForm`, and `injectVideoEmbeds` in
`blogs.$blogHandle.$articleHandle.tsx` — a pure string transform over
`article.contentHtml` in the loader. Unlike the newsletter form and video
embed, a button needs no `createPortal`/slot: it doesn't call
`useNavigate()` or `useFetcher()`, so a plain `<a href>` works with zero
hydration, the same reason `injectTwoColumnContent` renders fully static
too.

---

## For editors: the marker syntax

In the Shopify blog post's HTML editor, type:

```html
<div data-cta="primary" data-cta-href="/collections/new-arrivals"
     data-cta-id="blog-summer-guide-shop">Shop new arrivals</div>
```

| Attribute        | Required | Values                                              |
|-------------------|----------|------------------------------------------------------|
| `data-cta`         | yes      | `primary` \| `secondary` \| `outline` \| `ghost` \| `link` |
| `data-cta-href`    | yes      | destination URL, relative or absolute                |
| `data-cta-id`      | recommended | analytics id, e.g. `blog-{post-slug}-{action}` — see **Tracking** |
| `data-cta-size`    | no       | `sm` \| `md` (default) \| `lg`                        |
| inner text        | yes      | the button label — keep it short and active ("Shop new arrivals") |

If `data-cta-href` or the label is missing, the marker is left as a raw
`<div>` in the rendered page rather than silently disappearing — so a typo
shows up as visibly broken in preview instead of just costing you a CTA
nobody notices is missing.

**One `primary` per screenful.** If a post has several markers, make one
`primary` and the rest `secondary`/`outline` — stacking several `primary`
buttons dilutes which action matters.

---

## Self-contained styling

Every sibling stylesheet in this route (`article.css`, `two-column-content.css`,
`video.css`, and originally this one too) follows a manual pattern: import
with `?url`, push into that route's `links()` array. That works, but it
means the button's styling only exists wherever someone remembers to wire
it — including into `root.tsx`, since a CTA button is general-purpose
rather than blog-only (see the `newsletter-form.css` precedent, which loads
globally for the same reason).

Instead, `button.tsx` imports `~/assets/blog-button.css` directly as a
side-effect import (no `?url`, no `links()` entry):

```ts
import '~/assets/blog-button.css';
```

Vite's built-in CSS handling picks this up automatically — any route or
component that imports `BlogButton` or `injectBlogButtons` gets the
stylesheet for free, with no `links()` bookkeeping and nothing to add to
`root.tsx`. That's the tradeoff: you lose the fine-grained control the
`?url` pattern gives (e.g. explicit `<link rel="preload">` ordering), but
gain a component that works correctly the moment it's imported anywhere in
the app, blog route or not.

## Wiring it into the route

Only one addition to `blogs.$blogHandle.$articleHandle.tsx` is needed now —
the stylesheet no longer requires a `links()` entry.

### Import

```diff
 import {injectFaqSections} from '~/components/blogs/FaqSection';
 import {injectTwoColumnContent} from '~/components/blogs/TwoColumnContent';
+import {BlogButton, injectBlogButtons} from '~/components/blogs/button';
 import {withHeadingIds, TableOfContents, isTocEnabled} from '~/components/blogs/TableOfContents';
```

### `loadCriticalData` — run the marker transform

Goes in the same "no data fetch needed" group as `injectFaqSections` /
`injectNewsletterForm` / `injectVideoEmbeds` — order among that group isn't
load-bearing for the same reason those three aren't ordered against each
other (none of these touch each other's markers), so it's placed here for
readability, right after the video pass:

```diff
   contentHtml = injectVideoEmbeds(contentHtml);

+  // Rewrites data-cta="..." marker divs into static CTA button markup
+  // (see button.tsx for the marker syntax). Pure string transform, no
+  // slot/portal needed — a CTA button needs no Router hooks to work,
+  // so unlike the newsletter form and video embed it renders fully
+  // static here rather than hydrating client-side. Same "no async
+  // data fetch" shape as the three injectors above, so it runs
+  // alongside them.
+  contentHtml = injectBlogButtons(contentHtml);
+
   const tocEnabled = isTocEnabled(article);
```

That's it — no new state, no new `useEffect` scan, no new portal loop in
the component body, because there's no slot to find. The static markup
`injectBlogButtons` produces is already final HTML by the time it lands in
`dangerouslySetInnerHTML`.

### Optional: a fixed end-of-article CTA (outside the article body)

If you also want a CTA that isn't authored inline in the article HTML —
e.g. always show one after `<AuthorSection>` — use the React component
directly, same as `<AuthorSection>` and `<TableOfContents>` are used now:

```diff
       {authorSection && <AuthorSection data={authorSection} />}
+
+      <BlogButton href="/collections/all" size="lg" ctaId={`blog-${article.handle}-endpost`}>
+        Shop the collection
+      </BlogButton>
     </div>
```

---

## `<BlogButton>` props (for direct JSX placements)

| Prop           | Type                                                         | Default     | Notes                                                                 |
|----------------|--------------------------------------------------------------|-------------|--------------------------------------------------------------------------|
| `children`     | `ReactNode`                                                   | —           | Button label.                                                          |
| `href`         | `string`                                                       | —           | Internal hrefs render via react-router's `<Link>` (client nav + prefetch); external hrefs render `<a target="_blank">`. Omit to render a `<button>`. |
| `variant`      | `"primary" \| "secondary" \| "outline" \| "ghost" \| "link"`   | `"primary"` | —                                                                       |
| `size`         | `"sm" \| "md" \| "lg"`                                         | `"md"`      | —                                                                       |
| `icon`         | `ReactNode`                                                    | —           | —                                                                       |
| `iconPosition` | `"left" \| "right"`                                            | `"left"`    | —                                                                       |
| `fullWidth`    | `boolean`                                                      | `false`     | —                                                                       |
| `newTab`       | `boolean`                                                      | auto        | Overrides auto external-link detection.                                |
| `loading`      | `boolean`                                                      | `false`     | Spinner + disabled.                                                    |
| `ctaId`        | `string`                                                       | —           | Rendered as `data-cta-id`.                                             |
| `onClick`      | `(event) => void`                                              | —           | Only fires for JSX-placed buttons — see **Tracking** for why the marker path doesn't use this. |
| `className`    | `string`                                                       | —           | Extra classes, appended last.                                          |

`<BlogButton>` is only ever rendered directly inside the route tree (JSX),
never portaled into `dangerouslySetInnerHTML` content — so `<Link>` always
has Router context. Don't reuse it inside a portal without checking that
still holds.

---

## Tracking

The marker path (`injectBlogButtons`) produces plain static HTML with no
hydration, so there's no `onClick` to attach analytics to — it relies
entirely on `data-cta-id` plus a GTM/GA4 trigger targeting `[data-cta-id]`
clicks. `<BlogButton>` carries the same `data-cta-id` attribute, so **one
GTM trigger covers both** the marker-embedded and JSX-placed buttons.

Recommended `ctaId` convention: `blog-{post-slug or section}-{action}`,
e.g. `blog-summer-guide-shop-weekender`.

---

## Theming

CSS custom properties in `blog-button.css`, matching the approved wireframe
(blue fill, white uppercase label, 4px corners):

```css
:root {
  --cta-bg: #2f5dfb;
  --cta-bg-hover: #264ddb;
  --cta-fg: #ffffff;
  --cta-border: #2f5dfb;
  --cta-ring: #2f5dfb;
}
```

`#2f5dfb` was estimated from the mockup image, not sampled from a design
file — swap it if it's off from the real brand blue.

---

## Copy guidance

- **Active voice, name the action.** "Shop the set," "Get the guide" — not "Click here" or "Learn more" by default.
- **Match the promise to the destination.** "Shop new arrivals" should land on new arrivals, not the homepage.
- **Keep labels short** — 2–4 words; longer wraps awkwardly at `sm`/mobile widths, especially uppercase.

---

## Accessibility

- Visible `focus-visible` ring on both link and button states.
- Disabled buttons get `aria-busy` (loading) or are simply not rendered as
  a clickable element; marker-based CTAs with a missing href are left as
  an inert `<div>` rather than a dead link.
- Icon-only usage: pass a native `aria-label` — there's no visible text
  fallback otherwise.
- External links get `rel="noopener noreferrer"` automatically, both in
  the marker output and `<BlogButton>`.

---

## Pre-ship checklist for a new CTA placement

- [ ] Label is an active-voice action, 2–4 words
- [ ] `data-cta-href` / `href` points to the promised destination
- [ ] `data-cta-id` set, following the naming convention
- [ ] Only one `primary` per visible screenful
- [ ] Checked at mobile width