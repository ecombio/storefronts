# Blog Post Card

A single blog-post preview card: image, date, title. Renders as one
`<li>` — image, quiet date byline, and a title that's the card's one
real, fully clickable link.

- Component: `app/components/blogs/BlogPostCard.tsx`
- Styles: `app/components/blogs/BlogPostCard.css`
- Currently rendered by: `app/components/blogs/RelatedBlogPosts.tsx`

## No marker, no editor control

This is not an editor-authored block — there's no `data-*` marker and
nothing to type into Shopify's HTML source view for it. It's a
presentational component meant to be reused by other React code
(currently just `RelatedBlogPosts`), not something an article's rich
text ever references directly.

## Why this file exists separately

`BlogPostCard` was extracted out of `RelatedBlogPosts.tsx` on purpose,
so it isn't locked to the "related posts" grid. Anywhere else that
wants to preview an article — a blog index/listing page, a search
results page, a "recent posts" widget — can render the exact same
card by importing this file, instead of reimplementing the markup or
reaching into `RelatedBlogPosts` for something it was never meant to
export standalone.

The component has **no knowledge of grids, sections, or headings** —
layout (column count, spacing, what wraps it) is entirely the
caller's job. It only renders one `<li>` and assumes its parent is a
`<ul>`/`<ol>`.

## Data points reference

### Props (`BlogPostCardProps` / `BlogPostCardData`)

| Field | Required | Purpose |
|---|---|---|
| `id` | Yes | React key when rendered in a list. Not used for anything else by this component. |
| `title` | Yes | Rendered as the card's heading and the accessible name of its one link. |
| `handle` | Yes | Combined with `blogHandle` to build the article URL: `/blogs/{blogHandle}/{handle}`. |
| `blogHandle` | Yes | See above. |
| `publishedAt` | Yes | ISO date string. Rendered both as the machine-readable `dateTime` attribute and reformatted for display (see "Date formatting" below). |
| `image` | No | `{url, altText?, width?, height?}`. When absent, a fixed-height placeholder box fills the same slot so every card in a row stays the same height. |

Named generically (`BlogPostCardData`, not `RelatedPost`) since this
component has no idea whether the post it's given is "related" to
anything — that decision belongs to whoever assembles the list of
posts passed in. (`RelatedBlogPosts.tsx` re-exports `RelatedPost` as a
type alias of this shape, purely so its own callers didn't need to
rename anything when the card was extracted.)

### Rendered class names (for the stylesheet)

| Class | Element | Purpose |
|---|---|---|
| `.bpc-card` | `<li>` | The whole card. `position: relative` — the anchor the stretched link (below) expands to fill. |
| `.bpc-image-wrap` | `<div>` | Wraps the image or placeholder. |
| `.bpc-image` | `<Image>` or placeholder `<div>` | The square preview image, or its stand-in. |
| `.bpc-image--placeholder` | `<div>` | Applied only when a post has no image. |
| `.bpc-date` | `<time>` | The published-date byline. |
| `.bpc-title` | `<h3>` | Wraps the one real link. |

## One link, one accessible name

The previous version of this card had image, title, and a "Read more"
button as **three separate anchors to the same URL** — a screen-reader
user tabbing through a grid of these hit the same destination three
times per card.

The current version fixes that: **only the title is a real `<a>`.** A
`::after` "stretched link" on that anchor (`.bpc-title a::after` in
`BlogPostCard.css`) is positioned to cover the entire `.bpc-card`, so
clicking anywhere on the image or surrounding whitespace still
navigates — without adding more anchors pointing at the same
destination. The image itself is treated as decorative relative to
the card (empty `alt=""`, not omitted) since the title link already
gives the whole card its one accessible name.

## Visual design notes

The card intentionally does **not** look like a bordered "SaaS
template" card with a filled CTA pill button. Specifically:

- **No border.** Cards are separated by whitespace/grid gap (owned by
  whatever's rendering the grid — currently `RelatedBlogPosts.css`),
  not a border on the card itself.
- **No "Read more" button.** Dropped entirely — redundant once the
  whole card is clickable via the stretched link above.
- **Date is a quiet byline**, not a tracked-out uppercase meta chip —
  muted color, modest size, so the eye goes to the title first.
- **One hover cue**: the image lifts slightly on hover
  (`transform: translateY(-2px)`) to signal interactivity, rather than
  a button-style hover state.

## Date formatting

Dates are shown as `10.10.24` (day.month.year, zero-padded,
2-digit year) — deliberately **not** `toLocaleDateString()`, so every
visitor sees the identical format regardless of browser/OS locale.
The full ISO string is still passed to the `<time>` element's
`dateTime` attribute for accessibility and SEO.

## Notes for future maintenance

- If a caller needs to render this card at a different grid width
  (e.g. a 2-up listing page instead of the 3-up related-posts grid),
  the image's `sizes` attribute is currently hardcoded
  (`"(min-width: 760px) 320px, 90vw"`). Promote it to a `sizes` prop
  with this string as the default rather than hardcoding a second
  value inline.
- `BlogPostCard.css` only styles the card itself — it has no grid or
  section rules. A caller rendering this card outside
  `RelatedBlogPosts` needs its own wrapper/grid stylesheet (the way
  `RelatedBlogPosts.css` provides one today) but does **not** need to
  duplicate or modify this file to do so.
