import {useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {AiSearchBar} from '~/snippets/AiSearchBar';
import '~/assets/search-bar.css';
import {
  SearchPanel,
  readRecentSearches,
  writeRecentSearches,
  MAX_RECENT_SEARCHES,
} from '~/sections/SearchPanel';

export function HeaderSearch({
  size = 'default',
}: {
  /**
   * "default" — full-width pill, its own row (mobile row below the
   * header, or any standalone placement).
   * "compact" — sized to sit inline next to nav links/icons, e.g. in
   * the single Nike-style desktop header row.
   */
  size?: 'default' | 'compact';
}) {
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
    <div
      className={`search-trigger flex items-center ${
        size === 'compact' ? 'shrink-0' : 'w-full'
      }`}
    >
      {/* AiSearchBar owns its own width per `size` (fixed for compact,
          w-full+max-w for default) — no width class needed here. */}
      <AiSearchBar
        ref={containerRef}
        size={size}
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