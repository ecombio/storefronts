# Image Gallery block (`data-gallery-embed`)

Interactive thumbnail-grid-to-lightbox gallery for blog articles. Authored
inline in the article body via an HTML marker, same pattern as the FAQ,
newsletter, video, quote, and CTA blocks.

Source: `~/components/blogs/ImagesGallery.tsx`
Styles: `~/components/blogs/ImagesGallery.css` (route-scoped, linked in
`blogs.$blogHandle.$articleHandle.tsx`)

## How it works

1. **Loader (server):** `injectImagesGallery(contentHtml)` scans the raw
   article HTML for `data-gallery-embed` markers, pulls the `<img>` tags out
   of each one, and replaces the whole marker with a `data-gallery-slot`
   node containing a real, working, no-JS static version of whichever
   layout was requested (thumbnail grid, banner tile, slide track, or
   scrollable strip — see Layouts below) plus a `data-gallery-images`
   attribute carrying the parsed image list as JSON.
2. **Route component (client):** once the article body mounts, a
   DOM-scanning effect finds every `[data-gallery-slot]` node, reads its
   props back via `readGallerySlot()` (image list, title, columns, and
   layout), clears the static markup, and portals in the real
   `<ImagesGallery />` component — which adds the lightbox, keyboard
   navigation (Esc / ← / →), a counter, captions, and a filmstrip on top of
   whichever layout is active.

Visitors without JS (or before hydration completes) still get a fully
functional version of the gallery: grid/carousel thumbnails and fullscreen
tiles link to their full-size image in a new tab; the slideshow's track is
swipeable/scrollable via native CSS scroll-snap with no JS required.

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
| `data-gallery-title` | outer `<div>` | no | Rendered as an `<h3>` above the gallery. Omit for no heading. |
| `data-gallery-columns` | outer `<div>` | no | Desktop grid columns for the **grid** layout only. Accepts `2`–`5`; defaults to `3` if omitted **or invalid** — see Known limitations. Has no effect on fullscreen/slideshow/carousel. |
| `data-gallery-layout` | outer `<div>` | no | One of `grid` (default), `fullscreen`, `slideshow`, `carousel`. Any other value (typo, unsupported string) silently falls back to `grid` rather than erroring — see Layouts below. |
| `src` | each `<img>` | **yes** | Must be a real, already-uploaded Shopify CDN URL. An `<img>` with no `src` is silently dropped. |
| `alt` | each `<img>` | strongly recommended | Used for accessibility and as the thumbnail/filmstrip image's alt text. |
| `data-caption` | each `<img>` | no | Shown under the image in the lightbox only (not in the grid/carousel/fullscreen tiles). For the slideshow layout, it's also shown under the currently-visible slide on the page itself. |

A marker with **zero** usable `<img src="...">` tags is dropped entirely —
no empty gallery slot is ever rendered.

## Layouts

Set via `data-gallery-layout` on the marker's outer `<div>`. All four stay
contained within the article body's normal width — none of them break out
to the viewport edge.

