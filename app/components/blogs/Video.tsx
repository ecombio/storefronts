import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

/**
 * NOTE ON STYLES: this component does NOT import its own CSS.
 * app/assets/video.css is registered by the consuming route's
 * `links()` export (via `?url`), same as article.css/article-author.css
 * in blogs.$blogHandle.$articleHandle.tsx.
 */

/**
 * Video
 * -----
 * Drop-in blog content block for embedding video from three sources:
 *   1. Shopify CDN (self-hosted .mp4 / .webm — native <video>)
 *   2. YouTube (facade-embed, loads iframe only on interaction)
 *   3. Vimeo (facade-embed, loads iframe only on interaction)
 *
 * Design goals:
 *  - Zero external dependencies (matches project convention)
 *  - Lazy-loaded via IntersectionObserver — nothing heavy downloads
 *    until the block is actually near the viewport
 *  - Click-to-play "facade" pattern for YouTube/Vimeo so a full embed
 *    (~500KB+ of iframe JS) never loads unless the reader opts in —
 *    this is what actually protects blog page-speed/CWV scores
 *  - Full keyboard + screen-reader support
 *  - Respects prefers-reduced-motion (never force-autoplays motion)
 */

export type VideoSource = "shopify" | "youtube" | "vimeo";

export interface VideoCaptionTrack {
  /** VTT file URL, e.g. served from Shopify CDN Files */
  src: string;
  srcLang: string;
  label: string;
  default?: boolean;
}

export interface VideoProps {
  /**
   * Raw URL or ID depending on source:
   *  - shopify: full .mp4/.webm CDN URL
   *  - youtube: full URL or bare video ID
   *  - vimeo: full URL or bare video ID
   */
  src: string;
  /** Explicit source. If omitted, it's inferred from `src`. */
  source?: VideoSource;
  /** Poster / thumbnail image shown before playback starts. Strongly recommended for CWV. */
  poster?: string;
  /** Accessible title, also used as the YouTube/Vimeo iframe title. */
  title: string;
  /** Optional caption/subtitle blurb rendered under the video. */
  caption?: string;
  /** WebVTT caption tracks (Shopify CDN source only). */
  tracks?: VideoCaptionTrack[];
  /** Aspect ratio as width/height, e.g. 16/9 (default) or 1 for square. */
  aspectRatio?: number;
  /** Autoplay the Shopify CDN video once it's played (always muted; ignored if prefers-reduced-motion). */
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  /** Extra class on the root element. */
  className?: string;
  /** Skip the click-to-play facade and mount the real embed immediately (SEO/AMP-style pages). */
  eager?: boolean;
  /** Show the title as a visible card header above the video (default true). Set false to keep it screen-reader-only. */
  showTitle?: boolean;
}

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/;
const VIMEO_ID_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

function inferSource(src: string): VideoSource {
  if (/youtube\.com|youtu\.be/.test(src)) return "youtube";
  if (/vimeo\.com/.test(src)) return "vimeo";
  return "shopify";
}

function extractYouTubeId(src: string): string {
  const match = src.match(YOUTUBE_ID_RE);
  return match ? match[1] : src;
}

function extractVimeoId(src: string): string {
  const match = src.match(VIMEO_ID_RE);
  return match ? match[1] : src;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}

function useInView<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

function PlayButton({
  onClick,
  onKeyDown,
  label,
}: {
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="video__play-button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={label}
    >
      <svg
        className="video__play-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="12" className="video__play-ring" />
        <path d="M9.75 7.5v9l7.5-4.5-7.5-4.5z" className="video__play-triangle" />
      </svg>
    </button>
  );
}

