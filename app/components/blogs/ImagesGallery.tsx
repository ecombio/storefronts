import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * ImagesGallery
 * -------------
 * Interactive gallery block for Shopify blog articles: a grid of
 * thumbnails that opens into a full-size lightbox with keyboard
 * navigation, a counter, captions, and a filmstrip of the rest of the
 * set.
 *
 * This file exports three things, mirroring the shape of the other
 * blog blocks (ProductGallery, FaqSection, NewsletterForm, video):
 *
 *   - `injectImagesGallery(contentHtml)` — a server-side, pure string
 *     transform run in the route loader. Finds every
 *     `data-gallery-embed` marker in the article body and replaces it
 *     with a static, working (no-JS) thumbnail grid wrapped in a
 *     `data-gallery-slot` node.
 *   - `readGallerySlot(el)` — a client-side helper that reads the
 *     props back off a `data-gallery-slot` node so it can be handed to
 *     the component below.
 *   - `ImagesGallery` (default export) — the interactive React
 *     component, portaled into each `data-gallery-slot` node once the
 *     route's DOM-scanning effect finds it (see
 *     blogs.$blogHandle.$articleHandle.tsx).
 *
 * Marker syntax (inserted via the article's HTML/embed editor —
 * whatever the editor already puts in the content HTML for an image,
 * just wrapped):
 *
 *   <div data-gallery-embed data-gallery-title="My gallery" data-gallery-columns="3">
 *     <img src="https://cdn.shopify.com/.../bag.jpg" alt="Canvas satchel, front view" data-caption="The Fielder satchel" />
 *     <img src="https://cdn.shopify.com/.../glasses.jpg" alt="Round sunglasses" />
 *   </div>
 *
 * `data-gallery-title` and `data-gallery-columns` are optional; each
 * `<img>` needs a real `src`, should have `alt`, and can carry an
 * optional `data-caption` shown under the image in the lightbox.
 *
 * Styles live in ~/assets/gallery.css (route-scoped, imported via
 * `links()` in the route file) rather than an inline <style> tag —
 * the static server-rendered grid needs to look right before
 * hydration runs, and an inline <style> only exists once the React
 * component itself has mounted.
 */

export interface GalleryImage {
  /** Full-resolution image URL (Shopify CDN URL, etc.) */
  src: string;
  /** Required for accessibility + SEO */
  alt: string;
  /** Optional caption shown under the lightbox image */
  caption?: string;
  /** Optional smaller URL for the grid thumbnail; falls back to src */
  thumbnailSrc?: string;
}

export interface ImagesGalleryProps {
  images: GalleryImage[];
  /** Optional heading rendered above the grid, e.g. "My gallery" */
  title?: string;
  /** Grid columns at desktop width. Defaults to 3. */
  columns?: 2 | 3 | 4 | 5;
  /** Crop thumbnails to a square. Defaults to true. */
  squareThumbnails?: boolean;
  /** Optional className for outer wrapper, for page-level overrides */
  className?: string;
}

