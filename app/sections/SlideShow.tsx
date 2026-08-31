// app/sections/SlideShow.tsx
import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';

export interface SlideShowImage {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface SlideShowSlide {
  id: string;
  image: SlideShowImage;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Optional second, outlined/ghost CTA — e.g. "Order Now" alongside "Learn More". */
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  /** Short label shown in the bottom tab strip. Falls back to `title`. */
  navLabel?: string;
  /**
   * Text color scheme for this slide's caption. Use 'dark' over bright/open
   * images (no scrim, matches the reference design) and 'light' over
   * dark/busy images (adds a scrim for contrast). Defaults to 'dark'.
   */
  theme?: 'light' | 'dark';
}

export interface SlideShowProps {
  slides: SlideShowSlide[];
  /** Autoplay interval in ms. Set to 0 to disable autoplay. */
  interval?: number;
}

const IMAGE_SIZES = '100vw';

export function SlideShow({slides, interval = 6000}: SlideShowProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const goTo = useCallback(
    (index: number) => {
      const total = slides.length;
      setActiveIndex(((index % total) + total) % total);
    },
    [slides.length],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (!interval || interval <= 0 || slides.length <= 1) return;
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval, isPaused, slides.length]);

  // Standard ARIA tablist arrow-key pattern for the bottom tab strip.
  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % slides.length;
      if (event.key === 'ArrowLeft')
        nextIndex = (index - 1 + slides.length) % slides.length;
      if (nextIndex !== null) {
        event.preventDefault();
        goTo(nextIndex);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [goTo, slides.length],
  );

  if (slides.length === 0) return null;

  return (
    <section
      className="slideshow"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="slideshow__track">
        {slides.map((slide, index) => (
          <div
            className="slideshow__slide"
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={index !== activeIndex}
            style={{
              transform: `translateX(${(index - activeIndex) * 100}%)`,
            }}
          >
            <div className="slideshow__image-zone">
              <Image
                data={slide.image}
                className="slideshow__image"
                loading={index === 0 ? 'eager' : 'lazy'}
                sizes={IMAGE_SIZES}
                alt={slide.image.altText ?? slide.title}
              />
            </div>

            <div
              className="slideshow__content"
              data-theme={slide.theme ?? 'dark'}
            >
              {slide.eyebrow && (
                <span className="slideshow__eyebrow">{slide.eyebrow}</span>
              )}
              <h2 className="slideshow__title">{slide.title}</h2>
              {slide.subtitle && (
                <p className="slideshow__subtitle">{slide.subtitle}</p>
              )}
              {(slide.ctaLabel && slide.ctaUrl) ||
              (slide.secondaryCtaLabel && slide.secondaryCtaUrl) ? (
                <div className="slideshow__ctas">
                  {slide.ctaLabel && slide.ctaUrl && (
                    <Link to={slide.ctaUrl} className="slideshow__cta">
                      {slide.ctaLabel}
                    </Link>
                  )}
                  {slide.secondaryCtaLabel && slide.secondaryCtaUrl && (
                    <Link
                      to={slide.secondaryCtaUrl}
                      className="slideshow__cta slideshow__cta--secondary"
                    >
                      {slide.secondaryCtaLabel}
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="slideshow__arrow slideshow__arrow--prev"
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M11 4.5 6.5 9l4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="slideshow__arrow slideshow__arrow--next"
            onClick={goNext}
            aria-label="Next slide"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M7 4.5 11.5 9 7 13.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="slideshow__tabs" role="tablist" aria-label="Slides">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                ref={(el) => (tabRefs.current[index] = el)}
                type="button"
                role="tab"
                className="slideshow__tab"
                aria-selected={index === activeIndex}
                tabIndex={index === activeIndex ? 0 : -1}
                data-active={index === activeIndex}
                onClick={() => goTo(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {slide.navLabel ?? slide.title}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}