# AuthorSection

> **Draft — verify before treating as source of truth.** This was
> written from what's verifiable in `AuthorSection.tsx` and the
> `blogs.$blogHandle.$articleHandle.tsx` route only. It does **not**
> contain confirmed metafield namespaces/keys, metaobject type
> handles, or admin screenshots — those need to come from your actual
> Shopify admin setup (likely documented in `README.md` alongside the
> other metaobject definitions). Anywhere you see "confirm in admin,"
> that's a placeholder, not a verified fact.

## What it is

`AuthorSection` renders an "About the author" card at the bottom of a
blog article — a name, a bio, and an optional avatar (falling back to
a circular initial when no avatar is set).

Unlike most other blocks on the article route, it is **not**
marker-based. Editors never type anything into the article body to
trigger it. Instead it's driven entirely by:

1. An article-level metafield (`show_author_section`) that must be
   explicitly toggled on.
2. A reference to a reusable **Author** metaobject
   (`author_profile`), which holds the actual name/bio/avatar.

This split exists so author identity lives in one place. If the same
person writes several articles, their name/bio/avatar is edited once
on the Author metaobject entry — every article referencing it updates
automatically. That's also why the component deliberately ignores
Shopify's built-in `article.author` field: once an author has a full
profile, the profile is the single source of truth, not the article.

## Files

| File | Role |
|---|---|
| `app/components/blogs/AuthorSection.tsx` | `getAuthorSectionData()` (gating/resolver) + `<AuthorSection>` (presentational component) |
| `app/components/blogs/AuthorSection.css` | Styles for `.author-section` and its children |
| `app/templates/blogs.$blogHandle.$articleHandle.tsx` | Calls `getAuthorSectionData(article)` in the loader; renders `<AuthorSection data={authorSection} />` conditionally |
| `README.md` *(confirm)* | Where the Author metaobject's field definitions are expected to be documented |

## How it's wired into the article route

1. **Loader** (`loadCriticalData`): after the article is fetched,
   `getAuthorSectionData(article)` runs against the raw metafield data
   returned by `ARTICLE_QUERY`. The result — either a resolved
   `AuthorSectionData` object or `null` — is passed straight through
   in the loader payload as `authorSection`.
2. **Component**: `{authorSection && <AuthorSection data={authorSection} />}`
   is rendered near the bottom of the article, after the social-share
   block and before "Related blogs."
3. **Styles**: `AuthorSection.css` is linked explicitly in the route's
   `links()` array (not via a side-effect import), matching the
   convention every other directly-rendered block on this route
   follows (`TableOfContents`, `RelatedBlogPosts`, `SocialShare`).

## Gating rules (what has to be true for it to render)

All four conditions must hold, checked in this order, each with an
early return to `null` on failure:

1. `show_author_section` metafield value is exactly the string
   `"true"`.
2. `author_profile` metafield actually resolves a metaobject
   reference (i.e., something is assigned, not left blank).
3. That metaobject entry's `bio` field is non-empty after trimming.
4. That metaobject entry's `name` field is non-empty after trimming.

If **any** of these fail, `getAuthorSectionData` returns `null` and
the route renders nothing — no empty card, no "Author: undefined," no
broken avatar circle. This is intentional: a half-filled-in card was
judged worse than no card.

**Avatar is the one exception.** It does not gate the section. If the
metaobject entry has no avatar image set, the component falls back to
a circular badge showing the author's first initial, uppercased.

## Author metaobject shape (as consumed by the code)

The component expects the `author_profile` reference to expose:

| Field | Used as | Required? |
|---|---|---|
| `name` | Heading text, avatar-fallback initial, image alt fallback | Yes — gates the section |
| `bio` | Body copy, split into paragraphs on line breaks | Yes — gates the section |
| `avatar` → `reference.image` (`url`, `altText`) | Avatar `<img>` | No — falls back to initial |

*(Confirm in admin: the metaobject's type handle, and the exact
field keys/types for `name`, `bio`, and `avatar` — the code only
tells us the shape it expects after Shopify resolves the reference,
not the admin-side definition.)*

## Bio formatting

`bio` is treated as a multi-line text field. The component splits on
one-or-more newlines (`/\n+/`) and renders each non-empty chunk as its
own `<p>`, matching a two-paragraph bio layout rather than collapsing
everything into a single dense block.

*(Worth confirming against real content: if editors enter bios with
single newlines between lines rather than blank-line-separated
paragraphs, and Shopify returns those as literal `\n`, this still
works — but if the intent is "every line break is its own paragraph"
rather than "paragraph breaks only," the regex would need to change
from `/\n+/` to `/\n/`.)*

## Example: enabling it for an article

*(Confirm exact field names/labels in your admin UI — this is the
expected flow based on the code, not a verified click-through.)*

1. In Shopify admin, create or edit an entry in the **Author**
   metaobject definition. Fill in at least `name` and `bio`; `avatar`
   is optional.
2. On the article, set the `show_author_section` metafield to `true`.
3. On the article, set the `author_profile` metafield to reference the
   Author metaobject entry from step 1.
4. Save and preview the article — the card should appear at the
   bottom, above "Related blogs."

If it doesn't appear, check in this order (matches the gating checks
above): is `show_author_section` actually `true` (not blank, not a
string like `"True"`)? Is `author_profile` actually assigned? Does the
referenced entry have both a name and a bio filled in?

## Known open questions / things flagged but not yet resolved

- Heading currently renders as `The Author : {name}` — the space
  before the colon may be a typo rather than an intentional style
  choice; worth confirming against the reference design.
- `showAuthorSection?.value === 'true'` assumes the metafield is typed
  as **boolean** in the admin (where Shopify returns the literal
  string `"true"`/`"false"`). If it's ever a single-line text field
  instead, a stray value like `"True"` would silently disable the
  section with no warning.
