import {useEffect, useRef, useState} from 'react';
import {NavLink} from 'react-router';
import {useAside} from '~/components/Aside';
import type {HeaderProps, Viewport} from './Header';
import {FALLBACK_HEADER_MENU, MEGA_MENU_CLOSE_DELAY, resolveUrl} from './Header.constants';
import {MenuDrawer} from './MenuDrawer';

function navLinkClass({isActive, isPending}: {isActive: boolean; isPending: boolean}) {
  return [
    'text-gray-800 hover:text-gray-950',
    isActive ? 'font-semibold text-gray-950' : '',
    isPending ? 'text-gray-400' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

// className is now actually used (previously accepted but never passed in),
// so the `.star` / `.star-1..3` classes from the highlight CSS can position
// and color each icon instead of it inheriting whatever color happens to be
// active on the parent.
function StarIcon({className}: {className?: string}) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" className={className}>
      <path
        d="M6 0L7.854 4.146L12 6L7.854 7.854L6 12L4.146 7.854L0 6L4.146 4.146L6 0Z"
        fill="currentColor"
      />
    </svg>
  );
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
  const navWrapRef = useRef<HTMLDivElement>(null);

  const items = (menu || FALLBACK_HEADER_MENU).items;
  const activeItem = items.find((item) => item.id === activeItemId);

  function scheduleClose() {
    closeTimeout.current = setTimeout(() => setActiveItemId(null), MEGA_MENU_CLOSE_DELAY);
  }

  function cancelClose() {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }

  // Mirrors showcase.js: while a drawer is open, keep panelTop pinned to
  // the nav row's bottom edge (so the portaled backdrop never covers the
  // logo/search row above it), close on scroll (page moving under a fixed
  // panel reads as broken, same reasoning as SearchBar's onScroll in
  // Header.tsx), and close on Escape.
  useEffect(() => {
    if (!activeItemId) return;

    function updatePanelTop() {
      if (navWrapRef.current) setPanelTop(navWrapRef.current.getBoundingClientRect().bottom);
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

  return (
    <div
      ref={navWrapRef}
      className="relative border-b border-gray-100"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      <nav
        className="mx-auto flex max-w-[1400px] items-center gap-8 px-4 py-3 text-sm font-medium"
        role="navigation"
      >
        {/*
          menu-bar__link--highlight (defined in app/styles/menu.css) supplies
          --hl-color and the relative positioning context the star offsets
          are written against. Each <StarIcon /> below gets an explicit
          "menu-item__star menu-item__star--1/2/3" className, matching the
          class-based selectors in menu.css.
        */}
        <NavLink
          to="/collections"
          className="menu-bar__link--highlight flex items-center gap-1 text-red-600 hover:text-red-700"
        >
          On Sale
          <StarIcon className="menu-item__star menu-item__star--1" />
          <StarIcon className="menu-item__star menu-item__star--2" />
          <StarIcon className="menu-item__star menu-item__star--3" />
        </NavLink>
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
    </div>
  );
}