import { forwardRef, useState, useEffect, useRef, useCallback } from "react";
// Icon path data lives alongside this file in snippets/.
import svgPaths from "./ai-search-svg-paths";

const DEFAULT_SUGGESTIONS = ["anything with AI", "iPhone 17", "Robot Vacuum", "LG Qned AI"];

type Size = "default" | "compact";

// Per-size tuning. "default" is the original full pill (centerpiece of
// its own row). "compact" is sized to sit inline next to nav links and
// icons, mirroring Nike's header where search shares a row with the
// primary nav instead of owning the whole row.
const SIZE_CONFIG: Record<
  Size,
  {
    height: string;
    // Full width class, including the sizing strategy. Both variants
    // now fill whatever definite-width ancestor they're given (w-full,
    // "default" additionally capped by its own max-w). That ancestor
    // MUST actually resolve to a real width — a flex-1 + min-w-0 chain
    // up to something with real bounds (the page, a sized container),
    // not a shrink-to-fit flex row — because everything inside this
    // pill is absolutely positioned (see the content row below), so
    // there's no in-flow content to size it independently. If a
    // caller places "compact" inside a shrink-to-fit ancestor with no
    // flex-grow, it will collapse toward 0 width; give it an explicit
    // width wrapper at that call site instead.
    widthClass: string;
    paddingX: string;
    gap: string;
    iconSize: number;
    itemHeight: number;
    fontSize: number;
    lineHeight: string;
    clearSize: number;
  }
> = {
  default: {
    height: "h-[64px]",
    widthClass: "w-full max-w-[620px]",
    paddingX: "px-[28px]",
    gap: "gap-[8px]",
    iconSize: 24,
    itemHeight: 22,
    fontSize: 16,
    lineHeight: "18px",
    clearSize: 24,
  },
  compact: {
    height: "h-[40px]",
    // CHANGED from a hardcoded "w-[260px] shrink-0". That fixed width
    // permanently capped compact at 260px regardless of how much room
    // a parent layout (e.g. HeaderLayoutBackMarket) tries to give it
    // via flex-1. Now it fills its parent instead — see the widthClass
    // comment above for what the parent chain needs to provide for
    // this to actually take effect.
    widthClass: "w-full min-w-0",
    paddingX: "px-[14px]",
    gap: "gap-[6px]",
    iconSize: 18,
    itemHeight: 17,
    fontSize: 13,
    lineHeight: "16px",
    clearSize: 16,
  },
};

