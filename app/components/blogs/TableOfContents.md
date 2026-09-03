# Table of Contents

Adds an auto-generated "On this page" sidebar to a blog article, built
from the `<h2>`/`<h3>` headings already in the article body. There is
no special marker to author — if you're already using headings to
structure your post, the table of contents is built from them
automatically once it's turned on.

## Turning it on

The table of contents is **off by default** for every article. To
enable it for a specific article:

1. Open the article in the Shopify admin.
2. In the **Metafields** section, find **custom.show_toc**.
3. Set it to **true**.
4. Save.

An article with headings but no TOC metafield set will **not** show a
table of contents. This is intentional — some articles (short posts,
listicles, etc.) don't need one, so it's opt-in per article rather
than on for every post automatically.

If an article has the metafield set to `true` but has no `<h2>` or
`<h3>` headings in its body, no sidebar is shown — there's nothing to
link to.

## How headings become table-of-contents entries

Any `<h2>` becomes a top-level entry. Any `<h3>` is nested underneath
the nearest `<h2>` above it in the body — so headings should be
authored in the same top-down order that they'd read as an outline.
An `<h3>` with no `<h2>` above it (unusual, but not an error) is shown
as its own top-level entry rather than being dropped.

Nothing needs to be added to a heading for it to show up — the table
of contents is built entirely from whatever headings already exist in
the post.

## Editor controls

Two optional attributes can be added directly to a heading in the
HTML source view of the blog editor, for the rare cases where the
default "every heading becomes a link" behavior isn't what you want:

### Hide a heading from the table of contents

Add `data-toc-skip` to a heading to leave it out of the sidebar
entirely. The heading itself is left completely untouched in the
article body — this only affects whether it gets a link in the
sidebar.

```html
<h2 data-toc-skip>Frequently Asked Questions</h2>
```

Useful for a heading that exists for visual/SEO structure but would
just be clutter in the sidebar — for example, a lone "FAQ" heading
sitting directly above a self-explanatory FAQ accordion block.

### Shorten the link text

Add `data-toc-label="..."` to a heading to change the text shown in
the sidebar link, without changing the heading itself.

```html
<h2 data-toc-label="Motor Types">
  2. A Complete Guide to Understanding Different Motor Types
</h2>
```

Useful for long, descriptive headings that read fine in the body copy
but are too wide to sit comfortably in a narrow sidebar link.

## Behavior notes

- **Deep links work.** Every heading gets a stable, unique id, so a
  URL like `example.com/blogs/news/my-post#motor-types` scrolls
  straight to that section, whether or not the table of contents is
  showing.
- **Headings that start with a number are handled safely.** A heading
  like "2. Understand motor types" gets an id that's safe to use for
  in-page navigation, so numbered headings don't need to be reworded
  to avoid breaking anything.
- **Desktop vs. mobile.** On wider screens the table of contents sits
  in a sidebar next to the article body. On narrower screens it
  collapses into a tappable "On this page" summary that expands on
  tap — no separate setup needed, this is automatic.
- **Active-section highlighting.** As a reader scrolls, the sidebar
  automatically highlights whichever section they're currently
  reading.
- **Manual expand/collapse for subsections.** If a top-level heading
  has nested subheadings, a small arrow lets the reader expand or
  collapse that group. This is purely a reader convenience — it
  doesn't affect scrolling or highlighting.

## Related components

Components that generate their own section headings internally (for
example, an FAQ block's "Frequently Asked Questions" title) mark that
heading with `data-toc-skip` so it doesn't show up as a duplicate,
generic-sounding entry in the sidebar. This is handled automatically
by those components and isn't something you need to do yourself.
