# Video embeds

Embed a video anywhere in a blog article body from the Shopify blog
post HTML editor. Supports three sources:

- **Shopify CDN** — self-hosted `.mp4` / `.webm` files (native `<video>`)
- **YouTube** — click-to-play facade, real iframe only loads on interaction
- **Vimeo** — click-to-play facade, real iframe only loads on interaction

Implementation lives in `~/components/blogs/Video.tsx`. The marker is
resolved server-side by `injectVideoEmbeds` (in the article route
loader) into a `data-video-slot` node, which the client hydrates into
the real `<Video>` component via portal — see that route's header
comment for how this fits into the rest of the article pipeline.

---

## How it works, editor-side

Drop a single self-closing-style `<div data-video-embed ...></div>`
into the post body wherever you want the video to appear. Nothing else
is required — no closing content, no nested markup.

```html
<div
  data-video-embed
  data-src="https://cdn.shopify.com/videos/c/o/v/example.mp4"
  data-title="Behind the scenes"
></div>
```

Only `data-src` and `data-title` are required. Everything else falls
back to a sensible default if omitted.

**A marker missing `data-src` or `data-title` is silently dropped** —
it renders nothing, rather than showing an error on the live page. If
a video isn't showing up after publishing, check those two attributes
first.

---

## Attributes reference

| Attribute | Required | Default | Notes |
|---|---|---|---|
| `data-src` | **Yes** | — | Full `.mp4`/`.webm` CDN URL, or a full YouTube/Vimeo URL (bare video IDs also work for YouTube/Vimeo) |
| `data-title` | **Yes** | — | Accessible title; also used as the YouTube/Vimeo iframe `title` |
| `data-source` | No | inferred from `data-src` | `shopify` \| `youtube` \| `vimeo` — only set this explicitly if auto-detection ever guesses wrong |
| `data-poster` | No | none | Thumbnail shown before playback. **Strongly recommended** — prevents layout shift and gives YouTube/Vimeo embeds a branded look instead of a plain placeholder box |
| `data-caption` | No | none | Short blurb rendered under the video as a `<figcaption>` |
| `data-aspect-ratio` | No | `16/9` | Accepts `"16/9"`-style ratios or a bare number like `"1"` for square |
| `data-autoplay` | No | `false` | `"true"` / `"false"`. **Shopify-hosted only** — ignored for YouTube/Vimeo. Always forced muted when on. Never fires if the visitor has "reduce motion" enabled at the OS level |
| `data-loop` | No | `false` | `"true"` / `"false"` |
| `data-muted` | No | `true` | `"true"` / `"false"` |
| `data-controls` | No | `true` | `"true"` / `"false"` — hides the native player controls when `false` |
| `data-show-title` | No | `true` | `"true"` shows the title as a visible header above the video card; `"false"` keeps it present for screen readers only |

Booleans must be the literal strings `"true"` or `"false"` — anything
else (including omitting the attribute) is treated as the default.

---

## Examples

### Minimal — Shopify-hosted, no extras

```html
<div
  data-video-embed
  data-src="https://cdn.shopify.com/videos/c/o/v/example.mp4"
  data-title="Unboxing the new arrivals"
></div>
```

### Full — Shopify-hosted, every attribute set

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

### YouTube

```html
<div
  data-video-embed
  data-src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  data-title="Product launch teaser"
  data-poster="https://cdn.shopify.com/s/files/1/xxxx/teaser-poster.jpg"
  data-caption="Watch the full launch event."
></div>
```

A bare video ID also works for `data-src` on YouTube/Vimeo, but a full
URL is easier to sanity-check when re-reading the post body later.

### Vimeo

```html
<div
  data-video-embed
  data-src="https://vimeo.com/76979871"
  data-title="Studio tour"
></div>
```

### Square video, autoplaying loop (e.g. a short product clip)

```html
<div
  data-video-embed
  data-src="https://cdn.shopify.com/videos/c/o/v/loop-clip.mp4"
  data-title="Fabric close-up"
  data-aspect-ratio="1"
  data-autoplay="true"
  data-loop="true"
  data-controls="false"
  data-show-title="false"
></div>
```

Autoplay is always muted regardless of `data-muted`, and never
triggers for visitors with reduced-motion preferences — no extra
attribute needed to handle that.

---

## Writing guidance

- **Always set `data-poster`** for YouTube/Vimeo embeds. Without one,
  visitors see a plain placeholder box until they click play, which
  looks unfinished — a poster makes the block look intentional and
  branded before any interaction happens.
- **Keep `data-title` genuinely descriptive**, not just "Video" — it's
  read aloud by screen readers and used as the iframe's accessible
  name for YouTube/Vimeo.
- **Don't rely on autoplay to communicate anything important.** It's
  Shopify-CDN-only, always muted, and silently skipped for any visitor
  with reduced-motion enabled — so treat it as a nice-to-have polish
  effect, never as the only way a viewer learns something.
- **One `data-video-embed` div per video.** Don't nest markers or put
  other content inside the div — it must stay empty
  (`<div ...></div>`); anything else means it won't be matched and
  will pass through to the live page unrendered.
- Nothing heavy loads until a reader actually presses play on a
  YouTube/Vimeo embed (facade pattern), and nothing for any video
  source loads until the block scrolls near the viewport — so adding
  multiple videos to one long article is safe for page speed.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Nothing renders where the marker was placed | `data-src` or `data-title` missing |
| Video plays but has no thumbnail before clicking | `data-poster` not set (YouTube/Vimeo) |
| Autoplay doesn't seem to work | Source isn't Shopify-hosted, or the visitor has reduced-motion enabled — both are expected, not a bug |
| Wrong source detected (e.g. treated as Shopify instead of YouTube) | Set `data-source` explicitly to override auto-detection |
| Edited attribute values don't seem to apply after saving | Confirm the div is still empty (`<div ...></div>`) — content or whitespace inside it can break the marker match |
