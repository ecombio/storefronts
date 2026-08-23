import {useEffect, useState, useRef} from 'react';
import {Search, Mic, X} from 'lucide-react';
import {TypewriterEffect} from '~/components/ui/typewriter-effect';
import {TRENDING_SEARCH_TERMS} from './Header.constants';
import {SearchOverlay} from './SearchOverlay';
// Imported directly here (not wired through root.tsx) so the stylesheet
// travels with the component that actually uses it. Lives at
// app/styles/typewriter.css. Defines both .hs-tw-char (type-in sweep)
// and .hs-tw-char--vanish (disappear sweep), plus their keyframes.
import '~/styles/typewriter.css';

// How long to hold on a fully-typed word before it vanishes into the
// next one. TypewriterEffect types once and stops on mount — cycling it
// just means swapping its `key` on an interval, which forces a clean
// remount (fresh type-in) for the next term in TRENDING_SEARCH_TERMS.
const HOLD_MS = 1800;

// Must match `animation: hs-tw-vanish 260ms ...` in typewriter.css — this
// is how long we hold the outgoing word on screen as individual char
// spans before actually swapping to the next term. Per-character stagger
// adds on top of this so the last character has time to finish its own
// 260ms run before we cut over. Keep this in sync with the stylesheet;
// there's no single source of truth for the duration since JS needs the
// number and CSS needs the timing function.
const VANISH_MS = 260;
const VANISH_STAGGER_MS = 14;

/**
 * Cycles the installed Aceternity TypewriterEffect through
 * TRENDING_SEARCH_TERMS, one term at a time. Two phases per cycle:
 *  - 'typed': TypewriterEffect types the current word in and holds it.
 *    (Its characters get the .hs-tw-char CSS color sweep from
 *    typewriter.css as they appear.)
 *  - 'vanishing': we take over rendering (TypewriterEffect has no exit
 *    animation of its own) and render the same word as individual
 *    characters, each carrying .hs-tw-char--vanish from typewriter.css,
 *    before advancing to the next term.
 */
function CyclingTypewriter({terms}: {terms: string[]}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'typed' | 'vanishing'>('typed');

  const currentWord = terms[index % terms.length] ?? '';

  useEffect(() => {
    if (phase !== 'typed') return;
    const holdTimeout = setTimeout(() => setPhase('vanishing'), HOLD_MS);
    return () => clearTimeout(holdTimeout);
  }, [phase, index]);

  useEffect(() => {
    if (phase !== 'vanishing') return;
    // Last character starts its animation after (length - 1) stagger
    // steps, so wait that long plus the animation's own duration before
    // cutting over — otherwise longer words get truncated mid-vanish.
    const totalVanishMs =
      VANISH_MS + Math.max(0, currentWord.length - 1) * VANISH_STAGGER_MS;
    const vanishTimeout = setTimeout(() => {
      setIndex((i) => (i + 1) % terms.length);
      setPhase('typed');
    }, totalVanishMs);
    return () => clearTimeout(vanishTimeout);
  }, [phase, currentWord, terms.length]);

  // TypewriterEffect expects one array item PER WORD — it applies spacing
  // between separate entries, not within a single entry's text. Passing
  // a whole multi-word term as one entry ("electric mountain bikes") was
  // dropping the spaces visually, since the component's word-spacing
  // logic never saw more than one "word." Filter(Boolean) guards against
  // stray double-spaces in TRENDING_SEARCH_TERMS producing empty entries.
  const words = currentWord
    .split(' ')
    .filter(Boolean)
    .map((word) => ({
      text: word,
      className: 'text-gray-900 dark:text-gray-900',
    }));

  return (
    <span className="search-trigger__typewriter inline-flex items-baseline gap-1">
      <span className="search-trigger__typewriter-static text-gray-500 dark:text-gray-500">
        Search for
      </span>
      {phase === 'typed' ? (
        <TypewriterEffect
          key={index}
          words={words}
          // The component's default text sizing (text-base sm:text-xl
          // md:text-3xl lg:text-5xl font-bold text-center) is built for a
          // hero, not an inline search placeholder — each breakpoint has
          // to be explicitly overridden since Tailwind-merge only resolves
          // conflicts within the same breakpoint variant.
          className="!text-sm sm:!text-sm md:!text-sm lg:!text-sm !font-normal !text-left"
          // Same story for the cursor: default is h-4 md:h-6 lg:h-10
          // bg-blue-500, sized for large hero text.
          cursorClassName="!h-4 sm:!h-4 md:!h-4 lg:!h-4 !bg-gray-400"
        />
      ) : (
        <span
          className="search-trigger__typewriter-vanishing inline-flex text-sm font-normal"
          aria-hidden="true"
        >
          {currentWord.split('').map((char, i) => (
            <span
              key={i}
              className="hs-tw-char--vanish"
              style={{animationDelay: `${i * VANISH_STAGGER_MS}ms`}}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/**
 * The search trigger button that lives in the header row. Owns only
 * open/closed state and the trigger's own ref — everything about the
 * overlay itself (backdrop, panel, results, trending list) lives in
 * SearchOverlay, which this renders and controls.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="search-trigger flex flex-1 items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="search-trigger__button flex h-11 w-full max-w-2xl items-center rounded-[14px] border-[1.5px] border-[#e5e3de] bg-white pl-3 pr-[3px] text-left transition-colors focus-within:border-[#2563eb] hover:border-[#d6d3cc]"
      >
        <span
          className="search-trigger__placeholder h-full flex-1 truncate text-[15px] leading-[44px] text-[#6b6860]"
          aria-hidden="true"
        >
          <CyclingTypewriter terms={TRENDING_SEARCH_TERMS} />
        </span>
        <span className="sr-only">Search for products</span>
        <span className="search-trigger__clear mr-0.5 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[#6b6860] transition-colors hover:bg-[#f0ede8] hover:text-[#1a1a1a]">
          <X size={14} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span className="search-trigger__mic mr-0.5 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[#6b6860] transition-colors hover:bg-[#f0ede8] hover:text-[#1a1a1a]">
          <Mic size={16} aria-hidden="true" />
        </span>
        <span className="search-trigger__submit flex h-[38px] w-11 items-center justify-center rounded-[10px] bg-[#1a1a1a] text-white">
          <Search size={18} aria-hidden="true" />
        </span>
      </button>

      <SearchOverlay
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
      />
    </div>
  );
}