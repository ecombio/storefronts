import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {NavLink} from 'react-router';
import {Bike, Clock, Gift, RotateCcw, ShieldCheck, Sparkles, Tag, Truck} from 'lucide-react';
import {
  resolveUrl,
  SHOWCASE_SEE_ALL,
  SHOWCASE_TIPS,
  SUBMENU_IMAGES,
  type CollectionImage,
  type MenuItem,
} from '~/config/Header.constants';

/**
 * Everything to do with the mega-menu's dropdown content: the dimmed
 * backdrop and the tips/categories panel. HeaderMenu owns *when* a drawer
 * should be open (hover state, timers, escape/scroll handling); this file
 * owns *what* renders once it is.
 *
 * `item` is the currently-hovered top-level menu item, or undefined when
 * nothing is active. Whether that translates into a visible drawer (i.e.
 * whether the item actually has tips or sub-categories to show) is decided
 * in here, not by the caller.
 */
export function MenuDrawer({
  item,
  top,
  publicStoreDomain,
  primaryDomainUrl,
  collectionImages,
  onClose,
}: {
  item: MenuItem | undefined;
  top: number;
  publicStoreDomain: string;
  primaryDomainUrl: string;
  collectionImages?: Record<string, CollectionImage>;
  onClose: () => void;
}) {
  const tips = item ? SHOWCASE_TIPS[item.title] : undefined;
  const hasContent = Boolean(item && ((tips?.length ?? 0) > 0 || item.items?.length));

  return (
    <>
      <DrawerBackdrop open={hasContent} top={top} onClose={onClose} />
      {hasContent && item && (
        <DrawerPanel
          item={item}
          tips={tips}
          publicStoreDomain={publicStoreDomain}
          primaryDomainUrl={primaryDomainUrl}
          collectionImages={collectionImages}
          onLinkClick={onClose}
        />
      )}
    </>
  );
}

// Portaled to <body> so the dimmed/blurred backdrop escapes the header's
// stacking context and can sit over the rest of the page, same reasoning
// as SearchBar's backdrop in Header.tsx and RegionPicker's dropdown portal.
// `top` pins it to the nav row's bottom edge (tracked in HeaderMenu) so it
// never covers the logo/search row sitting above the nav.
function DrawerBackdrop({
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
// optional "See all" link. z-40 keeps it above DrawerBackdrop's z-30.
function DrawerPanel({
  item,
  tips,
  publicStoreDomain,
  primaryDomainUrl,
  collectionImages,
  onLinkClick,
}: {
  item: MenuItem;
  tips: (typeof SHOWCASE_TIPS)[string] | undefined;
  publicStoreDomain: string;
  primaryDomainUrl: string;
  collectionImages?: Record<string, CollectionImage>;
  onLinkClick: () => void;
}) {
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