| Layout | What it looks like | Notes |
|---|---|---|
| `grid` (default) | Standard contained grid, column count from `data-gallery-columns` (2–5, defaults to 3). Drops to 2 columns on narrow viewports regardless of the configured count. | Same behavior whether the attribute is omitted or explicitly set to `grid`. |
| `fullscreen` | A single wide banner tile (or a tight strip of tiles for multiple images), 16:9 crop (4:3 on mobile), no border, minimal gap between tiles. | Reads best with one or a small number of images; `data-gallery-columns` doesn't apply. |
| `slideshow` | One large image at a time in a horizontally scroll-snapping track, with overlaid prev/next arrows, dot indicators below, and the current image's caption (if any) shown under the track. | Native CSS scroll-snap makes the track swipeable with zero JS; arrows/dots just layer programmatic control on top. Only shown when there's more than one image. |
| `carousel` | A horizontally-scrollable strip of fixed-width square thumbnails, several visible at once (unlike slideshow's one-at-a-time paging), with overlaid prev/next arrows to nudge the strip. Each thumbnail opens the same lightbox as the grid layout. | Free-scrolling, not paged — there's no dot/position indicator. Renamed from an earlier internal "row" layout; the `carousel` value is the only one that's ever shipped publicly. |

Any image count works with any layout — `fullscreen` and `slideshow`/
`carousel` just don't use `data-gallery-columns`, since they aren't
column-based grids.

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
   lightbox (or, for slideshow, on-page) caption text — e.g. product names,
   credits.
5. Pick a layout by adding `data-gallery-layout="fullscreen"`,
   `"slideshow"`, or `"carousel"` if you don't want the default grid; add
   `data-gallery-columns` only when using the default grid layout.
6. Save and preview. You should see a working, styled gallery immediately
   (even before JS loads); clicking a thumbnail/slide after the page
   hydrates opens the lightbox.

## Behavior once hydrated

- Click any thumbnail, tile, or slide → opens the lightbox at that image.
- **Esc** closes it and returns focus to whichever element opened it.
- **←/→** navigate to the previous/next image in the lightbox (wraps
  around) — separate from the slideshow's own arrow buttons, which move
  the inline track rather than the lightbox.
- A `1 / N` counter and a filmstrip of the other images are shown in the
  lightbox when there's more than one image; the filmstrip is hidden for
  single-image galleries.
- Captions (`data-caption`) render under the lightbox image for every
  layout; the slideshow layout additionally shows the current slide's
  caption inline, under the track, before the lightbox is even opened.
- Body scroll is locked while the lightbox is open.
- Respects `prefers-reduced-motion`: smooth scrolling (slideshow arrows/
  dots, carousel arrows) and hover/focus transitions are disabled when the
  visitor has that OS-level preference set.

## Known limitations (not yet fixed)

- **Nested `<div>`s inside a marker can truncate the gallery.** The
  server-side marker regex is non-greedy and matches the *first* closing
  `</div>` it finds. If any `<img>` inside the block ends up wrapped in its
  own `<div>` (rather than being a direct child, or wrapped in `<p>`/plain
  text), everything after that point gets silently dropped from the
  gallery. Keep `<img>` tags as direct children of the `data-gallery-embed`
  block, or wrap them in `<p>` if you need a wrapper. Applies to every
  layout, not just the default grid.
- **Invalid `data-gallery-columns` produces broken output**, not a clean
  fallback to 3. A non-numeric value (e.g. `"auto"`) currently flows
  through as `NaN` into both the static grid's inline style and the
  hydrated component's `columns` prop. Stick to `2`, `3`, `4`, or `5`
  until this is patched. (Only relevant to the `grid` layout —
  fullscreen/slideshow/carousel ignore this attribute entirely.)
- **No focus trap in the lightbox.** Focus moves to the close button on
  open and returns to the trigger on close, but Tab can still walk focus
  out to the page behind the (visually hidden) overlay while it's open.
- **Filmstrip thumbnails always crop square**, regardless of the
  `squareThumbnails` prop — only the main grid/carousel thumbnails respect
  that setting. (`squareThumbnails` is a component prop, not a marker
  attribute — there's no way to control it from article HTML today.)
- **Carousel arrows don't disable at the ends.** The prev/next buttons on
  the `carousel` layout keep nudging the strip regardless of scroll
  position — there's no visual "you've reached the end" state the way the
  slideshow's dots communicate position.
- **Carousel thumbnail width is fixed**, not configurable per-marker —
  it's a hardcoded size in the stylesheet (narrower on small screens), with
  no equivalent to the grid layout's `data-gallery-columns`.

None of these block normal use; they matter most for hand-authored or
malformed marker HTML, so keep to the syntax above.

## Files touched

| File | Role |
|---|---|
| `~/components/blogs/ImagesGallery.tsx` | `injectImagesGallery`, `readGallerySlot`, `<ImagesGallery />` (grid/fullscreen/slideshow/carousel layouts) |
| `~/components/blogs/ImagesGallery.css` | Styles for both the static markup and the hydrated lightbox, across all four layouts |
| `~/templates/blogs.$blogHandle.$articleHandle.tsx` | Loader wiring (`injectImagesGallery` call), route-scoped stylesheet link, `GallerySlot` type (image list/title/columns/layout), DOM-scan effect, portal render |