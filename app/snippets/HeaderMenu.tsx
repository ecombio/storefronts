// app/snippets/HeaderMenu.tsx
import {useEffect, useRef, useState} from 'react';
import {NavLink} from 'react-router';
import {useAside} from '~/components/Aside';
import type {HeaderProps, Viewport} from '~/sections/Header';
import {FALLBACK_HEADER_MENU, MEGA_MENU_CLOSE_DELAY, resolveUrl} from '~/config/Header.constants';
import {MenuDrawer} from './MenuDrawer';
import {HighlightLink, isOnSaleItem} from './Highlight';

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
  const navWrapRef = useRef<HTMLElement>(null);

  const [hasScrollLeft, setHasScrollLeft] = useState(false);
  const [hasScrollRight, setHasScrollRight] = useState(false);

  const items = (menu || FALLBACK_HEADER_MENU).items;
  const activeItem = items.find((item) => item.id === activeItemId);

  function scheduleClose() {
    closeTimeout.current = setTimeout(() => setActiveItemId(null), MEGA_MENU_CLOSE_DELAY);
  }

  function cancelClose() {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }

  function updateScrollEdges() {
    const el = navWrapRef.current;
    if (!el) return;
    setHasScrollLeft(el.scrollLeft > 0);
    setHasScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    updateScrollEdges();
    window.addEventListener('resize', updateScrollEdges);
    return () => window.removeEventListener('resize', updateScrollEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    if (!activeItemId) return;

    function updatePanelTop() {
      const row = navWrapRef.current?.closest<HTMLElement>('[data-header-menu-row]');
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

  return (
    <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <div className="relative min-w-0 max-w-full">
        <nav
          ref={navWrapRef}
          onScroll={updateScrollEdges}
          className="flex min-w-0 items-center gap-6 overflow-x-auto text-sm font-medium [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="navigation"
        >
          {items.map((item) => {
            if (!item.url) return null;
            const url = resolveUrl(item.url, publicStoreDomain, primaryDomainUrl);
            const isActive = item.id === activeItemId;

            if (isOnSaleItem(item.title)) {
              return (
                <HighlightLink
                  key={item.id}
                  to={url}
                  title={item.title}
                  isActive={isActive}
                  onMouseEnter={() => setActiveItemId(item.id)}
                  onFocus={() => setActiveItemId(item.id)}
                />
              );
            }

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
                  'nav-item shrink-0 transition-colors',
                  isActive ? 'text-gray-400' : 'text-[#1c2b4a] hover:text-gray-950',
                ].join(' ')}
              >
                {item.title}
              </NavLink>
            );
          })}
        </nav>

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 ${
            hasScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 ${
            hasScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

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
