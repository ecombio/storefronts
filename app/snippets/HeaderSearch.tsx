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
      <AiSearchBar
        ref={containerRef}
        className="w-full"
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