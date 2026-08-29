import {useEffect, useRef, useState} from 'react';
import {NavLink} from 'react-router';
import {useAside} from '~/components/Aside';
import type {HeaderProps, Viewport} from '~/sections/Header';
import {FALLBACK_HEADER_MENU, MEGA_MENU_CLOSE_DELAY, resolveUrl} from '~/config/Header.constants';
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

// Matches the item whose *actual menu text* is "On Sale" — case- and
// whitespace-insensitive so it still fires however the merchant typed
// it in the menu editor ("on sale", " On Sale ", etc.), but never for
// unrelated items. This is the only thing that should ever turn on the
// star-highlight treatment below; it must not be applied unconditionally
// regardless of what the menu actually says.
//
// This supersedes HeaderMenuOnSale.tsx, which rendered the same
// star-highlight markup but unconditionally wherever it was called —
// that's what was previously making "On Sale" always appear regardless
// of the real menu content. HeaderMenuOnSale.tsx (and the standalone
// OnSale.tsx / OnSaleWithStars.tsx reserve components) can be deleted,
// or their call site removed, now that this file drives it directly
// from actual menu data.
function isOnSaleItem(title: string) {
  return title.trim().toLowerCase() === 'on sale';
}

// Three-star highlight icon for the "On Sale" item, using the
// `menu-item__star` classes from ~/assets/header-menu.css to position/color
// each star (see className usage below) rather than inheriting
// whatever color happens to be active on the parent link.
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
  // Was HTMLDivElement when this owned its own wrapping row; now points
  // at the <nav> itself since that row no longer exists here.
  const navWrapRef = useRef<HTMLElement>(null);

  // Whether the nav's own content overflows its available width in each
  // direction — drives the left/right edge-fade hints below. This is the
  // React re-implementation of what the legacy header-section.css's
  // `.menu-bar.has-scroll-left/right` classes used to do; that CSS still
  // expected something to toggle those classes based on scroll position,
  // but nothing in this component tree ever did — there was no JS wiring
  // it up, and the class names it targeted (`.menu-bar__container`,
  // `.menu-bar__list`) don't even exist in this markup. This state does
  // that job directly against the actual <nav> ref instead.
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
    // -1px tolerance for sub-pixel rounding on some browsers/zoom levels.
    setHasScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  // Runs on mount, whenever the menu's own item count changes (a shorter
  // or longer menu can flip whether it overflows at all), and on resize —
  // independent of activeItemId, unlike the mega-menu effect below.
  useEffect(() => {
    updateScrollEdges();
    window.addEventListener('resize', updateScrollEdges);
    return () => window.removeEventListener('resize', updateScrollEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Mirrors showcase.js: while a drawer is open, keep panelTop pinned to
  // the nav row's bottom edge (so the portaled backdrop never covers
  // the header above it, and lines up exactly with DrawerPanel's own
  // `top-full`, which resolves against that same row via
  // `data-header-menu-row` — see the comment on that div in
  // Header.tsx). Close on scroll (page moving under a fixed panel reads
  // as broken, same reasoning as SearchBar's onScroll in Header.tsx),
  // and close on Escape.
  //
  // NOTE: we deliberately measure off the row (`[data-header-menu-row]`),
  // not off `navWrapRef` itself. The <nav> now lives in Header.tsx's
  // second row, on its own, centered via `justify-center` on that
  // row's flex container — when the row has vertical padding (`py-2`)
  // the <nav>'s own `bottom` sits *above* the row's real bottom edge.
  // Measuring off the row instead keeps this in sync with DrawerPanel's
  // `top-full` and avoids a gap between the backdrop and the panel.
  //
  // This used to look for `[data-header-search-row]` (the logo/search/
  // ctas row above), back when the nav still lived inside that same
  // row. Now that Header.tsx has split the nav into its own row below,
  // that row's bottom edge is the wrong edge to hang the drawer from —
  // it would put the drawer right under the logo, overlapping the nav
  // row itself. `data-header-menu-row` marks the nav's own row instead.
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

  // Desktop: no more own wrapping/bordered row — this renders as a
  // plain inline <nav>, sized to content, so Header.tsx can lay it out
  // in its own row below the logo/search/ctas row. The mega-menu
  // drawer is still portaled separately and positioned off that row
  // (see updatePanelTop above), not off navWrapRef directly.
  //
  // The outer <div> here is `relative` purely so the edge-fade
  // gradients below can be positioned against the nav's own box rather
  // than the page. `min-w-0` on both this div and the <nav> itself
  // matters: without it, a flex item's default `min-width: auto`
  // refuses to shrink below its content's natural width, which is
  // exactly what was causing the menu to spill past the row instead of
  // scrolling. Setting `overflow-x-auto` on the <nav> also independently
  // resets that automatic minimum to 0 per spec, but min-w-0 here is
  // kept as a belt-and-suspenders in case any browser applies that
  // inconsistently.
  return (
    <>
      <div className="relative min-w-0 max-w-full">
        <nav
          ref={navWrapRef}
          onScroll={updateScrollEdges}
          className="flex min-w-0 items-center gap-6 overflow-x-auto text-sm font-medium [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="navigation"
          onMouseLeave={scheduleClose}
          onMouseEnter={cancelClose}
        >
          {items.map((item) => {
            if (!item.url) return null;
            const url = resolveUrl(item.url, publicStoreDomain, primaryDomainUrl);
            const isActive = item.id === activeItemId;
            const onSale = isOnSaleItem(item.title);
            return (
              <NavLink
                key={item.id}
                end
                prefetch="intent"
                to={url}
                onMouseEnter={() => setActiveItemId(item.id)}
                onFocus={() => setActiveItemId(item.id)}
                aria-expanded={isActive}
                className={
                  onSale
                    ? 'menu-bar__link--highlight flex shrink-0 items-center gap-1 transition'
                    : [
                        'shrink-0 transition-colors',
                        isActive ? 'text-gray-400' : 'text-gray-800 hover:text-gray-950',
                      ].join(' ')
                }
              >
                {item.title}
                {onSale && (
                  <>
                    <StarIcon className="menu-item__star menu-item__star--1" />
                    <StarIcon className="menu-item__star menu-item__star--2" />
                    <StarIcon className="menu-item__star menu-item__star--3" />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Edge-fade hints — same visual idea as
            header-section.css's .menu-bar__edge-fade, rebuilt here since
            that file isn't linked into this app and its selectors don't
            match this markup. Purely decorative (aria-hidden, pointer-
            events-none): they only signal "there's more to scroll to",
            never intercept clicks/hover meant for the nav underneath. */}
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
    </>
  );
}