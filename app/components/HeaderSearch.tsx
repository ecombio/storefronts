import {useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {AiSearchBar} from '~/components/ai-search/AiSearchBar';
import '~/components/ai-search/ai-search.css';
import {TRENDING_SEARCH_TERMS} from './Header.constants';
import {
  SearchPanel,
  readRecentSearches,
  writeRecentSearches,
  MAX_RECENT_SEARCHES,
} from './SearchPanel';

/**
 * The search trigger + results panel that live in the header row.
 *
 * AiSearchBar owns the visible input itself (typing, blinking cursor,
 * cycling placeholder). This component owns the `open`/`term` state
 * shared between AiSearchBar and SearchPanel, plus "commit a search"
 * (record as recent, navigate to /search) — SearchPanel no longer has
 * its own input or term state; it's fully driven from here.
 *
 * NOTE / known changes from the previous version of this file:
 *  - The old CyclingTypewriter (custom type-in/vanish animation) is
 *    gone — AiSearchBar has its own built-in cycling placeholder
 *    (a slot-machine-style vertical swap) from the Figma Make
 *    prototype, and the two aren't combined.
 *  - There's no mic button — AiSearchBar's design doesn't have a slot
 *    for one. If voice search matters, that needs to be added to
 *    AiSearchBar itself.
 *  - AiSearchBar is visually a tall (64px), fully rounded glassmorphic
 *    pill per the Figma prototype — quite different from the previous
 *    44px bordered pill here. It will likely look oversized in the
 *    current header row until it gets a sizing/style pass; not
 *    addressed in this wiring step.
 *  - Clicking a suggestion/recent-search chip inside SearchPanel no
 *    longer refocuses the input (that input used to live inside
 *    SearchPanel; now it's AiSearchBar, outside it). Minor known gap.
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
    <div className="search-trigger flex flex-1 items-center">
      <AiSearchBar
        ref={containerRef}
        className="max-w-2xl"
        value={term}
        onQueryChange={setTerm}
        onFocus={() => setOpen(true)}
        onSearch={commitSearch}
        suggestions={TRENDING_SEARCH_TERMS}
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
