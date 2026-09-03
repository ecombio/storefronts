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
 * Styles live in ~/components/blogs/ImagesGallery.css (route-scoped, imported via
 * `links()` in the route file) rather than an inline <style> tag —
 * the static server-rendered grid needs to look right before
 * hydration runs, and an inline <style> only exists once the React
 * component itself has mounted.
 */

// Shape of a single image once it has been parsed out of the article's
// HTML (or handed in directly by a consumer using the component
// standalone). This is the "props" form of an image, as opposed to the
// raw <img> tag it may have come from.
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
  /** Grid columns at desktop width. Defaults to 3. Only applies to the 'grid' layout. */
  columns?: 2 | 3 | 4 | 5;
  /** Crop thumbnails to a square. Defaults to true. */
  squareThumbnails?: boolean;
  /**
   * Visual treatment of the gallery. 'grid' (default) is the
   * standard contained grid, columns set by `columns`. 'fullscreen'
   * is a single wide banner tile (or tight strip of tiles), 16:9
   * crop, no border. 'slideshow' shows one large image at a time in
   * a snap-paged track with arrow/dot navigation. 'carousel' shows a
   * horizontally scrollable strip of fixed-width thumbnails — more
   * than one visible at once, unlike slideshow — with arrows to
   * scroll and native swipe/drag support. All four stay contained
   * within the article body's normal width; none of them break out
   * to the viewport edge.
   */
  layout?: 'grid' | 'fullscreen' | 'slideshow' | 'carousel';
  /** Optional className for outer wrapper, for page-level overrides */
  className?: string;
}