export default function Video({
  src,
  source,
  poster,
  title,
  caption,
  tracks = [],
  aspectRatio = 16 / 9,
  autoplay = false,
  loop = false,
  muted = true,
  controls = true,
  className,
  eager = false,
  showTitle = true,
}: VideoProps) {
  const resolvedSource = source ?? inferSource(src);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { ref: containerRef, inView } = useInView<HTMLDivElement>();
  const [activated, setActivated] = useState(eager);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const headingId = useId();

  const safeAutoplay = autoplay && !prefersReducedMotion;

  const activate = useCallback(() => setActivated(true), []);

  const handlePlayButtonKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    },
    [activate]
  );

  useEffect(() => {
    if (resolvedSource !== "shopify" || !activated) return;
    const el = videoElRef.current;
    if (el && safeAutoplay) {
      el.play().catch(() => {
        /* autoplay can be blocked by the browser; controls remain available */
      });
    }
  }, [activated, resolvedSource, safeAutoplay]);

  const embedUrl = useMemo(() => {
    if (resolvedSource === "youtube") {
      const id = extractYouTubeId(src);
      const params = new URLSearchParams({
        autoplay: "1",
        rel: "0",
        modestbranding: "1",
      });
      return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
    }
    if (resolvedSource === "vimeo") {
      const id = extractVimeoId(src);
      const params = new URLSearchParams({ autoplay: "1", title: "0", byline: "0" });
      return `https://player.vimeo.com/video/${id}?${params.toString()}`;
    }
    return src;
  }, [resolvedSource, src]);

  const shouldMountEmbed = activated && (inView || eager);

  return (
    <figure
      className={["video__card", className].filter(Boolean).join(" ")}
      style={{ ["--video-aspect-ratio" as string]: aspectRatio }}
      ref={containerRef}
      aria-labelledby={headingId}
    >
      {showTitle ? (
        <div id={headingId} className="video__header">
          {title}
        </div>
      ) : (
        <span id={headingId} className="video__sr-only-title">
          {title}
        </span>
      )}

      <div className="video__frame">
        {resolvedSource === "shopify" ? (
          shouldMountEmbed ? (
            <video
              ref={videoElRef}
              className="video__media"
              poster={poster}
              controls={controls}
              loop={loop}
              muted={muted || safeAutoplay}
              playsInline
              preload="metadata"
              autoPlay={safeAutoplay}
            >
              <source src={src} />
              {tracks.map((track) => (
                <track
                  key={track.src}
                  kind="captions"
                  src={track.src}
                  srcLang={track.srcLang}
                  label={track.label}
                  default={track.default}
                />
              ))}
              Your browser doesn&apos;t support embedded video.
            </video>
          ) : (
            <>
              {poster && (
                <img
                  src={poster}
                  alt=""
                  className="video__poster"
                  loading="lazy"
                />
              )}
              <PlayButton
                onClick={activate}
                onKeyDown={handlePlayButtonKeyDown}
                label={`Play video: ${title}`}
              />
            </>
          )
        ) : shouldMountEmbed ? (
          <iframe
            className="video__media"
            src={embedUrl}
            title={title}
            allow="accelerate-encryption; autoplay; picture-in-picture; encrypted-media; gyroscope"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <>
            {poster ? (
              <img
                src={poster}
                alt=""
                className="video__poster"
                loading="lazy"
              />
            ) : (
              <div
                className={[
                  "video__poster",
                  "video__poster--fallback",
                  resolvedSource === "youtube"
                    ? "video__poster--youtube"
                    : "video__poster--vimeo",
                ].join(" ")}
                aria-hidden="true"
              />
            )}
            <PlayButton
              onClick={activate}
              onKeyDown={handlePlayButtonKeyDown}
              label={`Play video: ${title}`}
            />
          </>
        )}
      </div>

      {caption && <figcaption className="video__caption">{caption}</figcaption>}
    </figure>
  );
}

