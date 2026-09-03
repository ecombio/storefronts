# Image Gallery block (`data-gallery-embed`)

Interactive thumbnail-grid-to-lightbox gallery for blog articles. Authored
inline in the article body via an HTML marker, same pattern as the FAQ,
newsletter, video, quote, and CTA blocks.

Source: `~/components/blogs/ImagesGallery.tsx`
Styles: `~/assets/gallery.css` (route-scoped, linked in
`blogs.$blogHandle.$articleHandle.tsx`)

## How it works

1. **Loader (server):** `injectImagesGallery(contentHtml)` scans the raw
   article HTML for `data-gallery-embed` markers, pulls the `<img>` tags out
   of each one, and replaces the whole marker with a `data-gallery-slot`
   node containing a real, working, no-JS thumbnail grid (`<a>` links to
   the full-size images) plus a `data-gallery-images` attribute carrying the
   parsed image list as JSON.
2. **Route component (client):** once the article body mounts, a
   DOM-scanning effect finds every `[data-gallery-slot]` node, reads its
   props back via `readGallerySlot()`, clears the static grid, and portals
   in the real `<ImagesGallery />` component — which adds the lightbox,
   keyboard navigation (Esc / ← / →), a counter, captions, and a filmstrip.

Visitors without JS (or before hydration completes) still get a fully
functional grid of images that open full-size in a new tab.

## Marker syntax

Written directly into the article's HTML source (Shopify admin → blog post
editor → **Show HTML** `</>` button — not the rich-text view):

```html
<div data-gallery-embed data-gallery-title="Ride essentials" data-gallery-columns="3">
  <img src="https://cdn.shopify.com/.../bag.jpg" alt="Canvas satchel, front view" data-caption="The Fielder satchel" />
  <img src="https://cdn.shopify.com/.../glasses.jpg" alt="Round sunglasses" />
  <img src="https://cdn.shopify.com/.../helmet.jpg" alt="Matte black helmet" data-caption="Available in three colors" />
</div>
```

### Attributes

| Attribute | Where | Required | Notes |
|---|---|---|---|
| `data-gallery-embed` | outer `<div>` | yes | Marks the block for the loader to find and replace. |
| `data-gallery-title` | outer `<div>` | no | Rendered as an `<h3>` above the grid. Omit for no heading. |
| `data-gallery-columns` | outer `<div>` | no | Desktop grid columns. Accepts `2`–`5`; defaults to `3` if omitted **or invalid** — see Known limitations. |
| `src` | each `<img>` | **yes** | Must be a real, already-uploaded Shopify CDN URL. An `<img>` with no `src` is silently dropped. |
| `alt` | each `<img>` | strongly recommended | Used for accessibility and as the grid/filmstrip image's alt text. |
| `data-caption` | each `<img>` | no | Shown under the image in the lightbox only (not in the grid). |

A marker with **zero** usable `<img src="...">` tags is dropped entirely —
no empty gallery slot is ever rendered.

## Editor workflow

1. Open the blog post in the Shopify admin and switch the content editor to
   **HTML view** (`</>`), not the rich-text view. Custom `data-*` attributes
   and wrapper `<div>`s can get stripped or reflowed if you author them in
   rich-text and then round-trip through a save.
2. Use the editor's normal **Insert image** button first, for each photo,
   so it actually lands on the Shopify CDN.
3. Still in HTML view, copy each resulting `https://cdn.shopify.com/...`
   URL into a `<img src="...">` tag inside a `data-gallery-embed` block, in
   the order you want them to appear.
4. Add `alt` text for every image. Add `data-caption` only where you want
   lightbox-only caption text (e.g. product names, credits).
5. Save and preview. You should see a working grid immediately (even before
   JS loads); clicking a thumbnail after the page hydrates opens the
   lightbox.

## Behavior once hydrated

- Click any thumbnail → opens the lightbox at that image.
- **Esc** closes it and returns focus to the thumbnail that opened it.
- **←/→** navigate to the previous/next image (wraps around).
- A `1 / N` counter and a filmstrip of the other images are shown when
  there's more than one image; the filmstrip is hidden for single-image
  galleries.
- Captions (`data-caption`) render under the lightbox image only — they're
  never shown in the grid.
- Body scroll is locked while the lightbox is open.

## Known limitations (not yet fixed)

- **Nested `<div>`s inside a marker can truncate the gallery.** The
  server-side marker regex is non-greedy and matches the *first* closing
  `</div>` it finds. If any `<img>` inside the block ends up wrapped in its
  own `<div>` (rather than being a direct child, or wrapped in `<p>`/plain
  text), everything after that point gets silently dropped from the
  gallery. Keep `<img>` tags as direct children of the `data-gallery-embed`
  block, or wrap them in `<p>` if you need a wrapper.
- **Invalid `data-gallery-columns` produces broken output**, not a clean
  fallback to 3. A non-numeric value (e.g. `"auto"`) currently flows
  through as `NaN` into both the static grid's inline style and the
  hydrated component's `columns` prop. Stick to `2`, `3`, `4`, or `5`
  until this is patched.
- **No focus trap in the lightbox.** Focus moves to the close button on
  open and returns to the trigger on close, but Tab can still walk focus
  out to the page behind the (visually hidden) overlay while it's open.
- **Filmstrip thumbnails always crop square**, regardless of the
  `squareThumbnails` prop — only the main grid respects that setting.

None of these block normal use; they matter most for hand-authored or
malformed marker HTML, so keep to the syntax above.

## Files touched

| File | Role |
|---|---|
| `~/components/blogs/ImagesGallery.tsx` | `injectImagesGallery`, `readGallerySlot`, `<ImagesGallery />` |
| `~/assets/gallery.css` | Styles for both the static grid and the hydrated lightbox |
| `~/templates/blogs.$blogHandle.$articleHandle.tsx` | Loader wiring (`injectImagesGallery` call), route-scoped stylesheet link, DOM-scan effect, portal render |