export default function ImagesGallery({
  images,
  title,
  columns = 3,
  squareThumbnails = true,
  className,
}: ImagesGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const headingId = useId();

  const isOpen = activeIndex !== null;

  const openAt = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const close = useCallback(() => {
    setActiveIndex(null);
    triggerRef.current?.focus();
  }, []);

  const showPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current - 1 + images.length) % images.length;
    });
  }, [images.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current + 1) % images.length;
    });
  }, [images.length]);

  // Keyboard controls + scroll lock while the lightbox is open
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close, showPrev, showNext]);

  if (!images || images.length === 0) return null;

  const active = activeIndex !== null ? images[activeIndex] : null;

  return (
    <div className={`ig-root${className ? ` ${className}` : ""}`}>
      {title ? (
        <h3 className="ig-title" id={headingId}>
          {title}
        </h3>
      ) : null}

      <ul
        className="ig-grid"
        style={{ ["--ig-columns" as string]: columns }}
        aria-labelledby={title ? headingId : undefined}
      >
        {images.map((image, index) => (
          <li className="ig-cell" key={image.src + index}>
            <button
              type="button"
              className="ig-thumb-button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                openAt(index);
              }}
              aria-haspopup="dialog"
            >
              <img
                className={`ig-thumb-img${squareThumbnails ? " ig-thumb-img--square" : ""}`}
                src={image.thumbnailSrc ?? image.src}
                alt={image.alt}
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      {isOpen && active ? (
        <div
          className="ig-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={title ? `${title} — expanded image` : "Expanded image"}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="ig-lightbox">
            <div className="ig-lightbox-top">
              <span className="ig-counter">
                {(activeIndex as number) + 1} / {images.length}
              </span>
              <button
                type="button"
                ref={closeButtonRef}
                className="ig-icon-button"
                onClick={close}
                aria-label="Close gallery"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="ig-lightbox-stage">
              {images.length > 1 ? (
                <button
                  type="button"
                  className="ig-icon-button ig-nav ig-nav--prev"
                  onClick={showPrev}
                  aria-label="Previous image"
                >
                  <ChevronIcon direction="left" />
                </button>
              ) : null}

              <img
                className="ig-lightbox-img"
                src={active.src}
                alt={active.alt}
              />

              {images.length > 1 ? (
                <button
                  type="button"
                  className="ig-icon-button ig-nav ig-nav--next"
                  onClick={showNext}
                  aria-label="Next image"
                >
                  <ChevronIcon direction="right" />
                </button>
              ) : null}
            </div>

            {active.caption ? (
              <p className="ig-caption">{active.caption}</p>
            ) : null}

            {images.length > 1 ? (
              <ul className="ig-filmstrip">
                {images.map((image, index) => (
                  <li key={image.src + index}>
                    <button
                      type="button"
                      className={`ig-filmstrip-button${
                        index === activeIndex ? " ig-filmstrip-button--active" : ""
                      }`}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show image ${index + 1}: ${image.alt}`}
                      aria-current={index === activeIndex}
                    >
                      <img
                        src={image.thumbnailSrc ?? image.src}
                        alt=""
                        loading="lazy"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  const d = direction === "left" ? "M11 3L5 9L11 15" : "M7 3L13 9L7 15";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// Server-side: marker → static slot
// ---------------------------------------------------------------------

const GALLERY_EMBED_RE = /<div[^>]*\bdata-gallery-embed\b[^>]*>([\s\S]*?)<\/div>/gi;
const IMG_TAG_RE = /<img\b[^>]*>/gi;

function parseAttr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
  return match ? match[1] : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderStaticGalleryGrid(images: GalleryImage[], columns = 3): string {
  const items = images
    .map(
      (image) =>
        `<li class="ig-cell">` +
        `<a class="ig-thumb-button" href="${escapeHtml(image.src)}" target="_blank" rel="noreferrer">` +
        `<img class="ig-thumb-img ig-thumb-img--square" src="${escapeHtml(
          image.thumbnailSrc ?? image.src,
        )}" alt="${escapeHtml(image.alt)}" loading="lazy" />` +
        `</a></li>`,
    )
    .join("");

  return `<ul class="ig-grid" style="--ig-columns:${columns}">${items}</ul>`;
}

/**
 * injectImagesGallery — finds every `data-gallery-embed` marker in the
 * article body, pulls the images out of the raw `<img>` tags inside
 * it, and replaces the whole block with a `data-gallery-slot` node: a
 * real, working (no-JS) grid of thumbnails linking to the full-size
 * images, plus a `data-gallery-images` attribute carrying the parsed
 * image list as JSON so the client can hand it straight to
 * `<ImagesGallery />` for the interactive lightbox — same
 * "static now, upgrade on hydrate" shape as injectNewsletterForm.
 * Pure string transform, no data fetch needed, same reasoning as
 * injectFaqSections/injectNewsletterForm/injectVideoEmbeds, so it can
 * run alongside them in the loader.
 *
 * A marker with no usable `<img src="...">` tags inside it is dropped
 * entirely rather than rendered as an empty gallery slot.
 */
export function injectImagesGallery(contentHtml: string): string {
  return contentHtml.replace(GALLERY_EMBED_RE, (fullMatch, inner: string) => {
    const wrapperOpenTag = fullMatch.slice(0, fullMatch.indexOf(">") + 1);
    const title = parseAttr(wrapperOpenTag, "data-gallery-title");
    const columnsRaw = parseAttr(wrapperOpenTag, "data-gallery-columns");
    const columns = columnsRaw ? Number(columnsRaw) : 3;

    const images: GalleryImage[] = [];
    const imgTags = inner.match(IMG_TAG_RE) ?? [];
    for (const tag of imgTags) {
      const src = parseAttr(tag, "src");
      if (!src) continue;
      images.push({
        src,
        alt: parseAttr(tag, "alt") ?? "",
        caption: parseAttr(tag, "data-caption"),
      });
    }

    if (images.length === 0) return "";

    const encodedImages = encodeURIComponent(JSON.stringify(images));
    const titleAttr = title ? ` data-gallery-title="${escapeHtml(title)}"` : "";
    const columnsAttr = ` data-gallery-columns="${columns}"`;
    const heading = title ? `<h3 class="ig-title">${escapeHtml(title)}</h3>` : "";

    return (
      `<div class="ig-root" data-gallery-slot data-gallery-images="${encodedImages}"` +
      `${titleAttr}${columnsAttr}>` +
      heading +
      renderStaticGalleryGrid(images, columns) +
      `</div>`
    );
  });
}

// ---------------------------------------------------------------------
// Client-side: slot → props
// ---------------------------------------------------------------------

export interface GallerySlotData {
  images: GalleryImage[];
  title?: string;
  columns?: 2 | 3 | 4 | 5;
}

/**
 * readGallerySlot — client-side counterpart to injectImagesGallery.
 * Reads the data-gallery-images / -title / -columns attributes a
 * data-gallery-slot node was given server-side and returns props
 * ready to spread onto `<ImagesGallery />`, or null if the slot is
 * malformed — same "skip malformed" behavior as readVideoSlot.
 */
export function readGallerySlot(el: HTMLElement): GallerySlotData | null {
  const raw = el.getAttribute("data-gallery-images");
  if (!raw) return null;

  let images: GalleryImage[];
  try {
    images = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (!Array.isArray(images) || images.length === 0) return null;

  const title = el.getAttribute("data-gallery-title") ?? undefined;
  const columnsRaw = el.getAttribute("data-gallery-columns");
  const columns = columnsRaw ? (Number(columnsRaw) as 2 | 3 | 4 | 5) : undefined;

  return { images, title, columns };
}
