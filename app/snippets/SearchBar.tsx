import {forwardRef, useState, useRef, useCallback} from "react";
// Reuses the existing icon path data rather than duplicating it — adjust
// this import if snippets/ and components/ai-search/ aren't siblings
// under ~/ in your tree.
import svgPaths from "~/components/ai-search/svg-paths";

/**
 * A plain search pill, styled to match AiSearchBar (same pill
 * background, shadows, icon, blinking cursor, clear button) but
 * without the AI-search framing or the cycling/typewriter placeholder
 * suggestions — this always shows a static "Search" label when empty.
 *
 * AiSearchBar itself is left untouched/parked for now; this is a
 * separate component so the two can diverge independently.
 */

function SearchIcon() {
  return (
    <div className="overflow-clip relative size-[22px] shrink-0">
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

const pillBg = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 620 64' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='0.11999999731779099'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(36.141 -3.4171e-14 8.2601e-14 12.373 310 32)'><stop stop-color='rgba(255,255,255,0)' offset='0.45'/><stop stop-color='rgba(255,255,255,1)' offset='1'/></radialGradient></defs></svg>\"), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.053) 0%, rgba(188, 182, 237, 0.22) 100%)",
};

// Same tuned focus shadow as AiSearchBar — a soft, tight, low-opacity
// glow so the pill reads as raised only once it's actually focused.
const focusedShadow =
  "0px 2px 4px 0px rgba(16,24,40,0.06), 0px 4px 10px 0px rgba(85,155,241,0.12)";

/**
 * Combines multiple refs (callback or object) into a single ref callback,
 * so a single DOM node can be wired up to more than one ref at once
 * (e.g. this component's own internal input ref, plus a ref a parent
 * passes in via `inputRef`).
 */
function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (node: T | null) => void {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    }
  };
}

export interface SearchBarProps {
  /** Controlled input value. */
  value: string;
  /** Fired on every keystroke (and on clear) with the new value. */
  onQueryChange: (value: string) => void;
  /** Fired when the user submits a search query (Enter key). */
  onSearch?: (query: string) => void;
  /** Fired when the input receives focus — wire this to opening a results panel. */
  onFocus?: () => void;
  className?: string;
  /**
   * Ref to the underlying <input>, for callers that need to imperatively
   * focus it — e.g. SearchPanel focusing its own copy of the bar when it
   * opens. Separate from the forwarded root-div ref (below), which is
   * used for click-outside detection instead.
   */
  inputRef?: React.Ref<HTMLInputElement>;
  /** Autofocus the input on mount — used by SearchPanel's copy of the bar. */
  autoFocus?: boolean;
}

/**
 * Forwards a ref to the root div (not the inner <input>) so a parent can
 * use it for click-outside detection on an accompanying results panel.
 * Use the separate `inputRef` prop if you need to focus the input itself.
 *
 * No max-width is set here by default — width (including any max-width
 * cap) is entirely the caller's responsibility via `className`. This
 * used to hardcode `max-w-[260px]` into the base className alongside
 * `w-full`, which meant a caller passing e.g. `max-w-2xl` was fighting
 * an equal-specificity Tailwind utility baked in here; which one won
 * was decided by Tailwind's compiled stylesheet order, not by anything
 * in this component's control. `w-full` alone lets the bar fill
 * whatever box the caller gives it, capped by whatever max-width (if
 * any) the caller's className specifies.
 */
export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      onQueryChange,
      onSearch,
      onFocus,
      className = "",
      inputRef,
      autoFocus,
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const internalInputRef = useRef<HTMLInputElement>(null);

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onQueryChange("");
        internalInputRef.current?.focus();
      },
      [onQueryChange],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim()) {
        onSearch?.(value.trim());
      }
      if (e.key === "Escape") {
        onQueryChange("");
        internalInputRef.current?.blur();
      }
    };

    const isTyping = value.length > 0;
    const showX = focused || isTyping;

    return (
      <div
        ref={ref}
        className={`relative h-[36px] w-full cursor-text ${className}`}
        onClick={() => internalInputRef.current?.focus()}
      >
        {/* Pill background layers */}
        <div className="absolute inset-0 rounded-[999px]" style={pillBg} />
        <div
          aria-hidden
          className="absolute border-2 border-[rgba(193,193,193,0.6)] border-solid inset-0 rounded-[999px] transition-shadow duration-150"
          style={{
            // No shadow at rest — the border ring alone is enough there.
            // The soft glow only appears on focus.
            boxShadow: focused ? focusedShadow : 'none',
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
          <SearchIcon />

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
            ) : focused ? (
              <BlinkingCursor />
            ) : (
              // Static "Search" label — no cycling/typewriter suggestions.
              <span
                className="whitespace-nowrap shrink-0"
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

            {/* Real input (invisible, captures keyboard) */}
            <input
              ref={mergeRefs(internalInputRef, inputRef)}
              autoFocus={autoFocus}
              type="text"
              value={value}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => {
                setFocused(true);
                onFocus?.();
              }}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              aria-label="Search"
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