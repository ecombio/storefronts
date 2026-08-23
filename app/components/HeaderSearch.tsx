import {useRef, useState} from 'react';
import {Search, Mic, X} from 'lucide-react';
import {SearchOverlay} from './SearchOverlay';

/**
 * The search trigger button that lives in the header row. Owns only
 * open/closed state and the trigger's own ref — everything about the
 * overlay itself (backdrop, panel, results, trending list) lives in
 * SearchOverlay, which this renders and controls.
 *
 * The overlay now covers the FULL viewport from the very top (matching
 * nike.com's pattern) rather than starting below this header row — so
 * when open, this trigger visually sits underneath the overlay's own
 * dimmed backdrop instead of poking out above a panel that starts below
 * it. See SearchOverlay for the positioning fix.
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
          Search for products
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