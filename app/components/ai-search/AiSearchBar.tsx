import {forwardRef, useEffect, useState, useRef, useCallback} from "react";
import svgPaths from "./svg-paths";

const DEFAULT_SUGGESTIONS = ["anything with AI", "iPhone 17", "Robot Vacuum", "LG Qned AI"];
const ITEM_HEIGHT = 16;
const CYCLE_MS = 2200;

function AISearchIcon() {
  return (
    <div className="overflow-clip relative size-[15px] shrink-0">
      <div className="absolute inset-[12.77%_12.61%_12.5%_12.5%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          height="17.9354"
          preserveAspectRatio="none"
          viewBox="0 0 17.9726 17.9354"
          width="17.9726"
        >
          <path d={svgPaths.p3f87f980} fill="#666F7F" />
        </svg>
      </div>
      <div className="absolute inset-[4.17%_8.33%_83.33%_79.17%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          height="3"
          preserveAspectRatio="none"
          viewBox="0 0 3 3"
          width="3"
        >
          <path d={svgPaths.p20021000} fill="#666F7F" />
        </svg>
      </div>
      <div
        className="absolute bottom-[58.33%] flex items-center justify-center left-1/2 right-[16.67%] top-[8.33%]"
        style={{ containerType: "size" }}
      >
        <div className="flex-none h-[100cqh] rotate-180 w-[100cqw]">
          <svg
            className="block size-full"
            fill="none"
            height="8"
            preserveAspectRatio="none"
            viewBox="0 0 8 8"
            width="8"
          >
            <path d={svgPaths.p3872200} fill="#666F7F" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function CloseIconSvg() {
  return (
    <svg
      className="block size-full"
      fill="none"
      height="13.5"
      preserveAspectRatio="none"
      viewBox="0 0 13.5 13.5"
      width="13.5"
    >
      <path
        d={svgPaths.pd9eea00}
        stroke="#666F7F"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function BlinkingCursor() {
  return (
    <span
      className="inline-block w-[1.5px] h-[13px] bg-[#559bf1] shrink-0 rounded-[1px]"
      style={{ animation: "blink 1s step-end infinite" }}
    />
  );
}

function AnimatedPlaceholder({
  index,
  suggestions,
}: {
  index: number;
  suggestions: string[];
}) {
  return (
    <div className="overflow-hidden shrink-0" style={{ height: ITEM_HEIGHT }}>
      <div
        className="transition-transform duration-500 ease-in-out"
        style={{ transform: `translateY(-${index * ITEM_HEIGHT}px)` }}
      >
        {suggestions.map((s) => (
          <div
            key={s}
            className="flex items-center whitespace-nowrap"
            style={{
              height: ITEM_HEIGHT,
              fontFamily: "'Rubik', sans-serif",
              fontSize: 13,
              lineHeight: "16px",
              color: "#7f8999",
              fontWeight: 400,
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

const pillBg = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 620 64' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.11999999731779099'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(36.141 -3.4171e-14 8.2601e-14 12.373 310 32)'><stop stop-color='rgba(255,255,255,0)' offset='0.45'/><stop stop-color='rgba(255,255,255,1)' offset='1'/></radialGradient></defs></svg>\"), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.053) 0%, rgba(188, 182, 237, 0.22) 100%)",
};

// Resting shadow: a soft, tight, low-opacity outline so the pill reads
// as a raised element on a plain white header without leaving a visible
// gray smear/line trailing below it (the previous version used the
// Figma prototype's shadow unconditionally here — 17-25px blur/spread
// values tuned for a colored/dark background — which is what was
// showing up as a stray shadow line under the search bar on our plain
// white header row).
const restingShadow =
  "0px 1px 2px 0px rgba(16,24,40,0.06), 0px 1px 3px 0px rgba(16,24,40,0.08)";

// Slightly more lift on focus, still much lighter than the original
// always-on shadow.
const focusedShadow =
  "0px 2px 4px 0px rgba(16,24,40,0.06), 0px 4px 10px 0px rgba(85,155,241,0.12)";

export interface AiSearchBarProps {
  /** Controlled input value — this component no longer owns its own text state. */
  value: string;
  /** Fired on every keystroke (and on clear) with the new value. */
  onQueryChange: (value: string) => void;
  /** Fired when the user submits a search query (Enter key). */
  onSearch?: (query: string) => void;
  /** Fired when the input receives focus — wire this to opening a results panel. */
  onFocus?: () => void;
  /** Placeholder suggestions to cycle through while empty. */
  suggestions?: string[];
  className?: string;
}

/**
 * Forwards a ref to the root div (not the inner <input>) so a parent can
 * use it for click-outside detection on an accompanying results panel —
 * see SearchPanel's `triggerRef`.
 */
export const AiSearchBar = forwardRef<HTMLDivElement, AiSearchBarProps>(
  function AiSearchBar(
    {
      value,
      onQueryChange,
      onSearch,
      onFocus,
      suggestions = DEFAULT_SUGGESTIONS,
      className = "",
    },
    ref,
  ) {
    // Local UI-only state — the actual text lives in the `value` prop now.
    const [focused, setFocused] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (value.length > 0) return;
      const id = setInterval(() => {
        setSuggestionIndex((i) => (i + 1) % suggestions.length);
      }, CYCLE_MS);
      return () => clearInterval(id);
    }, [value, suggestions.length]);

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onQueryChange("");
        inputRef.current?.focus();
      },
      [onQueryChange],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim()) {
        onSearch?.(value.trim());
      }
      if (e.key === "Escape") {
        onQueryChange("");
        inputRef.current?.blur();
      }
    };

    const isTyping = value.length > 0;
    const showX = focused || isTyping;

    return (
      <div
        ref={ref}
        className={`relative h-[36px] w-full max-w-[260px] cursor-text ${className}`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Pill background layers */}
        <div className="absolute inset-0 rounded-[999px]" style={pillBg} />
        <div
          aria-hidden
          className="absolute border-2 border-[rgba(193,193,193,0.6)] border-solid inset-0 rounded-[999px] transition-shadow duration-150"
          style={{
            boxShadow: focused ? focusedShadow : restingShadow,
          }}
        />
        <div
          className="absolute inset-0 rounded-[999px]"
          style={{
            boxShadow:
              "inset 0px -1px 18px 0px rgba(255,255,255,0.4), inset 0px -1px 14px 0px rgba(255,255,255,0.56), inset 0px 0px 16px 0px rgba(0,0,0,0.02), inset 0px -4px 8px 0px rgba(0,0,0,0.03), inset 0px -1px 2px 0px rgba(0,0,0,0.02), inset 0px -0.5px 0.5px 0px rgba(0,0,0,0.04), inset 0px 10px 12px 0px rgba(0,0,0,0.04)",
          }}
        />

        {/* Content row */}
        <div className="absolute inset-0 flex items-center px-[12px] gap-[6px]">
          <AISearchIcon />

          {/* Text zone */}
          <div className="relative flex-1 flex items-center min-w-0 gap-[1px]">
            {isTyping ? (
              <>
                <span
                  className="whitespace-nowrap shrink-0"
                  style={{
                    fontFamily: "'Rubik', sans-serif",
                    fontSize: 13,
                    lineHeight: "16px",
                    color: "#0b0c0e",
                    fontWeight: 400,
                  }}
                >
                  {value}
                </span>
                {focused && <BlinkingCursor />}
              </>
            ) : (
              <>
                {focused ? (
                  <BlinkingCursor />
                ) : (
                  <span
                    className="whitespace-nowrap shrink-0 mr-[4px]"
                    style={{
                      fontFamily: "'Rubik', sans-serif",
                      fontSize: 13,
                      lineHeight: "16px",
                      color: "#7f8999",
                      fontWeight: 400,
                    }}
                  >
                    Search
                  </span>
                )}
                <AnimatedPlaceholder index={suggestionIndex} suggestions={suggestions} />
              </>
            )}

            {/* Real input (invisible, captures keyboard) */}
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => {
                setFocused(true);
                onFocus?.();
              }}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              aria-label="AI Search"
              className="absolute inset-0 opacity-0 cursor-text w-full bg-transparent"
              style={{ caretColor: "transparent" }}
            />
          </div>

          {/* Clear button */}
          <button
            className={`relative shrink-0 size-[15px] cursor-pointer overflow-hidden transition-opacity duration-150 ${
              showX ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onMouseDown={handleClear}
            aria-label="Clear search"
            tabIndex={showX ? 0 : -1}
          >
            <div className="absolute inset-1/4">
              <div className="absolute inset-[-6.25%]">
                <CloseIconSvg />
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  },
);