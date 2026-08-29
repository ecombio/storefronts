import {useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {SearchBar} from '~/snippets/SearchBar';
import '~/assets/search-bar.css';
import {
  SearchPanel,
  readRecentSearches,
  writeRecentSearches,
  MAX_RECENT_SEARCHES,
} from '~/sections/SearchPanel';

/**
 * The search trigger + results panel that live in the header row.
 *
 * SearchBar owns the visible input itself (typing, blinking cursor) —
 * same pill styling as AiSearchBar, but with a static "Search" label
 * instead of the cycling/typewriter placeholder. AiSearchBar itself is
 * left untouched/parked for now; swap this back to it later if the AI
 * framing comes back into play.
 *
 * This component owns the `open`/`term` state shared between SearchBar
 * and SearchPanel, plus "commit a search" (record as recent, navigate
 * to /search) — SearchPanel has no input or term state of its own;
 * it's fully driven from here.
 *
 * Width: this component's root is `w-full`, so it stretches to fill
 * whatever space its parent gives it — in Header.tsx that's the
 * `flex-1 justify-center` middle slot between the logo and the CTAs,
 * so the bar automatically grows or shrinks as that slot's available
 * width changes (e.g. if the logo or CTAs area changes size), instead
 * of sitting at a fixed pixel width. `max-w-2xl` on SearchBar's own
 * className is just a ceiling so it doesn't stretch edge-to-edge on
 * very wide screens — remove it if you want zero cap.
 *
 * NOTE / carried over from the AiSearchBar wiring:
 *  - There's no mic button — SearchBar's design doesn't have a slot
 *    for one.
 *  - Clicking a suggestion/recent-search chip inside SearchPanel no
 *    longer refocuses the input (that input used to live inside
 *    SearchPanel; now it's SearchBar, outside it). Minor known gap.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  function recordRecentSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const existing = readRecentSearches();
    const next = [
      trimmed,
      ...existing.filter((t) => t.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);
    writeRecentSearches(next);
  }

  function commitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    recordRecentSearch(trimmed);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  }

  return (
    <div className="search-trigger flex w-full items-center">
      <SearchBar
        ref={containerRef}
        className="w-full max-w-2xl"
        value={term}
        onQueryChange={setTerm}
        onFocus={() => setOpen(true)}
        onSearch={commitSearch}
      />

      <SearchPanel
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={containerRef}
        term={term}
        onTermChange={setTerm}
        onNavigate={commitSearch}
      />
    </div>
  );
}