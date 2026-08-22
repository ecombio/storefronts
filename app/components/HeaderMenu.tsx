import {useRef, useState} from 'react';
import {NavLink} from 'react-router';
import {Bike} from 'lucide-react';
import {useAside} from '~/components/Aside';
import type {HeaderProps, Viewport} from './Header';
import {
  FALLBACK_HEADER_MENU,
  MEGA_MENU_CLOSE_DELAY,
  MEGA_MENU_TIPS,
  SUBMENU_IMAGES,
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
}: {
  menu: HeaderProps['header']['menu'];
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url'];
  viewport: Viewport;
  publicStoreDomain: HeaderProps['publicStoreDomain'];
}) {
  const {close} = useAside();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = (menu || FALLBACK_HEADER_MENU).items;
  const activeItem = items.find((item) => item.id === activeItemId);
  const hasSubmenu = Boolean(activeItem?.items?.length);

  function scheduleClose() {
    closeTimeout.current = setTimeout(() => setActiveItemId(null), MEGA_MENU_CLOSE_DELAY);
  }

  function cancelClose() {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }

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

      {hasSubmenu && activeItem && (
        <MegaMenuPanel
          item={activeItem}
          publicStoreDomain={publicStoreDomain}
          primaryDomainUrl={primaryDomainUrl}
          onLinkClick={() => setActiveItemId(null)}
        />
      )}
    </div>
  );
}

function MegaMenuPanel({
  item,
  publicStoreDomain,
  primaryDomainUrl,
  onLinkClick,
}: {
  item: MenuItem;
  publicStoreDomain: string;
  primaryDomainUrl: string;
  onLinkClick: () => void;
}) {
  const tips = MEGA_MENU_TIPS[item.title];

  return (
    <div className="border-t border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-[1400px] gap-8 px-4 py-6">
        {tips && tips.length > 0 && (
          <div className="w-56 shrink-0 border-r border-gray-100 pr-6">
            <p className="mb-3 text-sm font-semibold text-gray-900">Good to know</p>
            <ul className="space-y-2">
              {tips.map((tip) => (
                <li key={tip} className="text-sm text-gray-700">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex-1">
          <p className="mb-4 text-sm font-semibold text-gray-900">Categories</p>
          <div className="grid grid-cols-5 gap-6">
            {item.items?.map((sub) => {
              if (!sub.url) return null;
              const url = resolveUrl(sub.url, publicStoreDomain, primaryDomainUrl);
              const imageSrc = SUBMENU_IMAGES[sub.title];
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
                        alt={sub.title}
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
      </div>
    </div>
  );
}