function AISearchIcon({ size }: { size: number }) {
  return (
    <div className="overflow-clip relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-[12.77%_12.61%_12.5%_12.5%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 17.9726 17.9354"
        >
          <path d={svgPaths.p3f87f980} fill="#666F7F" />
        </svg>
      </div>
      <div className="absolute inset-[4.17%_8.33%_83.33%_79.17%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 3 3"
        >
          <path d={svgPaths.p20021000} fill="#666F7F" />
        </svg>
      </div>
      <div
        className="absolute bottom-[58.33%] flex items-center justify-center left-1/2 right-[16.67%] top-[8.33%]"
        style={{ containerType: "size" }}
      >
        <div className="flex-none h-[100cqh] rotate-180 w-[100cqw]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
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
      preserveAspectRatio="none"
      viewBox="0 0 13.5 13.5"
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

function BlinkingCursor({ compact }: { compact: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-[1px] bg-[#559bf1] ${
        compact ? "w-[1.5px] h-[14px]" : "w-[2px] h-[18px]"
      }`}
      style={{ animation: "blink 1s step-end infinite" }}
    />
  );
}

function AnimatedPlaceholder({
  index,
  suggestions,
  itemHeight,
  fontSize,
  lineHeight,
}: {
  index: number;
  suggestions: string[];
  itemHeight: number;
  fontSize: number;
  lineHeight: string;
}) {
  return (
    // Was `shrink-0`, which told flexbox to never shrink this below its
    // natural content width — so a suggestion wider than the available
    // pill space (compact mode especially) just bled out past the pill
    // edge instead of being constrained. `min-w-0 flex-1` lets it take
    // only the space actually left after the "Search" label, and
    // `overflow-hidden` + each item's `text-ellipsis` below then clip
    // anything still too long, with "…" instead of a hard cutoff.
    <div className="overflow-hidden min-w-0 flex-1" style={{ height: itemHeight }}>
      <div
        className="transition-transform duration-500 ease-in-out"
        style={{ transform: `translateY(-${index * itemHeight}px)` }}
      >
        {suggestions.map((s) => (
          <div
            key={s}
            className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis"
            style={{
              height: itemHeight,
              fontFamily: "'Rubik', sans-serif",
              fontSize,
              lineHeight,
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
    "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 620 64' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0'height='100%' width='100%' fill='url(%23grad)' opacity='0.11999999731779099'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse'cx='0' cy='0' r='10' gradientTransform='matrix(36.141 -3.4171e-14 8.2601e-14 12.373 310 32)'><stop stop-color='rgba(255,255,255,0)' offset='0.45'/><stop stop-color='rgba(255,255,255,1)' offset='1'/></radialGradient></defs></svg>\"), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.053) 0%, rgba(188, 182, 237, 0.22) 100%)",
};

interface AiSearchBarProps {
  /** Controlled input value — lift this to the same state SearchPanel reads as `term`. */
  value: string;
  /** Called on every keystroke. Wire this to the same setter you pass SearchPanel as `onTermChange`. */
  onQueryChange: (value: string) => void;
  /** Called when the user submits a search query (Enter key). Wire this to what you pass SearchPanel as `onNavigate`. */
  onSearch: (query: string) => void;
  /** Optional — fires when the input gains focus. Use this to open SearchPanel. */
  onFocus?: () => void;
  /** Optional external ref for imperative focus (e.g. SearchPanel's own copy of the bar). */
  inputRef?: React.RefObject<HTMLInputElement>;
  /** Placeholder suggestions to cycle through */
  suggestions?: string[];
  className?: string;
  /**
   * "default" — full pill, the centerpiece of its own row.
   * "compact" — sized to sit inline next to nav links/icons, e.g. in a
   * single Nike-style header row. Defaults to "default" so existing
   * standalone usage (mobile row, SearchPanel's own input) is untouched.
   */
  size?: Size;
}

/**
 * Forwards a ref to the root div (not the inner <input>) so a parent
 * (HeaderSearch) can use it for click-outside detection via
 * SearchPanel's `triggerRef` prop — mirrors SearchBar's forwardRef.
 */
export const AiSearchBar = forwardRef<HTMLDivElement, AiSearchBarProps>(
  function AiSearchBar(
    {
      value,
      onQueryChange,
      onSearch,
      onFocus,
      inputRef: externalInputRef,
      suggestions = DEFAULT_SUGGESTIONS,
      className = "",
      size = "default",
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const internalInputRef = useRef<HTMLInputElement>(null);
    const inputRef = externalInputRef ?? internalInputRef;
    const cfg = SIZE_CONFIG[size];
    const compact = size === "compact";

    useEffect(() => {
      if (value.length > 0) return;
      const id = setInterval(() => {
        setSuggestionIndex((i) => (i + 1) % suggestions.length);
      }, 2200);
      return () => clearInterval(id);
    }, [value, suggestions.length]);

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onQueryChange("");
        inputRef.current?.focus();
      },
      [inputRef, onQueryChange],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim()) {
        onSearch(value.trim());
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
        className={`relative cursor-text ${cfg.height} ${cfg.widthClass} ${className}`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Pill background layers */}
        <div className="absolute inset-0 rounded-[999px]" style={pillBg} />
        <div
          aria-hidden
          className="absolute border-2 border-[rgba(193,193,193,0.6)] border-solid inset-0 rounded-[999px]"
          style={{
            boxShadow: compact
              ? "0px 2px 6px 0px rgba(16,24,40,0.06)"
              : "0px 7px 15px 0px rgba(176,194,250,0.2), 0px 4px 10.3px 0px rgba(0,0,0,0.03), 0px 17px 25.8px 0px rgba(0,0,0,0.06), 0px 4px 6px 0px rgba(255,255,255,0.32)",
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
        <div className={`absolute inset-0 flex items-center ${cfg.paddingX} ${cfg.gap}`}>
          <AISearchIcon size={cfg.iconSize} />

          {/* Text zone */}
          <div className="relative flex-1 flex items-center min-w-0 gap-[1px]">
            {isTyping ? (
              <>
                <span
                  className="whitespace-nowrap shrink-0"
                  style={{
                    fontFamily: "'Rubik', sans-serif",
                    fontSize: cfg.fontSize,
                    lineHeight: cfg.lineHeight,
                    color: "#0b0c0e",
                    fontWeight: 400,
                  }}
                >
                  {value}
                </span>
                {focused && <BlinkingCursor compact={compact} />}
              </>
            ) : (
              <>
                {focused ? (
                  <BlinkingCursor compact={compact} />
                ) : (
                  <span
                    className="whitespace-nowrap shrink-0 mr-[4px]"
                    style={{
                      fontFamily: "'Rubik', sans-serif",
                      fontSize: cfg.fontSize,
                      lineHeight: cfg.lineHeight,
                      color: "#7f8999",
                      fontWeight: 400,
                    }}
                  >
                    Search
                  </span>
                )}
                {/* Was gated behind `!compact`, which silently disabled the
                    animated/cycling placeholder whenever this bar rendered
                    in compact mode (e.g. the single-row desktop header) —
                    that gate has been removed so the animation renders at
                    both sizes. */}
                <AnimatedPlaceholder
                  index={suggestionIndex}
                  suggestions={suggestions}
                  itemHeight={cfg.itemHeight}
                  fontSize={cfg.fontSize}
                  lineHeight={cfg.lineHeight}
                />
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
            className={`relative shrink-0 cursor-pointer overflow-hidden transition-opacity duration-150 ${
              showX ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ width: cfg.clearSize, height: cfg.clearSize }}
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