# Video

`app/components/blogs/video.tsx`

A blog content block for embedding video from three sources — the **Shopify
CDN**, **YouTube**, or **Vimeo** — behind a single, consistent component.
Built to increase time-on-page for blog posts without hurting page speed:
nothing heavy loads until the block is in view, and third-party embeds don't
mount until the reader actually clicks play.

## Why it's built this way

| Concern | How it's handled |
|---|---|
| Page speed / Core Web Vitals | YouTube and Vimeo render a lightweight poster + play button ("facade") first. The real `<iframe>` (which drags in the provider's own JS) is only mounted on click. |
| Off-screen posts | An `IntersectionObserver` defers mounting any embed until the block scrolls near the viewport (`rootMargin: 200px`). |
| Accessibility | Play button is a real `<button>` with `aria-label`, keyboard-operable (`Enter`/`Space`), visible focus ring. The block is wrapped in a labeled `<figure>`. Native `<video>` supports WebVTT `<track>` captions. |
| Motion sensitivity | `autoplay` is automatically disabled if the reader has `prefers-reduced-motion: reduce` set, regardless of the prop passed in. |
| No dependencies | No video SDKs, no `react-youtube`/`react-player`-style packages — plain `<video>` and `<iframe>` only. |
| Styling | Plain stylesheet at `app/assets/video.css` (imported by the component), BEM-style class names (`video__frame`, `video__play-button`, etc.). Renders as a white bordered card with a centered title header, soft placeholder background, and solid accent-color play button. |

## Usage

```tsx
import Video from "app/components/blogs/video";

// Shopify CDN (self-hosted mp4/webm)
<Video
  source="shopify"
  src="https://cdn.shopify.com/videos/c/o/v/your-file.mp4"
  poster="https://cdn.shopify.com/s/files/1/xxxx/thumbnail.jpg"
  title="Behind the scenes at our workshop"
  caption="Filmed in our Los Angeles studio."
  tracks={[
    { src: "/captions/en.vtt", srcLang: "en", label: "English", default: true },
  ]}
/>

// YouTube — full URL or bare ID both work
<Video
  src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  title="How it's made"
  poster="/images/how-its-made-poster.jpg"
/>

// Vimeo
<Video
  src="https://vimeo.com/76979871"
  title="Our sustainability story"
/>
```

`source` is optional — it's inferred from the URL when omitted. Pass it
explicitly if you're storing a bare provider ID instead of a full URL.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | — | **Required.** Full URL (or bare ID for YouTube/Vimeo). |
| `source` | `"shopify" \| "youtube" \| "vimeo"` | inferred from `src` | Force a source instead of auto-detecting. |
| `title` | `string` | — | **Required.** Accessible label; also the iframe `title`. |
| `poster` | `string` | — | Thumbnail shown before playback. Strongly recommended — falls back to a plain gradient panel if omitted. |
| `caption` | `string` | — | Optional text under the video, rendered as `<figcaption>`. |
| `tracks` | `VideoCaptionTrack[]` | `[]` | WebVTT caption tracks. Shopify CDN source only. |
| `aspectRatio` | `number` | `16/9` | e.g. `1` for square, `9/16` for vertical. |
| `autoplay` | `boolean` | `false` | Shopify CDN only, always muted, disabled under `prefers-reduced-motion`. |
| `loop` | `boolean` | `false` | Shopify CDN only. |
| `muted` | `boolean` | `true` | Shopify CDN only. |
| `controls` | `boolean` | `true` | Shopify CDN only. |
| `eager` | `boolean` | `false` | Skip the click-to-play facade and mount the real embed immediately. |
| `showTitle` | `boolean` | `true` | Show the title as a visible bold header above the video card. Set `false` to keep it screen-reader-only. |
| `className` | `string` | — | Extra class on the root `<figure>`. |

### `VideoCaptionTrack`

```ts
{
  src: string;      // .vtt file URL
  srcLang: string;  // e.g. "en"
  label: string;    // e.g. "English"
  default?: boolean;
}
```

## Behavior notes

- **ID/URL parsing** — YouTube accepts `watch?v=`, `youtu.be/`, `embed/`, and
  `shorts/` URL shapes, or a bare 11-character ID. Vimeo accepts
  `vimeo.com/<id>` or `vimeo.com/video/<id>`, or a bare numeric ID.
- **YouTube embeds use `youtube-nocookie.com`** for the privacy-enhanced
  embed domain.
- Once a YouTube/Vimeo embed is activated, it stays mounted (no unmount on
  scroll-away) so playback isn't interrupted.
- If `IntersectionObserver` isn't available in the runtime, the component
  falls back to treating the block as immediately in view rather than
  failing to render.

## Embedding in article HTML

`video.tsx` doubles as both the presentational component and the
marker-injection/slot-hydration glue, following the same pattern as
`ProductGallery`, `FaqSection`, and `NewsletterForm`. To let editors drop a
video into an article body via a custom-HTML block:

```html
<div
  data-video-embed
  data-src="https://cdn.shopify.com/videos/c/o/v/example.mp4"
  data-source="shopify"
  data-title="Behind the scenes"
  data-poster="https://cdn.shopify.com/s/files/1/xxxx/poster.jpg"
  data-caption="Filmed in our LA studio."
  data-aspect-ratio="16/9"
  data-autoplay="false"
  data-loop="false"
  data-muted="true"
  data-controls="true"
  data-show-title="true"
></div>
```

Only `data-src` and `data-title` are required — everything else falls back
to the component's own defaults, and `data-source` can be omitted since
`<Video>` infers it from the URL.

In the loader, run `injectVideoEmbeds(contentHtml)` alongside the other
pure-string-transform passes (FAQ, newsletter). In the route component, scan
the rendered body for `[data-video-slot]`, read each one back with
`readVideoSlot(el)`, and portal `<Video {...props} />` into it. See
`app/templates/blogs.$blogHandle.$articleHandle.tsx` for the full wiring.

Because the video only becomes interactive once React hydrates it (the
pre-activation poster + play button needs the click handler), the slot
renders empty server-side — there's no meaningful static/no-JS fallback the
way the newsletter form has one.

## Files

- `app/components/blogs/video.tsx` — the component, plus `injectVideoEmbeds` (server-side marker injection) and `readVideoSlot` (client-side slot parsing) for wiring it into article HTML
- `app/assets/video.css` — styles (BEM class names, `prefers-reduced-motion` support), registered via the route's `links()` export (`?url` import), not a direct side-effect import