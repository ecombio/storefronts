# Image Gallery — `ImagesGallery.tsx`

A gallery block for Shopify blog articles, built as a marker → static
render → client hydrate block, the same shape as the other blog embeds
(`ProductGallery`, `FaqSection`, `NewsletterForm`, `video`). It shows a
grid of thumbnails; clicking one opens a full-size lightbox with a
counter, arrow navigation, captions, and a filmstrip of the rest of the
set.

Files:
- `app/components/blogs/ImagesGallery.tsx` — marker parser
  (`injectImagesGallery`), slot reader (`readGallerySlot`), and the
  interactive component (default export).
- `app/assets/gallery.css` — route-scoped styles, imported via
  `links()` in `blogs.$blogHandle.$articleHandle.tsx`, the same way as
  `article.css` / `video.css`.

## How it fits into the article pipeline

The loader in `blogs.$blogHandle.$articleHandle.tsx` runs a series of
pure string transforms over `article.contentHtml` before it's rendered:
shoppable products, two-column content, FAQ sections, the newsletter
form, video embeds, and now the gallery. Each transform finds its own
marker and replaces it with a **slot** — a DOM node the client can find
after render and hydrate into a live React component via `createPortal`.

`injectImagesGallery` follows that pattern:

1. Finds every `data-gallery-embed` marker in the article HTML.
2. Reads the `<img>` tags inside it into a `GalleryImage[]`.
3. Replaces the whole marker with a `data-gallery-slot` node containing
   a real, working thumbnail grid (plain `<a>`/`<img>` tags, no JS
   required) plus a `data-gallery-images` attribute carrying the same
   image list as JSON.

On the client, the route's existing DOM-scanning effect (the one that
already finds `[data-shoppable-slot]`, `[data-newsletter-slot]`, and
`[data-video-slot]`) also looks for `[data-gallery-slot]`, calls
`readGallerySlot(el)` to get the props back, clears the static grid,
and the route portals a live `<ImagesGallery />` into that node — same
"static now, upgrade on hydrate" behavior as the newsletter form.

## Editor-facing marker syntax

Whatever writes to `article.contentHtml` (the Shopify blog editor's
HTML/embed block) should wrap a set of images like this:

```html
<div data-gallery-embed data-gallery-title="My gallery" data-gallery-columns="3">
  <img src="https://cdn.shopify.com/.../bag.jpg" alt="Canvas satchel, front view" data-caption="The Fielder satchel" />
  <img src="https://cdn.shopify.com/.../glasses.jpg" alt="Round frame sunglasses" />
  <img src="https://cdn.shopify.com/.../notebook.jpg" alt="Leather notebook" data-caption="Full-grain leather, A5" />
</div>
```

- `data-gallery-embed` — required, marks the block.
- `data-gallery-title` — optional. Rendered as a heading above the
  grid, e.g. `"My gallery"`.