export default function ImagesGallery({
  images,
  title,
  columns = 3,
  squareThumbnails = true,
  layout = 'grid',
  className,
}: ImagesGalleryProps) {
  // `null` means the lightbox is closed; a number is the index of the
  // image currently shown in the lightbox.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Remembers which thumbnail button was clicked to open the lightbox,
  // so focus can be returned to it when the lightbox closes
  // (accessibility: keyboard/screen-reader users don't lose their place).
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Lets us programmatically focus the lightbox's close button as soon
  // as it opens, so keyboard focus moves into the dialog.
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  // Unique id used to associate the optional <h3> title with the grid
  // via aria-labelledby, without risking collisions if this component
  // is rendered more than once on a page.
  const headingId = useId();

  const isOpen = activeIndex !== null;

  // Slideshow layout only: which slide is currently scrolled into
  // view. Independent of activeIndex/isOpen above — the slideshow
  // shows one image at a time inline on the page, while
  // activeIndex/isOpen still drive the separate zoomed-in lightbox
  // dialog, which the slideshow can also open (see ig-slide-button
  // below) for a larger, letterboxed view with the counter/filmstrip.
  const [currentSlide, setCurrentSlide] = useState(0);
  // The scrollable slide track, so goToSlide can scroll it
  // programmatically (arrows/dots) in addition to the native touch/
  // trackpad swiping the track already supports for free via
  // scroll-snap.
  const slideTrackRef = useRef<HTMLDivElement | null>(null);

  // Carousel layout only: the horizontally-scrollable thumbnail track,
  // so scrollCarouselBy can nudge it programmatically (arrow buttons)
  // in addition to the native drag/swipe/trackpad scrolling it already
  // supports for free. Unlike the slideshow track, there's no
  // "currentSlide" concept to keep in sync here — the carousel is a
  // free scroll area, not a paged one, so no scroll listener is needed.
  const carouselTrackRef = useRef<HTMLUListElement | null>(null);

  // Scrolls the slide track to a given index (smooth-scrolled, one
  // track-width per slide since each slide is 100% of the track's
  // width) and updates state to match. This is the single place that
  // moves the slideshow — arrows, dots, and the initial mount all
  // funnel through it.
  const goToSlide = useCallback((index: number) => {
    const track = slideTrackRef.current;
    if (track) {
      // scrollTo's smooth behavior is driven by JS, not the CSS
      // scroll-behavior property, so it needs its own
      // prefers-reduced-motion check rather than relying on the
      // reduced-motion rule in ImagesGallery.css.
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      track.scrollTo({
        left: index * track.clientWidth,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
    setCurrentSlide(index);
  }, []);

  const slidePrev = useCallback(() => {
    goToSlide((currentSlide - 1 + images.length) % images.length);
  }, [goToSlide, currentSlide, images.length]);

  const slideNext = useCallback(() => {
    goToSlide((currentSlide + 1) % images.length);
  }, [goToSlide, currentSlide, images.length]);

  // Keeps `currentSlide` (and therefore the active dot) in sync when
  // the visitor swipes/scrolls the track directly instead of using
  // the arrow/dot buttons — scroll-snap only handles the visual
  // snapping, not telling React which slide that landed on. Cheap
  // read + comparison per scroll event, so no throttling here.
  const handleSlideScroll = useCallback(() => {
    const track = slideTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setCurrentSlide((current) => (index !== current ? index : current));
  }, []);

  // Nudges the carousel track left/right by ~80% of its visible
  // width — enough to feel like a deliberate "next page" of
  // thumbnails without jumping so far the visitor loses their place.
  // Unlike goToSlide, this has no fixed "index" to land on — the
  // carousel is a free-scrolling strip, not a paged one, so it just
  // scrolls by a relative amount each time the arrow is clicked.
  const scrollCarouselBy = useCallback((direction: 1 | -1) => {
    const track = carouselTrackRef.current;
    if (!track) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollBy({
      left: track.clientWidth * 0.8 * direction,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);

  // Opens the lightbox at a given image index.
  const openAt = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  // Closes the lightbox and restores focus to whichever thumbnail
  // button originally opened it.
  const close = useCallback(() => {
    setActiveIndex(null);
    triggerRef.current?.focus();
  }, []);

  // Moves to the previous image, wrapping around to the last image
  // when currently on the first (modulo arithmetic with the
  // `+ images.length` guards against negative results in JS).
  const showPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current - 1 + images.length) % images.length;
    });
  }, [images.length]);

  // Moves to the next image, wrapping around to the first image when
  // currently on the last.
  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current + 1) % images.length;
    });
  }, [images.length]);

  // Keyboard controls + scroll lock while the lightbox is open.
  // Runs only while `isOpen` is true, and cleans up after itself when
  // the lightbox closes or the component unmounts.
  useEffect(() => {
    if (!isOpen) return;

    // Prevent the page behind the lightbox from scrolling, restoring
    // whatever the previous overflow value was on cleanup (rather than
    // assuming it was "visible").
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move keyboard focus into the dialog as soon as it opens.
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

  // No images (e.g. every <img> in the marker was malformed) — render
  // nothing rather than an empty grid/heading.
  if (!images || images.length === 0) return null;

  // The currently active image object, or null when the lightbox is
  // closed. Declared once here so the JSX below doesn't have to keep
  // re-deriving/re-checking it.
  const active = activeIndex !== null ? images[activeIndex] : null;

  const rootClassName = [
    'ig-root',
    layout === 'fullscreen' ? 'ig-root--fullscreen' : null,
    layout === 'slideshow' ? 'ig-root--slideshow' : null,
    layout === 'carousel' ? 'ig-root--carousel' : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      {title ? (
        <h3 className="ig-title" id={headingId}>
          {title}
        </h3>
      ) : null}

      {layout === 'slideshow' ? (
        // Slideshow layout: one large image at a time in a
        // horizontally-scrollable, scroll-snapping track, plus
        // arrow/dot controls that call goToSlide. The scroll-snap
        // track already supports touch/trackpad swiping natively —
        // handleSlideScroll just keeps React's currentSlide (and the
        // active dot) in sync when the visitor swipes directly
        // instead of using the buttons.
        <div className="ig-slideshow">
          <div
            className="ig-slideshow-track"
            ref={slideTrackRef}
            onScroll={handleSlideScroll}
          >
            {images.map((image, index) => (
              <div className="ig-slide" key={image.src + index}>
                <button
                  type="button"
                  className="ig-slide-button"
                  onClick={(event) => {
                    // Clicking the current slide opens the same
                    // lightbox the grid/fullscreen layouts use, for a
                    // larger, letterboxed view with the counter/
                    // filmstrip — same trigger-focus-return behavior
                    // as the grid thumbnails.
                    triggerRef.current = event.currentTarget;
                    openAt(index);
                  }}
                  aria-haspopup="dialog"
                >
                  <img
                    className="ig-slide-img"
                    src={image.src}
                    alt={image.alt}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </button>
              </div>
            ))}
          </div>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="ig-slideshow-nav ig-slideshow-nav--prev"
                onClick={slidePrev}
                aria-label="Previous image"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                className="ig-slideshow-nav ig-slideshow-nav--next"
                onClick={slideNext}
                aria-label="Next image"
              >
                <ChevronIcon direction="right" />
              </button>

              <div className="ig-slideshow-dots">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={image.src + index}
                    className={`ig-slideshow-dot${
                      index === currentSlide ? " ig-slideshow-dot--active" : ""
                    }`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Show image ${index + 1}: ${image.alt}`}
                    aria-current={index === currentSlide}
                  />
                ))}
              </div>
            </>
          ) : null}

          {images[currentSlide]?.caption ? (
            <p className="ig-slideshow-caption">{images[currentSlide].caption}</p>
          ) : null}
        </div>
      ) : layout === 'carousel' ? (
        // Carousel layout: a horizontally scrollable strip of
        // fixed-width thumbnails — several visible at once, unlike
        // slideshow's one-at-a-time paging. Native drag/swipe/
        // trackpad scrolling works for free (overflow-x + touch
        // scrolling in CSS); scrollCarouselBy just layers optional
        // arrow buttons on top, same "buttons nudge, native gesture
        // also works" relationship the slideshow track has. Each
        // thumbnail opens the same shared lightbox as the grid
        // layout.
        <div className="ig-carousel">
          <ul
            className="ig-carousel-track"
            ref={carouselTrackRef}
            aria-labelledby={title ? headingId : undefined}
          >
            {images.map((image, index) => (
              <li className="ig-carousel-cell" key={image.src + index}>
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

          {/* Arrows are only useful once there's more than one
              screen's worth of thumbnails to scroll to — but since
              that depends on runtime container width, not just image
              count, they're shown whenever there's more than one
              image (same threshold the other layouts use for their
              own nav controls) rather than trying to measure. */}
          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="ig-carousel-nav ig-carousel-nav--prev"
                onClick={() => scrollCarouselBy(-1)}
                aria-label="Scroll thumbnails left"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                className="ig-carousel-nav ig-carousel-nav--next"
                onClick={() => scrollCarouselBy(1)}
                aria-label="Scroll thumbnails right"
              >
                <ChevronIcon direction="right" />
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <>
          {/* Thumbnail grid. --ig-columns is a CSS custom property
              consumed by ImagesGallery.css to control the column count
              responsively. Used for both 'grid' and 'fullscreen' — the
              fullscreen modifier class on the root changes how this
              same markup is styled rather than swapping in different
              markup. */}
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
                    // Stash the clicked button so focus can return to it
                    // when the lightbox closes.
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
        </>
      )}

      {/* Lightbox overlay — only rendered while an image is active. */}
      {isOpen && active ? (
        <div
          className="ig-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={title ? `${title} — expanded image` : "Expanded image"}
          onClick={(event) => {
            // Clicking the dimmed backdrop (not the lightbox content
            // itself) closes the dialog. Comparing target to
            // currentTarget ensures clicks inside the lightbox don't
            // bubble up and close it.
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
              {/* Prev/next arrows are only shown when there's more than
                  one image — no point navigating a single-image set. */}
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

            {/* Filmstrip of every image in the set, letting the user
                jump directly to any of them instead of stepping one at
                a time with prev/next. Hidden for single-image sets. */}
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

// Small inline icon components so the file has no external icon
// dependency. `aria-hidden` because the surrounding <button> already
// carries an aria-label describing the action.
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  // Two hand-picked path shapes — one pointing left, one pointing
  // right — rather than a single path plus a CSS transform, so the
  // icon stays crisp regardless of how it's scaled.
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

// Matches a whole `<div ... data-gallery-embed ...>...</div>` marker
// block, capturing its inner HTML (the raw <img> tags the article
// editor put there). Non-greedy `[\s\S]*?` so nested/adjacent markers
// don't get merged into one match, and `g`/`i` flags so it finds every
// marker in the article, case-insensitively.
const GALLERY_EMBED_RE = /<div[^>]*\bdata-gallery-embed\b[^>]*>([\s\S]*?)<\/div>/gi;
// Matches individual <img ...> tags within a marker's inner HTML.
const IMG_TAG_RE = /<img\b[^>]*>/gi;

// Pulls a single attribute's value out of a raw HTML tag string via
// regex (there's no DOM available server-side to just use
// `element.getAttribute`).
function parseAttr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
  return match ? match[1] : undefined;
}

// Escapes text before it's interpolated back into an HTML string, to
// avoid breaking markup or introducing an XSS vector when the source
// data (alt text, captions, titles) contains special characters.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Builds the no-JS fallback grid: plain <a> links (not buttons, since
// there's no JS yet to open a lightbox) that open each full-size image
// in a new tab. This is what gets sent down on first render/SSR and
// before hydration.
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

// Builds the no-JS fallback slideshow: a horizontally-scrollable,
// scroll-snapping track of full-size images, each wrapped in a plain
// <a> (no arrows/dots — those need JS). Native browser scroll-snap
// plus touch/trackpad swiping already makes this usable with zero
// JavaScript; hydration layers the arrow/dot controls and
// currentSlide tracking on top of the same markup shape (see
// ig-slide / ig-slide-button / ig-slide-img in the component above).
function renderStaticGallerySlideshow(images: GalleryImage[]): string {
  const slides = images
    .map(
      (image) =>
        `<div class="ig-slide">` +
        `<a class="ig-slide-button" href="${escapeHtml(image.src)}" target="_blank" rel="noreferrer">` +
        `<img class="ig-slide-img" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy" />` +
        `</a></div>`,
    )
    .join("");

  return `<div class="ig-slideshow"><div class="ig-slideshow-track">${slides}</div></div>`;
}

// Builds the no-JS fallback carousel: a horizontally-scrollable strip
// of fixed-width thumbnails, each wrapped in a plain <a> (no scroll
// arrows — those need JS). Native overflow-x scrolling plus touch/
// trackpad drag already makes this usable with zero JavaScript;
// hydration layers the arrow-button nudging on top of the same markup
// shape (see ig-carousel-cell / ig-thumb-button in the component
// above).
function renderStaticGalleryCarousel(images: GalleryImage[]): string {
  const items = images
    .map(
      (image) =>
        `<li class="ig-carousel-cell">` +
        `<a class="ig-thumb-button" href="${escapeHtml(image.src)}" target="_blank" rel="noreferrer">` +
        `<img class="ig-thumb-img ig-thumb-img--square" src="${escapeHtml(
          image.thumbnailSrc ?? image.src,
        )}" alt="${escapeHtml(image.alt)}" loading="lazy" />` +
        `</a></li>`,
    )
    .join("");

  return `<div class="ig-carousel"><ul class="ig-carousel-track">${items}</ul></div>`;
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
    // Grab just the marker's own opening tag (up to its first `>`) so
    // we can read data-gallery-title / data-gallery-columns off of it
    // without accidentally matching attributes on nested elements.
    const wrapperOpenTag = fullMatch.slice(0, fullMatch.indexOf(">") + 1);
    const title = parseAttr(wrapperOpenTag, "data-gallery-title");
    const columnsRaw = parseAttr(wrapperOpenTag, "data-gallery-columns");
    const columns = columnsRaw ? Number(columnsRaw) : 3;
    // "fullscreen", "slideshow", and "carousel" are the recognized
    // values — anything else (typo, omitted attribute) falls back to
    // the standard contained grid rather than silently applying an
    // unknown layout.
    const layoutRaw = parseAttr(wrapperOpenTag, "data-gallery-layout");
    const layout =
      layoutRaw === "fullscreen" || layoutRaw === "slideshow" || layoutRaw === "carousel"
        ? layoutRaw
        : undefined;

    // Parse each <img> tag inside the marker into a GalleryImage,
    // skipping any tag that has no usable src.
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

    // Nothing usable was found — drop the marker entirely rather than
    // rendering an empty gallery.
    if (images.length === 0) return "";

    // Serialize the parsed images into the output markup so the
    // client can rehydrate them without re-parsing the article HTML.
    // encodeURIComponent keeps the JSON safe to embed inside an HTML
    // attribute value.
    const encodedImages = encodeURIComponent(JSON.stringify(images));
    const titleAttr = title ? ` data-gallery-title="${escapeHtml(title)}"` : "";
    const columnsAttr = ` data-gallery-columns="${columns}"`;
    const layoutAttr = layout ? ` data-gallery-layout="${layout}"` : "";
    const rootClass =
      layout === "fullscreen"
        ? "ig-root ig-root--fullscreen"
        : layout === "slideshow"
        ? "ig-root ig-root--slideshow"
        : layout === "carousel"
        ? "ig-root ig-root--carousel"
        : "ig-root";
    const heading = title ? `<h3 class="ig-title">${escapeHtml(title)}</h3>` : "";
    const staticMarkup =
      layout === "slideshow"
        ? renderStaticGallerySlideshow(images)
        : layout === "carousel"
        ? renderStaticGalleryCarousel(images)
        : renderStaticGalleryGrid(images, columns);

    return (
      `<div class="${rootClass}" data-gallery-slot data-gallery-images="${encodedImages}"` +
      `${titleAttr}${columnsAttr}${layoutAttr}>` +
      heading +
      staticMarkup +
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
  layout?: 'grid' | 'fullscreen' | 'slideshow' | 'carousel';
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

  // Decode + parse the JSON payload written by injectImagesGallery.
  // Any failure here (bad JSON, tampered markup, etc.) is treated as
  // "no gallery" rather than thrown, so a malformed slot doesn't crash
  // the page.
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
  const layoutRaw = el.getAttribute("data-gallery-layout");
  const layout =
    layoutRaw === "fullscreen" || layoutRaw === "slideshow" || layoutRaw === "carousel"
      ? layoutRaw
      : undefined;

  return { images, title, columns, layout };
}