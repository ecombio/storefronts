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

// Maps 1:1 to sections/announcement-bar.liquid + assets/announcement-bar.js.
// Slide data lives in Header.constants.ts (ANNOUNCEMENT_SLIDES) as a
// stand-in for the theme editor's ann_1..ann_5 settings.
export function AnnouncementBar() {
  const slides = ANNOUNCEMENT_SLIDES;
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);
  const rotateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dismiss state is session-scoped, same as the theme's JS. Checked in an
  // effect (not lazy useState init) so this never runs during SSR.
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
      <div className="relative mx-auto flex max-w-[1400px] items-center px-4 py-2">
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

  // Real theme behavior on expiry: hide this slide's content, not the
  // whole bar — it stays in rotation, just renders blank.
  if (remainingMs === null) return null;

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

// Mirrors announcement-bar.js's countdown logic: fixed dates compute a
// plain end timestamp; evergreen durations are persisted to sessionStorage
// per visitor so a reload mid-session doesn't restart the clock. On expiry
// this returns null and STAYS null — it does not loop or reset. "Evergreen"
// only means the window length is fixed per-session, not that the
// countdown repeats forever.
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
