import {useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {AiSearchBar} from '~/snippets/AiSearchBar';
import {TRENDING_SEARCH_TERMS} from '~/config/Header.constants';
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
   * "compact" — sized to sit inline next to nav links/icons. Still
   * flex-growable now (see wrapper below) — the parent layout decides
   * how much room it actually gets; "compact" just means it's allowed
   * to sit next to other inline elements instead of forcing its own
   * row, not that it's pinned to a small fixed width.
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
    // CHANGED: was `size === 'compact' ? 'shrink-0' : 'w-full'`, which
    // actively blocked compact from ever growing — shrink-0 fights a
    // flex-1 parent instead of cooperating with it. Now both variants
    // flex-grow to fill whatever their parent gives them (min-w-0 is
    // required alongside flex-1, or the browser's default
    // min-width: auto stops it from shrinking/growing past its
    // content's intrinsic width). A parent that wants it to stay
    // small can still do that by not giving it flex-1 room in the
    // first place — the constraint belongs at the layout level now,
    // not hardcoded here.
    <div className="search-trigger flex min-w-0 flex-1 items-center">
      {/* AiSearchBar still receives `size` for internal padding/icon-size
          differences, but its ROOT width now needs to be w-full so it
          fills this wrapper instead of using a fixed width per size.
          See AiSearchBar.tsx — that's the other half of this fix. */}
      <AiSearchBar
        ref={containerRef}
        size={size}
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