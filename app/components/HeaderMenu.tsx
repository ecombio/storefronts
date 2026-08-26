import {useEffect, useRef, useState} from 'react';
import {NavLink} from 'react-router';
import {useAside} from '~/components/Aside';
import type {HeaderProps, Viewport} from './Header';
import {FALLBACK_HEADER_MENU, MEGA_MENU_CLOSE_DELAY, resolveUrl} from './Header.constants';
import {MenuDrawer} from './MenuDrawer';
import {HeaderMenuOnSale} from './HeaderMenuOnSale';

function navLinkClass({isActive, isPending}: {isActive: boolean; isPending: boolean}) {
  return [
    'text-gray-800 hover:text-gray-950',
    isActive ? 'font-semibold text-gray-950' : '',
    isPending ? 'text-gray-400' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
  collectionImages,
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
  collectionImages?: HeaderProps['collectionImages'];
}) {
  const {close} = useAside();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [panelTop, setPanelTop] = useState(0);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Was HTMLDivElement when this owned its own wrapping row; now points
  // at the <nav> itself since that row no longer exists here.
  const navWrapRef = useRef<HTMLElement>(null);

  const items = (menu || FALLBACK_HEADER_MENU).items;
  const activeItem = items.find((item) => item.id === activeItemId);

  function scheduleClose() {
    closeTimeout.current = setTimeout(() => setActiveItemId(null), MEGA_MENU_CLOSE_DELAY);
  }

  function cancelClose() {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }

  // Mirrors showcase.js: while a drawer is open, keep panelTop pinned to
  // the header row's bottom edge (so the portaled backdrop never covers
  // the logo/search row above it, and lines up exactly with
  // DrawerPanel's own `top-full`, which resolves against that same row
  // via `data-header-search-row` — see the comment on that div in
  // Header.tsx). Close on scroll (page moving under a fixed panel reads
  // as broken, same reasoning as SearchBar's onScroll in Header.tsx),
  // and close on Escape.
  //
  // NOTE: we deliberately measure off the row (`[data-header-search-row]`),
  // not off `navWrapRef` itself. The <nav> is just one flex child among
  // several (logo, nav, search, ctas) inside an `items-center` row, so
  // when it's shorter than its siblings it's vertically centered and its
  // own `bottom` sits *above* the row's real bottom edge. Measuring off
  // the row instead keeps this in sync with DrawerPanel's `top-full` and
  // avoids a gap between the backdrop and the panel.
  useEffect(() => {
    if (!activeItemId) return;

    function updatePanelTop() {
      const row = navWrapRef.current?.closest<HTMLElement>('[data-header-search-row]');
      if (row) setPanelTop(row.getBoundingClientRect().bottom);
    }
    updatePanelTop();

    function onScroll() {
      setActiveItemId(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveItemId(null);
    }

    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', updatePanelTop);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updatePanelTop);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeItemId]);

  if (viewport === 'mobile') {
    return (
      <nav className="flex flex-col gap-3 p-4" role="navigation">
        <NavLink end onClick={close} prefetch="intent" to="/" className={navLinkClass}>
          Home
        </NavLink>
        {items.map((item) => {
          if (!item.url) return null;
          const url = resolveUrl(item.url, publicStoreDomain, primaryDomainUrl);
          return (
            <NavLink
              key={item.id}
              end
              onClick={close}
              prefetch="intent"
              to={url}
              className={navLinkClass}
            >
              {item.title}
            </NavLink>
          );
        })}
      </nav>
    );
  }

  // Desktop: no more own wrapping/bordered row — this renders as a
  // plain inline <nav>, sized to content, so Header.tsx can lay it out
  // alongside the logo/search/ctas in one single row. The mega-menu
  // drawer is still portaled separately and positioned off the header
  // row (see updatePanelTop above), not off navWrapRef directly.
  return (
    <>
      <nav
        ref={navWrapRef}
        className="flex shrink-0 items-center gap-6 text-sm font-medium"
        role="navigation"
        onMouseLeave={scheduleClose}
        onMouseEnter={cancelClose}
      >
        <HeaderMenuOnSale />
        {items.map((item) => {
          if (!item.url) return null;
          const url = resolveUrl(item.url, publicStoreDomain, primaryDomainUrl);
          const isActive = item.id === activeItemId;
          return (
            <NavLink
              key={item.id}
              end
              prefetch="intent"
              to={url}
              onMouseEnter={() => setActiveItemId(item.id)}
              onFocus={() => setActiveItemId(item.id)}
              aria-expanded={isActive}
              className={[
                'transition-colors',
                isActive ? 'text-gray-400' : 'text-gray-800 hover:text-gray-950',
              ].join(' ')}
            >
              {item.title}
            </NavLink>
          );
        })}
      </nav>

      <MenuDrawer
        item={activeItem}
        top={panelTop}
        publicStoreDomain={publicStoreDomain}
        primaryDomainUrl={primaryDomainUrl}
        collectionImages={collectionImages}
        onClose={() => setActiveItemId(null)}
      />
    </>
  );
}