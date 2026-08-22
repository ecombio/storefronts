import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {NavLink} from 'react-router';
import {Bike, Clock, Gift, RotateCcw, ShieldCheck, Sparkles, Tag, Truck} from 'lucide-react';
import {useAside} from '~/components/Aside';
import type {HeaderProps, Viewport} from './Header';
import {
  FALLBACK_HEADER_MENU,
  MEGA_MENU_CLOSE_DELAY,
  SHOWCASE_SEE_ALL,
  SHOWCASE_TIPS,
  SUBMENU_IMAGES,
  type CollectionImage,
} from './Header.constants';

type MenuItem = HeaderProps['header']['menu'] extends {items: (infer T)[]}
  ? T
  : never;

function resolveUrl(url: string, publicStoreDomain: string, primaryDomainUrl: string) {
  return url.includes('myshopify.com') ||
    url.includes(publicStoreDomain) ||
    url.includes(primaryDomainUrl)
    ? new URL(url).pathname
    : url;
}

function navLinkClass({isActive, isPending}: {isActive: boolean; isPending: boolean}) {
  return [
    'text-gray-800 hover:text-gray-950',
    isActive ? 'font-semibold text-gray-950' : '',
    isPending ? 'text-gray-400' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

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
  const activeTips = activeItem ? SHOWCASE_TIPS[activeItem.title] : undefined;
  const hasPanel = Boolean(activeItem && ((activeTips?.length ?? 0) > 0 || activeItem.items?.length));

  function scheduleClose() {
    closeTimeout.current = setTimeout(() => setActiveItemId(null), MEGA_MENU_CLOSE_DELAY);
  }

  function cancelClose() {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }

  // Mirrors showcase.js: while a panel is open, keep the portaled backdrop
  // pinned to the nav row's bottom edge (so it never covers the logo/search
  // row above it), close on scroll (page moving under a fixed panel reads as
  // broken, same reasoning as SearchBar's onScroll in Header.tsx), and close
  // on Escape.
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
        <NavLink
          to="/collections"
          className="flex items-center gap-1 text-red-600 hover:text-red-700"
        >
          On Sale
          <StarIcon />
          <StarIcon />
          <StarIcon />
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

      <ShowcaseBackdrop open={hasPanel} top={panelTop} onClose={() => setActiveItemId(null)} />

      {hasPanel && activeItem && (
        <ShowcasePanel
          item={activeItem}
          publicStoreDomain={publicStoreDomain}
          primaryDomainUrl={primaryDomainUrl}
          collectionImages={collectionImages}
          onLinkClick={() => setActiveItemId(null)}
        />
      )}
    </div>
  );
}

// Portaled to <body> so the dimmed/blurred backdrop escapes the header's
// stacking context and can sit over the rest of the page, same reasoning
// as SearchBar's backdrop in Header.tsx and RegionPicker's dropdown portal.
// `top` pins it to the nav row's bottom edge (tracked in HeaderMenu) so it
// never covers the logo/search row sitting above the nav.
function ShowcaseBackdrop({
  open,
  top,
  onClose,
}: {
  open: boolean;
  top: number;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden="true"
      onClick={onClose}
      style={{top}}
      className={`fixed inset-x-0 bottom-0 z-30 bg-black/40 backdrop-blur-[6px] transition-opacity duration-200 ease-out ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    />,
    document.body,
  );
}

// Maps 1:1 to the showcase-block.liquid snippet: a "Good to know" sidebar
// (tip_1..tip_3, each an icon/heading/body) plus a category grid with an
// optional "See all" link. z-40 keeps it above ShowcaseBackdrop's z-30.
function ShowcasePanel({
  item,
  publicStoreDomain,
  primaryDomainUrl,
  collectionImages,
  onLinkClick,
}: {
  item: MenuItem;
  publicStoreDomain: string;
  primaryDomainUrl: string;
  collectionImages?: Record<string, CollectionImage>;
  onLinkClick: () => void;
}) {
  const tips = SHOWCASE_TIPS[item.title];
  const categories = item.items ?? [];
  const seeAllConfig = SHOWCASE_SEE_ALL[item.title];
  const seeAllUrl =
    seeAllConfig?.link ?? (item.url ? resolveUrl(item.url, publicStoreDomain, primaryDomainUrl) : undefined);
  const seeAllLabel = seeAllConfig?.label ?? 'See all';

  return (
    <div className="absolute inset-x-0 top-full z-40 border-t border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1400px] gap-10 px-4 py-8">
        {tips && tips.length > 0 && (
          <div className="w-56 shrink-0 rounded-xl bg-gray-50 p-5">
            <p className="mb-3.5 text-sm font-bold text-gray-900">Good to know</p>
            <ul className="flex flex-col gap-4">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-900">
                    <TipIcon name={tip.icon} />
                  </span>
                  <span className="text-[13px] leading-snug text-gray-700">
                    <strong className="mb-0.5 block text-gray-900">{tip.heading}</strong>
                    {tip.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {categories.length > 0 && (
          <div className="flex-1">
            <div className="mb-4 flex items-baseline justify-between">
              <p className="text-sm font-bold text-gray-900">Categories</p>
              {seeAllUrl && (
                <NavLink
                  to={seeAllUrl}
                  onClick={onLinkClick}
                  className="text-sm font-semibold text-gray-900 underline hover:text-gray-600"
                >
                  {seeAllLabel}
                </NavLink>
              )}
            </div>
            <div className="grid grid-cols-5 gap-6">
              {categories.map((sub) => {
                if (!sub.url) return null;
                const url = resolveUrl(sub.url, publicStoreDomain, primaryDomainUrl);
                // Prefer the real, live collection image (fetched by
                // resourceId — see MENU_COLLECTION_IMAGES_QUERY). Fall back
                // to the static stand-in map, then to the icon placeholder,
                // for items that don't resolve to a collection image.
                const liveImage = sub.resourceId ? collectionImages?.[sub.resourceId] : undefined;
                const imageSrc = liveImage?.url ?? SUBMENU_IMAGES[sub.title];
                const imageAlt = liveImage?.altText ?? sub.title;
                return (
                  <NavLink
                    key={sub.id}
                    to={url}
                    prefetch="intent"
                    onClick={onLinkClick}
                    className="group"
                  >
                    <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-400 group-hover:bg-gray-200">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={imageAlt}
                          width={150}
                          height={150}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Bike size={32} aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{sub.title}</p>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stand-in for the Liquid snippet's `render 'menu-icon', icon: t_icon` —
// that partial resolves arbitrary icon names from the theme's icon set;
// this maps the handful of names used in Header.constants.ts's
// SHOWCASE_TIPS to lucide-react equivalents, falling back to a generic
// sparkle for anything unrecognized.
function TipIcon({name}: {name?: string}) {
  const props = {size: 16, 'aria-hidden': true as const};
  switch (name) {
    case 'truck':
      return <Truck {...props} />;
    case 'shield':
      return <ShieldCheck {...props} />;
    case 'gift':
      return <Gift {...props} />;
    case 'clock':
      return <Clock {...props} />;
    case 'return':
    case 'refresh':
      return <RotateCcw {...props} />;
    case 'tag':
      return <Tag {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}