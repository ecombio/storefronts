# Article — `blogs.$blogHandle.$articleHandle.tsx`

The single-article route: renders one blog post, resolves every embeddable
content block an editor can drop into the article body, and layers on the
end-of-article sections (TOC, author card, related posts, social share).

This document is a **composed index** — it pulls together what's documented
individually across `guides/blogs/*.md` plus what's visible directly in the
`.tsx` source, so the whole route's shape is in one place instead of spread
across 9+ files. It does not replace the individual guides; follow the links
below for full wiring instructions on any one piece.

> **Update:** all 14 components now have a `guides/blogs/*.md` guide except
> `ProductGallery`, which intentionally documents separately at
> `docs/shoppable-blog-articles.md` per its own header comment (a different
> folder, outside `guides/`, not yet reviewed in this thread). The four
> guides that were missing (`author-section.md`, `faq-section.md`,
> `newsletter-form.md`, `table-of-contents.md`) have been drafted and are
> ready to drop into `guides/blogs/`.

---

## 1. What this route is made of

Three categories of moving part, by how they get from the editor's content
into the rendered page:

| Category | Behavior | Components |
|---|---|---|
| **A. Fully static** — pure string transform, no client JS, no slot | Editor marker in `contentHtml` → rewritten to final HTML in the loader. Nothing hydrates. | Quote, RecipeHeader, Summary, TwoColumnContent, BlogButton (marker path), FaqSection (accordion is native `<details>`, no JS needed) |
| **B. Static render → client hydrate** — marker → slot → `createPortal` | Editor marker → static/placeholder HTML server-side (so the page isn't blank pre-hydration) → client scans for the slot, reads its data attributes, and portals in the live interactive component | ProductGallery (shoppable embeds), NewsletterForm, Video, ImagesGallery |
| **C. Rendered directly in the route tree** — no marker at all | Not authored inline in article HTML. Data resolved in the loader from metafields/queries, passed down as loader data, rendered as a fixed section (usually after the article body). | AuthorSection, RelatedBlogPosts, SocialShare, TableOfContents |

Category B needs `createPortal` (not `createRoot`) specifically so the
portaled component inherits this route's context providers — Router context
for `useNavigate()`/`useFetcher()`, `Aside` context, cart context for
`CartForm`. A disconnected `createRoot(el).render(...)` tree has none of
those and throws immediately. `Video` and `ImagesGallery` don't strictly
need any of that context (no fetcher/router hooks), but are scanned/portaled
the same way anyway for consistency and because `dangerouslySetInnerHTML`
content needs *some* mount point inside the tree to host them.

---

## 2. Full component inventory

All 14 files in `app/components/blogs/`:

| # | Component | Category | Guide |
|---|---|---|---|
| 1 | `AuthorSection.tsx` | C — direct render | `guides/blogs/author-section.md` ✅ new |
| 2 | `Button.tsx` (`BlogButton` / `injectBlogButtons`) | A (marker) + direct JSX use | `guides/blogs/button.md` |
| 3 | `FaqSection.tsx` | A — static | `guides/blogs/faq-section.md` ✅ new |
| 4 | `ImagesGallery.tsx` | B — portal | `guides/blogs/image-gallery.md` |
| 5 | `NewsletterForm.tsx` | B — portal | `guides/blogs/newsletter-form.md` ✅ new |
| 6 | `ProductGallery.tsx` (shoppable embeds: single/solo/duo/trio) | B — portal | `docs/shoppable-blog-articles.md` *(outside `guides/`, not yet reviewed)* |
| 7 | `Quote.tsx` | A — static | `guides/blogs/quote.md` |
| 8 | `RecipeHeader.tsx` | A — static | `guides/blogs/recipe-header.md` |
| 9 | `RelatedBlogPosts.tsx` | C — direct render | `guides/blogs/related-blog-posts.md` |
| 10 | `SocialShare.tsx` | C — direct render | `guides/blogs/social-share.md` |
| 11 | `Summary.tsx` | A — static | `guides/blogs/summary.md` |
| 12 | `TableOfContents.tsx` | C — direct render | `guides/blogs/table-of-contents.md` ✅ new |
| 13 | `TwoColumnContent.tsx` | A — static | `guides/blogs/two-column-content.md` |
| 14 | `Video.tsx` | B — portal | `guides/blogs/video.md` |

---

## 3. The loader pipeline

`loadCriticalData` (or equivalent) runs a chain of pure string transforms
over `article.contentHtml`, in this order (per the individual guides —
**order is only load-bearing where called out**):

```ts
let contentHtml = article.contentHtml;

// 1. Shoppable products — must run before TwoColumnContent, since a
//    shoppable marker can be nested inside a two-col column and
//    TwoColumnContent's div-depth scanner needs the real product markup
//    already resolved before it counts nesting.
const productIds = extractShoppableProductIds(contentHtml);
// ...fetch productsById via a batched query...
contentHtml = injectShoppableProducts(contentHtml, productsById);

// 2. Two-column layout — depends on step 1 (see above).
contentHtml = injectTwoColumnContent(contentHtml);

// 3–9. Order NOT load-bearing among this group — none of these
//      transforms touch each other's markers.
contentHtml = injectRecipeHeader(contentHtml);
contentHtml = injectSummarySections(contentHtml);
contentHtml = injectFaqSections(contentHtml);
contentHtml = injectQuoteEmbeds(contentHtml);
contentHtml = injectNewsletterForm(contentHtml);
contentHtml = injectVideoEmbeds(contentHtml);
contentHtml = injectImagesGallery(contentHtml);

// 10. CTA buttons — placed last for readability in the existing docs,
//     not because order matters here either.
contentHtml = injectBlogButtons(contentHtml);

// 11. Heading IDs / TOC — confirmed by table-of-contents.md to run LAST,
//     after every other injector above. It scans contentHtml for h2/h3
//     tags, so it needs to see the truly final HTML, not an intermediate
//     state some upstream transform might still introduce headings into.
const tocEnabled = isTocEnabled(article);
const {html: finalHtml, headings: tocHeadings} = tocEnabled
  ? withHeadingIds(contentHtml)
  : {html: contentHtml, headings: []};

// 12. Sections resolved OUTSIDE contentHtml entirely — metafields/
//     separate queries, not marker parsing.
const authorSection = getAuthorSectionData(article);

let relatedPosts = null;
if (isRelatedPostsEnabled(article)) {
  const curated = article.relatedArticlesField?.references?.nodes;
  const candidatePool = curated?.length
    ? []
    : (await context.storefront.query(RELATED_ARTICLES_POOL_QUERY, {
        variables: {blogHandle, first: 12},
      })).blog?.articles.nodes ?? [];
  relatedPosts = getRelatedPostsData(article, candidatePool);
}

const shareUrl = request.url; // used directly, not constructed by hand
```

Returned from the loader (shape reconstructed from all the guides'
"add this to the loader's return object" instructions):

```ts
return {
  article: {...article, contentHtml: finalHtml},
  shoppableProducts,      // Map/entries keyed by numeric product ID
  tocEnabled,
  tocHeadings,
  authorSection,          // null if gated off
  relatedPosts,           // null if gated off / nothing to show
  shareUrl,
};
```

---

## 4. Client-side hydration (the component body)

`ArticleTemplate` (default export) does the following, per the source
already reviewed:

1. Holds a `bodyRef` on the `dangerouslySetInnerHTML` container.
2. On mount (`useEffect`, keyed on `contentHtml`), scans that DOM subtree
   for four slot types, each tracked in its own state array (different data
   shapes, different portaled components — not worth unifying into one
   generic slot type):
   - `[data-shoppable-slot]` → `ShoppableSlot[]` (kind + product IDs)
   - `[data-newsletter-slot]` → `NewsletterSlot[]` (heading + subheading)
   - `[data-video-slot]` → raw element list; props read **per-render** via
     `readVideoSlot(el)`, not pre-parsed at scan time
   - `[data-gallery-slot]` → `GallerySlot[]`; props resolved **once at scan
     time** via `readGallerySlot(el)`, since there's no reason to re-parse
     the same JSON attribute on every render
3. For each found slot, the static SSR markup inside it is cleared
   (`el.innerHTML = ''`) and a live component is `createPortal`'d into the
   same node — the whole reason for the "static now, upgrade on hydrate"
   pattern: the static version stays fully functional (real `<form>` POST,
   real `<a>` links) right up until this swap happens.
4. A separate small effect handles deep-linked `<details>` elements (e.g.
   `#faq-range` in the URL hash) — uses `getElementById`, not
   `querySelector(hash)`, because a heading id that starts with a digit
   (e.g. `2-understand-motor-types`) is valid HTML but throws a
   `SyntaxError` in an unescaped CSS selector.
5. `two-col-content` is deliberately **not** scanned — it's fully static
   (Category A), so there is no slot type for it.

Render order in the JSX (from what we've seen of the return statement):

```
<h1>{title}</h1>
<article-meta> (date, author)
<hero image>
<article-layout>              (2-col grid: body + TOC, collapses to 1-col via
                                article-layout--no-toc when TOC is disabled)
  <article-body ref={bodyRef} dangerouslySetInnerHTML>
  {tocEnabled && <TableOfContents headings={tocHeadings} />}
</article-layout>

{slots.map(...)}              → portal shoppable products
{newsletterSlots.map(...)}    → portal newsletter forms
{videoSlots.map(...)}         → portal videos
{gallerySlots.map(...)}       → portal galleries

{authorSection && <AuthorSection ... />}
{relatedPosts && <RelatedBlogPosts ... />}
<SocialShare ... />           (per social-share.md, sits near author/related)
```

---

## 5. CSS

10 stylesheets are route-scoped to this template (imported `?url`, pushed
into this route's `links()` export) rather than loaded globally in
`root.tsx` — because none of these markers/blocks ever appear outside an
article body:

- `article.css`
- `article-author.css`
- `gallery.css`
- `quote.css`
- `recipe-header.css`
- `related-blog-posts.css`
- `social-share.css`
- `summary.css`
- `two-column-content.css`
- `video.css`

Two exceptions worth knowing:

- **`newsletter-form.css`** and **`article-card.css`**/**`article-toc.css`**
  are loaded **globally** in `root.tsx` instead — the newsletter marker is
  reusable outside blog articles too, so it doesn't belong route-scoped.
- **`blog-button.css`** isn't in `links()` at all — `button.tsx` imports it
  as a plain side-effect import (`import '~/assets/blog-button.css'`), so
  Vite picks it up automatically wherever `BlogButton`/`injectBlogButtons`
  is imported, with zero `links()`/`root.tsx` bookkeeping required.

---

## 6. Editor-facing marker syntax, all in one place

| Marker | Component | Required attrs |
|---|---|---|
| `<div data-shoppable-product="ID">`, `data-solo="ID"`, `data-duo="ID,ID"`, `data-trio="ID,ID,ID"` | ProductGallery | digits-only ID(s), exact attribute match, empty div |
| `<div data-two-col [data-two-col-ratio="2-1"]>` (exactly 2 child `<div>`s) | TwoColumnContent | 2 direct-child divs |
| `<script type="application/json" data-faq>[...]</script>` | FaqSection | valid JSON array of `{question, answer}` |
| `<div data-newsletter-form [data-newsletter-heading] [data-newsletter-subheading]>` | NewsletterForm | none — all optional |
| `<div data-video-embed data-src="..." data-title="...">` | Video | `data-src`, `data-title` |
| `<div data-gallery-embed [data-gallery-title] [data-gallery-columns]>` (nested `<img>` tags) | ImagesGallery | ≥1 `<img src="...">` inside |
| `<div data-quote-embed data-text="...">` | Quote | `data-text` |
| `<div data-recipe-header ...>` | RecipeHeader | ≥1 of 4 stat attrs, or `data-recipe-image` |
| `<div data-summary-embed [data-summary-title] [data-summary-layout]>` (nested `<li>`/`<p>`) | Summary | ≥1 usable item |
| `<div data-cta="primary" data-cta-href="..." data-cta-id="...">Label</div>` | BlogButton | `data-cta`, `data-cta-href`, inner text |

**Universal fail-safe convention**, followed by every marker in this route:
a malformed marker is either left completely untouched (visible as raw,
broken-looking HTML — the signal to the editor that something's wrong) or
silently dropped, never partially/incorrectly rendered. Which of the two
depends on the component: Summary and ProductGallery drop malformed
markers silently (an empty box would look like a live bug); TwoColumnContent,
RecipeHeader, and BlogButton leave them untouched (a visible raw `<div>` is
a better signal than silent content loss for those).

---

## 7. Gating (off-by-default vs on-by-default)

| Section | Default | Gate |
|---|---|---|
| Table of Contents | **Off** | `custom.show_toc` metafield must be `"true"` |
| Author Section | **Off** | `custom.show_author_section` must be `"true"` **and** a linked `author_profile` metaobject with a non-empty name + bio |
| Related Blog Posts | **On** | `custom.show_related_posts` must be `"false"` to disable |
| Social Share | **On** | (optional) `custom.show_social_share` must be `"false"` to disable |

The asymmetry is deliberate per the guides: TOC/Author require real content
an editor has to fill in, so they default off until that content exists.
Related Posts/Social Share always have *something* to show (a fallback pool,
a share URL that always exists), so they default on and rely on editors to
opt out on the rare article where they don't fit (e.g. a policy page styled
as an article).

---

## 8. Open items

- All 14 components now have a guide except `ProductGallery`, whose
  reference doc (`docs/shoppable-blog-articles.md`) lives outside
  `guides/blogs/` entirely and hasn't been reviewed in this thread — worth
  pulling in for full parity.
- The loader pipeline in Section 3 is still **reconstructed** from what the
  13 individual guides say about wiring order, not copied from the actual
  loader source — the real `blogs.$blogHandle.$articleHandle.tsx` loader
  body has never been seen in full in this thread (only its JSX return, and
  fragments quoted inside each guide's "wiring it up" section). If the full
  file is pulled, true this section up against the real code, especially:
  - Confirm shoppable-products actually runs before two-column (only
    documented reasoning, not verified against real code)
  - Confirm TOC (`withHeadingIds`) really runs last, after all 9 other
    injectors — same caveat
  - Confirm `authorSection` / `relatedPosts` / `shareUrl` / `tocEnabled` /
    `tocHeadings` are all actually destructured and returned as described
- The 10 route-scoped CSS files' actual contents haven't been reviewed yet
  — only the class names referenced by the components/guides are confirmed
  to exist; the stylesheets themselves (tokens, breakpoints, whether every
  claimed class is actually defined) are still unverified.
- `blog-category.css` and its route (`blogs.$blogHandle._index.tsx`, the
  blog *listing* page) are a level up from this article route and out of
  scope for this document — noted here only so it isn't mistaken for a gap.