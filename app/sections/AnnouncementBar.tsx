import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, X} from 'lucide-react';
import {
  ANNOUNCEMENT_AUTOROTATE,
  ANNOUNCEMENT_AUTOROTATE_SPEED_MS,
  ANNOUNCEMENT_ENABLE_CLOSE,
  ANNOUNCEMENT_SLIDES,
  type AnnouncementSlideConfig,
} from '~/config/Header.constants';

const DISMISS_KEY = 'announcement_bar_dismissed';

export function AnnouncementBar() {
  const slides = ANNOUNCEMENT_SLIDES;
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);
  const rotateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ANNOUNCEMENT_ENABLE_CLOSE && sessionStorage.getItem(DISMISS_KEY) === 'true') {
      setDismissed(true);
    }
  }, []);

  function stopAuto() {
    if (rotateTimer.current) clearInterval(rotateTimer.current);
  }

  function startAuto() {
    if (ANNOUNCEMENT_AUTOROTATE && slides.length > 1) {
      rotateTimer.current = setInterval(() => {
        setIndex((i) => (i + 1) % slides.length);
      }, ANNOUNCEMENT_AUTOROTATE_SPEED_MS);
    }
  }

  useEffect(() => {
    startAuto();
    return stopAuto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  function goTo(next: number) {
    stopAuto();
    setIndex((next + slides.length) % slides.length);
    startAuto();
  }

  function handleClose() {
    stopAuto();
    setDismissed(true);
    if (ANNOUNCEMENT_ENABLE_CLOSE) sessionStorage.setItem(DISMISS_KEY, 'true');
  }

  if (dismissed || slides.length === 0) return null;

  const slide = slides[index];

  return (
    <div className="bg-[#0b2559] text-sm text-white">
      {/* Full width, no max-width cap — matches the header content row
          and HeaderUtility, which were updated the same way. */}
      <div className="relative mx-auto flex max-w-[var(--content-max-width)] items-center px-4 py-2">
        {slides.length > 1 && (
          <button
            aria-label="Previous announcement"
            onClick={() => goTo(index - 1)}
            className="shrink-0 rounded p-1 hover:bg-white/10"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div className="flex flex-1 items-center justify-center gap-3 font-semibold tracking-wide">
          <AnnouncementSlideContent slide={slide} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {slides.length > 1 && (
            <button
              aria-label="Next announcement"
              onClick={() => goTo(index + 1)}
              className="rounded p-1 hover:bg-white/10"
            >
              <ChevronRight size={16} />
            </button>
          )}
          {ANNOUNCEMENT_ENABLE_CLOSE && (
            <button aria-label="Dismiss" onClick={handleClose} className="rounded p-1 hover:bg-white/10">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnouncementSlideContent({slide}: {slide: AnnouncementSlideConfig}) {
  if (slide.type === 'announcement') {
    return slide.link ? (
      <a href={slide.link} className="border-b border-white/40 hover:border-white">
        {slide.text}
      </a>
    ) : (
      <p className="m-0">{slide.text}</p>
    );
  }
  return <CountdownContent slide={slide} />;
}

function CountdownContent({
  slide,
}: {
  slide: Extract<AnnouncementSlideConfig, {type: 'countdown'}>;
}) {
  const remainingMs = useCountdown(slide);

  // FIX: previously returned `null` while remainingMs was null (true on
  // initial SSR paint, before the client-side timer effect runs). That
  // made the announcement bar render with an empty content row on first
  // paint, then grow taller a moment later once the countdown populated
  // client-side — a real layout shift right at the point where the
  // white line was reported. Rendering an invisible placeholder of the
  // same shape reserves the final height from the very first paint, so
  // there's nothing for the countdown's arrival to shift.
  if (remainingMs === null) {
    return (
      <span className="invisible flex items-center gap-1" aria-hidden="true">
        {slide.label && <span>{slide.label}</span>}
        <Unit value="00" label="d" />
        <Sep />
        <Unit value="00" label="h" />
        <Sep />
        <Unit value="00" label="m" />
        <Sep />
        <Unit value="00" label="s" />
        {slide.buttonLabel && (
          <span className="ml-1 whitespace-nowrap rounded-full border px-3.5 py-1 text-xs font-semibold">
            {slide.buttonLabel}
          </span>
        )}
      </span>
    );
  }

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <>
      {slide.label && <span>{slide.label}</span>}
      <span className="flex items-center gap-1">
        <Unit value={pad(days)} label="d" />
        <Sep />
        <Unit value={pad(hours)} label="h" />
        <Sep />
        <Unit value={pad(minutes)} label="m" />
        <Sep />
        <Unit value={pad(seconds)} label="s" />
      </span>
      {slide.buttonLabel && slide.buttonLink && (
        <a
          href={slide.buttonLink}
          className="ml-1 whitespace-nowrap rounded-full border border-white/60 px-3.5 py-1 text-xs font-semibold hover:border-white hover:bg-white/15"
        >
          {slide.buttonLabel}
        </a>
      )}
    </>
  );
}

function Unit({value, label}: {value: string; label: string}) {
  return (
    <span>
      {value}
      <em className="ml-px text-[0.625rem] not-italic uppercase opacity-70">{label}</em>
    </span>
  );
}

function Sep() {
  return <span className="mx-0.5 opacity-60">:</span>;
}

function useCountdown(slide: Extract<AnnouncementSlideConfig, {type: 'countdown'}>) {
  const endMsRef = useRef<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (slide.countdownType === 'fixed') {
      endMsRef.current = slide.endDate
        ? new Date(slide.endDate.replace(/\//g, '-')).getTime()
        : null;
    } else {
      const storageKey = `ann_countdown_${slide.evergreenMinutes}`;
      const saved = sessionStorage.getItem(storageKey);
      const endMs = saved ? parseInt(saved, 10) : Date.now() + (slide.evergreenMinutes ?? 0) * 60_000;
      sessionStorage.setItem(storageKey, String(endMs));
      endMsRef.current = endMs;
    }

    function tick() {
      if (endMsRef.current === null) {
        setRemainingMs(null);
        return;
      }
      const diff = endMsRef.current - Date.now();
      setRemainingMs(diff > 0 ? diff : null);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.countdownType, slide.endDate, slide.evergreenMinutes]);

  return remainingMs;
}
