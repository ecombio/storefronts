# Author Section — `AuthorSection.tsx`

An optional "About the author" card shown at the bottom of a blog article —
avatar (or initial fallback), name, and bio.

Files:
- `app/components/blogs/AuthorSection.tsx` — gating
  (`getAuthorSectionData`) and the presentational component (named export
  `AuthorSection`).
- `app/assets/article-author.css` — route-scoped styles, imported via
  `links()` in `blogs.$blogHandle.$articleHandle.tsx`, same as `article.css`.

## Where this lives: below the article, not a content marker

Same pattern as `RelatedBlogPosts`/`SocialShare`, not the marker → inject →
portal pattern the shoppable/gallery/video/newsletter blocks use. There's no
"where in the paragraph" for an author bio — it always renders as one fixed
block after the article content, and its data (name/bio/avatar) doesn't come
from anything the editor typed into `contentHtml` — it comes from a
metaobject reference resolved in the loader. So it follows the simpler
"resolve in the loader, render directly" shape: no `createPortal`, no
DOM-scanning effect, because it was never inside `dangerouslySetInnerHTML`
to begin with.

## Author identity lives in a reusable metaobject, not on the article

`article.author` (Shopify's built-in blog author field, a plain string) is
**deliberately not used** here. Instead, author identity — name, bio,
avatar — lives in a separate, reusable `Author` metaobject that an article
references via a metafield. Once an author has a full profile, editing their
bio or headshot in one place updates every article that references it,
rather than requiring an edit on every individual post.

## Metaobject definition

Create a metaobject definition (Shopify Admin → Settings → Custom data →
Metaobjects) with, at minimum:

| Field | Type | Notes |
|---|---|---|
| `name` | Single line text | Required — gates rendering if empty |
| `bio` | Multi-line text | Required — gates rendering if empty. Line breaks become separate `<p>` tags |
| `avatar` | File reference (image) | Optional — falls back to the author's first-initial in a circle if omitted |

## Article-level metafields

Two metafields on the `Article` resource:

| Metafield | Type | Purpose |
|---|---|---|
| `custom.show_author_section` | Boolean | Must be explicitly `true` — a bare toggle with no linked profile still shows nothing (see gating below) |
| `custom.author_profile` | Metaobject reference (to the `Author` definition) | Which author's profile to show |

## Gating — strict, layered, all-or-nothing

`getAuthorSectionData(article)` returns either a fully-populated
`AuthorSectionData` or `null` — there is no partial/degraded render. Every
one of these must hold, in order, or the function returns `null` and the
caller renders nothing:

1. `custom.show_author_section` metafield value is exactly `"true"`.
2. `custom.author_profile` actually references a metaobject entry.
3. That entry's `bio` field is non-empty (after trimming).
4. That entry's `name` field is non-empty (after trimming).

The avatar is the **one fully optional field** — a missing avatar doesn't
gate the section off, it just falls back to rendering the author's first
initial in a circle instead of an image, rather than showing a broken image
icon.

This is intentionally strict: an editor who flips the toggle on but never
fills in a profile reference (or fills in a profile with no bio) sees
**nothing**, not an empty card with a placeholder avatar and no text — an
empty card is worse than no card.

## Wiring into the route

**1. Extend `ARTICLE_QUERY`** with the two metafields:

```graphql
showAuthorSection: metafield(namespace: "custom", key: "show_author_section") {
  value
}
authorProfile: metafield(namespace: "custom", key: "author_profile") {
  reference {
    ... on Metaobject {
      name: field(key: "name") { value }
      bio: field(key: "bio") { value }
      avatar: field(key: "avatar") {
        reference {
          ... on MediaImage {
            image { url altText }
          }
        }
      }
    }
  }
}
```

**2. In `loadCriticalData`**, after `article` is resolved:

```ts
import {AuthorSection, getAuthorSectionData} from '~/components/blogs/AuthorSection';

const authorSection = getAuthorSectionData(article);
```

Add `authorSection` to the loader's return object.

**3. Add the stylesheet** to `links()`:

```ts
import authorSectionStyles from '~/assets/article-author.css?url';
// ...
{rel: 'stylesheet', href: authorSectionStyles},
```

**4. Render it** — typically near the end of the article, alongside
`RelatedBlogPosts`/`SocialShare`:

```tsx
{authorSection && <AuthorSection data={authorSection} />}
```

No new state, effect, or portal — same shape as `RelatedBlogPosts`.

## Props

`AuthorSection` takes a single `data` prop, already fully resolved (no
loading/error states inside the component itself — that's all handled by
`getAuthorSectionData` returning `null` upstream):

```ts
interface AuthorSectionData {
  name: string;
  bio: string;
  avatar: {url: string; altText: string | null} | null;
}
```

## Markup

```html
<section class="author-section" aria-label="About the author">
  <h2 class="author-section__heading">The Author : {name}</h2>
  <div class="author-section__body">
    <div class="author-section__avatar">
      <img ... />  <!-- or a fallback initial span -->
    </div>
    <div class="author-section__bio">
      <p>...</p>  <!-- one per line-break-separated paragraph -->
    </div>
  </div>
</section>
```

Multi-line bios are split on `\n+` and rendered as separate `<p>` tags,
matching the two-line bio layout in the reference design, rather than
collapsing everything into one dense block.

## Notes / limits

- Because gating happens entirely in `getAuthorSectionData` (server-side, in
  the loader), there's no client-side flicker or loading state — the
  section either renders fully formed on first paint or doesn't render at
  all.
- If an author's bio is edited in the metaobject, every article referencing
  that profile picks up the change on next request — no per-article edits
  needed.
- The `name.charAt(0).toUpperCase()` fallback initial only reads the first
  character of the resolved name — for multi-word names this shows only the
  first letter of the first word (e.g. "Max Crunch" → "M"), not initials
  from both words.

## Testing

- `show_author_section` unset or `false` → nothing renders, regardless of
  profile state
- `show_author_section = true`, no `author_profile` linked → nothing renders
- `show_author_section = true`, profile linked, empty bio → nothing renders
- `show_author_section = true`, profile linked, bio present, empty name →
  nothing renders
- All four conditions met, no avatar set → initial-fallback circle renders
- All four conditions met, avatar set → image renders
- Multi-line bio → each line becomes its own `<p>`