- `data-gallery-columns` — optional, `2`–`5`. Defaults to `3`.
- Each `<img>` needs a real `src`. `alt` should be filled in for
  accessibility/SEO (falls back to an empty string if omitted, but
  don't rely on that). `data-caption` is optional and shows under the
  image in the lightbox.
- A marker with no `<img>` tags inside it is dropped entirely rather
  than rendering an empty gallery.

## Direct usage (outside the marker pipeline)

`ImagesGallery` is also a normal component you can render directly —
useful in Storybook, a preview surface, or anywhere else that isn't
going through `contentHtml`.

## Props

| Prop               | Type                                    | Default | Notes                                                      |
|---------------------|------------------------------------------|---------|--------------------------------------------------------------|
| `images`            | `GalleryImage[]`                        | —       | Required. See shape below.                                 |
| `title`             | `string`                                | —       | Optional heading above the grid, e.g. `"My gallery"`.       |
| `columns`           | `2 \| 3 \| 4 \| 5`                       | `3`     | Desktop grid columns. Collapses to 2 columns under 640px.   |
| `squareThumbnails`  | `boolean`                               | `true`  | Crops grid thumbnails to a 1:1 square.                       |
| `className`         | `string`                                | —       | Extra class on the outer wrapper for page-level overrides.  |

### `GalleryImage`

```ts
interface GalleryImage {
  src: string;            // full-resolution image URL (e.g. Shopify CDN URL)
  alt: string;             // required, used for accessibility + SEO
  caption?: string;        // shown under the image in the lightbox
  thumbnailSrc?: string;   // smaller image for the grid; falls back to src
}
```

## Basic usage

```tsx
import ImagesGallery from "app/components/blogs/ImagesGallery";

export default function ArticleBody() {
  return (
    <ImagesGallery
      title="My gallery"
      images={[
        {
          src: "https://cdn.shopify.com/.../satchel-bag-full.jpg",
          thumbnailSrc: "https://cdn.shopify.com/.../satchel-bag-thumb.jpg",
          alt: "Canvas satchel bag, front view",
          caption: "The Fielder satchel in canvas and leather.",
        },
        {
          src: "https://cdn.shopify.com/.../round-glasses-full.jpg",
          alt: "Round frame sunglasses on a stand",
          caption: "Round frames, tortoiseshell finish.",
        },
      ]}
    />
  );
}
```

This reproduces the "My gallery" pattern from the reference mock: a
labeled block containing a row of square thumbnails that expand on click.

## Four-column, no captions

```tsx
<ImagesGallery
  columns={4}
  images={productShots.map((shot) => ({
    src: shot.url,
    alt: shot.altText,
  }))}
/>
```

## Rendering inside blog article HTML (Liquid + React island)

If the blog body is rendered as HTML/Liquid and the gallery is mounted as a
React island (e.g. via a custom block or a hydrated component), pass the
image list in from the article's metafield or block settings instead of
hardcoding it:

```tsx
type ArticleGalleryBlock = {
  settings: {
    title?: string;
    columns?: 2 | 3 | 4 | 5;
  };
  images: Array<{ src: string; alt: string; caption?: string }>;
};

function ArticleGallerySection({ block }: { block: ArticleGalleryBlock }) {
  return (
    <ImagesGallery
      title={block.settings.title}
      columns={block.settings.columns}
      images={block.images}
    />
  );
}
```

## Accessibility

- Each thumbnail is a real `<button>`, reachable and activatable by
  keyboard.
- Opening the lightbox moves focus to the close button; closing it
  returns focus to the thumbnail that opened it.
- `Escape` closes the lightbox; `ArrowLeft` / `ArrowRight` navigate
  between images.
- The lightbox is marked `role="dialog"` / `aria-modal="true"`, and
  background scroll is locked while it's open.
- `alt` text is required per image — it's used for both the grid and the
  expanded view, so write real descriptions rather than filenames.
- Respects `prefers-reduced-motion` by disabling hover/focus transitions.

## Styling / theming

Colors and radius are set as CSS custom properties at the top of
`app/assets/gallery.css` (`--ig-ink`, `--ig-paper`, `--ig-line`,
`--ig-accent`, `--ig-radius`). The stylesheet covers both the static
server-rendered grid and the hydrated component, since they share the
same class names — to match a specific theme, either:

1. Override the variables from a parent element:

   ```css
   .my-article .ig-root {
     --ig-accent: #a63d2f;
     --ig-radius: 4px;
   }
   ```

2. Or edit `gallery.css` directly if you need structural changes
   rather than token changes.

## Notes / limits

- Images are not uploaded or cropped by this component — pass in URLs
  you already have (e.g. from Shopify's Files/CDN or a metafield).
- No built-in swipe gestures for touch; arrow buttons and keyboard
  navigation cover mobile via tap targets. Add a swipe library on top if
  you need gesture support.
- For very large sets (dozens of images), consider paginating the grid
  or lazy-loading further batches — the filmstrip inside the lightbox
  is fine for a few dozen but gets cramped much beyond that.