/**
 * Marker-injection + slot-hydration
 * ----------------------------------
 * Lets editors drop a video into a blog article body via a custom-HTML
 * block, following the same marker-injection (server) → portal-hydration
 * (client) pattern as ProductGallery/FaqSection/NewsletterForm.
 *
 * Editor-authored marker:
 *
 *   <div
 *     data-video-embed
 *     data-src="https://cdn.shopify.com/videos/c/o/v/example.mp4"
 *     data-source="shopify"
 *     data-title="Behind the scenes"
 *     data-poster="https://cdn.shopify.com/s/files/1/xxxx/poster.jpg"
 *     data-caption="Filmed in our LA studio."
 *     data-aspect-ratio="16/9"
 *     data-autoplay="false"
 *     data-loop="false"
 *     data-muted="true"
 *     data-controls="true"
 *     data-show-title="true"
 *   ></div>
 *
 * Only `data-src` and `data-title` are required — everything else falls
 * back to this component's own defaults, and `data-source` can be
 * omitted since <Video> infers it from the URL.
 */

const VIDEO_EMBED_RE = /<div\s+data-video-embed\b([^>]*)><\/div>/gi;
const ATTR_RE = /data-([\w-]+)="([^"]*)"/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString))) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

// Fields carried straight through from the editor marker onto the
// hydration slot, unchanged. Kept as a flat list (rather than spreading
// every parsed attr) so a stray/unexpected data-* attribute on the
// marker never leaks onto the slot node.
const PASSTHROUGH_FIELDS = [
  "src",
  "source",
  "title",
  "poster",
  "caption",
  "aspect-ratio",
  "autoplay",
  "loop",
  "muted",
  "controls",
  "show-title",
] as const;

/**
 * Rewrites every `data-video-embed` marker in `html` into a
 * `data-video-slot` node the client can find and hydrate (see
 * `readVideoSlot` + the scanning effect in the article route). Pure
 * string transform, no data fetch needed — same reasoning as
 * injectFaqSections/injectNewsletterForm, so it's fine to run alongside
 * those.
 *
 * A marker missing `data-src` is dropped silently (rendered as nothing)
 * rather than left in place or thrown on — same "skip malformed"
 * behavior as the shoppable-slot scan in the article template.
 */
export function injectVideoEmbeds(html: string): string {
  return html.replace(VIDEO_EMBED_RE, (_match, attrString: string) => {
    const attrs = parseAttrs(attrString);
    if (!attrs.src) return "";

    const slotAttrs = PASSTHROUGH_FIELDS.filter((field) => attrs[field] != null)
      .map((field) => `data-${field}="${escapeHtml(attrs[field])}"`)
      .join(" ");

    return `<div data-video-slot ${slotAttrs}></div>`;
  });
}

function toBool(value: string | null, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === "true";
}

// Accepts "16/9" or a bare number like "1" (square).
function parseAspectRatio(value: string): number | undefined {
  const [w, h] = value.split("/").map(Number);
  if (!Number.isFinite(w)) return undefined;
  if (h == null || !Number.isFinite(h) || h === 0) return w;
  return w / h;
}

/**
 * Reads a single `[data-video-slot]` element's data-* attributes back
 * into <Video> props. Used by the article route's slot-scanning effect,
 * mirroring how newsletter/shoppable slots are read back off their DOM
 * nodes rather than re-parsed from raw HTML on the client.
 */
export function readVideoSlot(el: HTMLElement): VideoProps | null {
  const src = el.getAttribute("data-src");
  const title = el.getAttribute("data-title");
  if (!src || !title) return null;

  const source = el.getAttribute("data-source");
  const aspectRatioAttr = el.getAttribute("data-aspect-ratio");

  return {
    src,
    title,
    source:
      source === "youtube" || source === "vimeo" || source === "shopify"
        ? source
        : undefined,
    poster: el.getAttribute("data-poster") ?? undefined,
    caption: el.getAttribute("data-caption") ?? undefined,
    aspectRatio: aspectRatioAttr ? parseAspectRatio(aspectRatioAttr) : undefined,
    autoplay: toBool(el.getAttribute("data-autoplay"), false),
    loop: toBool(el.getAttribute("data-loop"), false),
    muted: toBool(el.getAttribute("data-muted"), true),
    controls: toBool(el.getAttribute("data-controls"), true),
    showTitle: toBool(el.getAttribute("data-show-title"), true),
  };
}