// app/sections/Header.tsx
//
// Merged file: Header.constants.ts, useHeaderHeightSync.ts, and
// ai-search-svg-paths.ts have been inlined below, since none of them
// are consumed anywhere else in the app. `~/components/Aside`,
// `~/lib/wishlist`, and `~/lib/compare` remain external imports on
// purpose — they are each a single source of truth shared by other
// components (CartDrawer/QuickView/MenuDrawer for Aside; ProductCard
// and the /wishlist page for wishlist; ProductCard, CompareBar, and
// the /compare page for compare). Inlining those would silently fork
// that shared state/logic — see conversation notes if this ever needs
// revisiting.

import {Suspense, forwardRef, useCallback, useEffect, useRef, useState} from 'react';
import type {ReactNode, RefObject} from 'react';
import {createPortal} from 'react-dom';
import {Await, Link, NavLink, useAsyncValue, useFetcher, useNavigate} from 'react-router';
import {
  ArrowUpLeft,
  Bike,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  Heart,
  ImageOff,
  Info,
  LayoutGrid,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  User,
  X,
} from 'lucide-react';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import '~/assets/search-bar.css';
import wordmarkSrc from '~/assets/wordmark.svg';
import {type WishlistEntry, WISHLIST_KEY, readWishlist} from '~/lib/wishlist';
import {type CompareEntry, COMPARE_KEY, COMPARE_MAX, readCompareList} from '~/lib/compare';

/* ════════════════════════════════════════════════════════════════════════
 * Inlined from app/config/Header.constants.ts
 * ════════════════════════════════════════════════════════════════════════
 * NOTE: the original file imported `HeaderProps` from this same
 * Header.tsx to derive `MenuItem` (a type-only circular import, which
 * TS tolerates). Now that both live in one file, `MenuItem` below
 * simply references `HeaderProps`, which is declared further down —
 * that's fine for TypeScript type/interface declarations regardless
 * of source order.
 *
 * NOTE: `LOGO_SRC` below does not appear to be used anywhere in this
 * file — the logo is rendered via the imported `wordmarkSrc` asset
 * instead. Kept as-is rather than removed; flag for cleanup if it's
 * confirmed dead.
 * ════════════════════════════════════════════════════════════════════════ */

// Wordmark asset used by the live Liquid theme.
const LOGO_SRC =
  '//ecombio.com/cdn/shop/files/wordmark.svg?v=1781367807&width=140';

// ─────────────────────────────────────────────────────────────────────────
// Header layout style
// Controls which arrangement Header renders below. Swap this to change
// the layout site-wide. Ideally becomes a Shopify theme setting or
// metafield down the line so merchandising can switch it without a
// deploy — a constant is the simplest starting point.
// ─────────────────────────────────────────────────────────────────────────
type HeaderStyle = 'launchpad' | 'storefront' | 'marketplace';

const ACTIVE_HEADER_STYLE: HeaderStyle = 'storefront';

// ─────────────────────────────────────────────────────────────────────────
// Header CTA feature flags
// Toggles Wishlist/Compare icons in the header CTAs cluster on/off
// without removing the underlying components, badges, and localStorage
// sync logic (WishlistToggle/CompareToggle below) — flip back to true
// whenever these are ready to ship again.
// ─────────────────────────────────────────────────────────────────────────
const SHOW_WISHLIST_CTA = false;
const SHOW_COMPARE_CTA = false;

// ─────────────────────────────────────────────────────────────────────────
// Header menu item shape + URL resolution
// Shared by HeaderMenu (top-level nav) and MenuDrawer (the mega-menu
// panel).
// ─────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────
// Announcement bar
// Stand-in for sections/announcement-bar.liquid's ann_1..ann_5 settings.
// Swap for a metaobject/Storefront API query if merchants need to edit
// this without a deploy.
// ─────────────────────────────────────────────────────────────────────────
type AnnouncementSlideConfig =
  | {type: 'announcement'; text: string; link?: string}
  | {
      type: 'countdown';
      label?: string;
      countdownType: 'fixed' | 'evergreen';
      endDate?: string; // 'YYYY/MM/DD HH:MM', fixed only
      evergreenMinutes?: number; // evergreen only
      buttonLabel?: string;
      buttonLink?: string;
    };

// Order matches the live site: countdown first (with its "Countdown timer"
// label), then the shipping-promo message.
const ANNOUNCEMENT_SLIDES: AnnouncementSlideConfig[] = [
  {
    type: 'countdown',
    label: 'Countdown timer',
    countdownType: 'evergreen',
    evergreenMinutes: 720,
  },
  {
    type: 'announcement',
    text: '✌️ Free Express Shipping on orders $500!',
  },
];

const ANNOUNCEMENT_ENABLE_CLOSE = true;
const ANNOUNCEMENT_AUTOROTATE = true;
const ANNOUNCEMENT_AUTOROTATE_SPEED_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────
// Utility bar
// Stand-in for sections/utility-bar.liquid's link_1..link_3 settings.
// ─────────────────────────────────────────────────────────────────────────
interface UtilityLink {
  label: string;
  url: string;
  icon?: string;
}

const UTILITY_LINKS: UtilityLink[] = [
  {label: 'Track Order', url: '/apps/track'},
  {label: 'Store Locator', url: '/pages/stores'},
];

// ─────────────────────────────────────────────────────────────────────────
// Region / language picker
// Stand-in for `localization.available_countries` / `.available_languages`.
// Replace with a real Storefront API / root-loader query when wiring this
// up to Hydrogen's actual localization flow.
// ─────────────────────────────────────────────────────────────────────────
interface Country {
  name: string;
  isoCode: string;
}

const CURRENT_COUNTRY = 'US';
const CURRENT_LANGUAGE = 'English';

const COUNTRIES: Country[] = [
  {name: 'United States', isoCode: 'US'},
  {name: 'Australia', isoCode: 'AU'},
  {name: 'Austria', isoCode: 'AT'},
  {name: 'Belgium', isoCode: 'BE'},
  {name: 'Canada', isoCode: 'CA'},
  {name: 'Czechia', isoCode: 'CZ'},
  {name: 'Denmark', isoCode: 'DK'},
  {name: 'Finland', isoCode: 'FI'},
  {name: 'France', isoCode: 'FR'},
  {name: 'Germany', isoCode: 'DE'},
  {name: 'Ireland', isoCode: 'IE'},
  {name: 'Italy', isoCode: 'IT'},
  {name: 'Japan', isoCode: 'JP'},
  {name: 'Mexico', isoCode: 'MX'},
  {name: 'Netherlands', isoCode: 'NL'},
  {name: 'New Zealand', isoCode: 'NZ'},
  {name: 'Norway', isoCode: 'NO'},
  {name: 'Poland', isoCode: 'PL'},
  {name: 'Portugal', isoCode: 'PT'},
  {name: 'Spain', isoCode: 'ES'},
  {name: 'Sweden', isoCode: 'SE'},
  {name: 'Switzerland', isoCode: 'CH'},
  {name: 'United Kingdom', isoCode: 'GB'},
];

// Animated search placeholder — cycles through these like the live site's typewriter.
const TRENDING_SEARCH_TERMS = [
  'electric scooters',
  'electric bikes',
  'electric skateboards',
  'electric cargo bikes',
  'electric city bikes',
  'electric fat bikes',
  'electric folding bikes',
  'electric mountain bikes',
  'commuter electric scooters',
  'off-road electric scooters',
  'performance electric scooters',
  'youth electric scooters',
];

// How long to wait before closing the mega menu after the pointer leaves,
// so moving diagonally from the link down into the panel doesn't close it.
const MEGA_MENU_CLOSE_DELAY = 150;

// ─────────────────────────────────────────────────────────────────────────
// Submenu images — real collection images, fetched by resourceId
// ─────────────────────────────────────────────────────────────────────────
// Menu items already carry a `resourceId` (see the `PAGE` entry in
// FALLBACK_HEADER_MENU below) whenever the Shopify Admin menu editor links
// them directly to a resource — a Collection, in the "Electric Bikes"
// submenu's case. Query those collections' real images by id in the root
// loader (alongside the header menu query) and pass the result down as the
// `collectionImages` prop threaded through Header -> HeaderMenu. That's now
// the primary image source for the showcase panel's category cards.
//
// Example root loader wiring:
//
//   const collectionIds = menu.items
//     .flatMap((item) => item.items ?? [])
//     .map((item) => item.resourceId)
//     .filter((id): id is string => Boolean(id) && id.includes('/Collection/'));
//
//   const collectionImages = collectionIds.length
//     ? await context.storefront
//         .query(MENU_COLLECTION_IMAGES_QUERY, {variables: {ids: collectionIds}})
//         .then((data) =>
//           Object.fromEntries(
//             data.nodes
//               .filter((n): n is {id: string; image: CollectionImage | null} => n != null && 'image' in n)
//               .filter((n) => n.image)
//               .map((n) => [n.id, n.image as CollectionImage]),
//           ),
//         )
//     : {};
//
// Then: <Header ... collectionImages={collectionImages} />
const MENU_COLLECTION_IMAGES_QUERY = `#graphql
  query MenuCollectionImages($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on Collection {
        id
        image {
          url
          altText
        }
      }
    }
  }
` as const;

interface CollectionImage {
  url: string;
  altText: string | null;
}

// Static fallback, keyed by menu item title — used only when a submenu
// item doesn't resolve to a live collection image (a custom link, a page,
// or a collection with no image set in the Admin).
const SUBMENU_IMAGES: Record<string, string> = {
  'Electric Cargo Bikes':
    '//ecombio.com/cdn/shop/collections/fiido-t3-two-people-riding_1.webp?v=1784397522&width=300',
  'Electric City Bikes':
    '//ecombio.com/cdn/shop/collections/i.shgcdn_76ba479e-f743-477d-8a9f-eb9a6e6b73f2.webp?v=1784397588&width=300',
  'Electric Fat Bikes':
    '//ecombio.com/cdn/shop/collections/alpine-fat-tire-ebike-8093206.webp?v=1784397812&width=300',
  'Electric Folding Bikes':
    '//ecombio.com/cdn/shop/collections/Brompton-P-Line-D.webp?v=1784397680&width=300',
  'Electric Mountain Bikes':
    '//ecombio.com/cdn/shop/collections/electric-mountain-bikes_s.jpg?v=1784397360&width=300',
  'Commuter Electric Scooters':
    '//ecombio.com/cdn/shop/collections/Commuter_E-Scooters.png?v=1780540373&width=300',
  'Off-Road Electric Scooters':
    '//ecombio.com/cdn/shop/collections/Off-Road_E-Scooters.png?v=1780540359&width=300',
  'Performance Electric Scooters':
    '//ecombio.com/cdn/shop/collections/Performance_E-Scooters.png?v=1780540346&width=300',
  'Electric Scooter for Kids':
    '//ecombio.com/cdn/shop/collections/Youth_E-Scooters.png?v=1780540329&width=300',
};

// "Good to know" sidebar tips shown in a showcase panel, keyed by the
// top-level menu item title. Mirrors sections/showcase-block.liquid's
// tip_1..tip_3 (icon/heading/body) settings.
interface ShowcaseTip {
  icon?: string; // 'truck' | 'shield' | 'gift' | 'clock' | 'return' | 'tag' | ...
  heading: string;
  body?: string;
}

const SHOWCASE_TIPS: Record<string, ShowcaseTip[]> = {
  'Electric Scooters': [
    {
      icon: 'tag',
      heading: 'Trade-in',
      body: 'Get up to $700 for your old device',
    },
  ],
};

// Optional "See all" link override per top-level item, keyed by title.
// Falls back to the item's own resolved url + a generic "See all" label
// when not set here, mirroring showcase-block.liquid's see_all_link /
// see_all_label settings.
const SHOWCASE_SEE_ALL: Record<string, {label?: string; link?: string}> = {};

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500001',
      resourceId: null,
      tags: [],
      title: 'Single Link',
      type: 'HTTP',
      url: '/pages/electric-bikes#',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Electric Bicycles',
      type: 'HTTP',
      url: '/pages/electric-bikes',
      items: [
        {
          id: 'gid://shopify/MenuItem/461609500728-1',
          resourceId: null,
          tags: [],
          title: 'Electric Cargo Bikes',
          type: 'HTTP',
          url: '/collections/electric-cargo-bikes',
          items: [],
        },
        {
          id: 'gid://shopify/MenuItem/461609500728-2',
          resourceId: null,
          tags: [],
          title: 'Electric City Bikes',
          type: 'HTTP',
          url: '/collections/electric-city-bikes',
          items: [],
        },
        {
          id: 'gid://shopify/MenuItem/461609500728-3',
          resourceId: null,
          tags: [],
          title: 'Electric Fat Bikes',
          type: 'HTTP',
          url: '/collections/electric-fat-bikes',
          items: [],
        },
        {
          id: 'gid://shopify/MenuItem/461609500728-4',
          resourceId: null,
          tags: [],
          title: 'Electric Folding Bikes',
          type: 'HTTP',
          url: '/collections/electric-folding-bikes',
          items: [],
        },
        {
          id: 'gid://shopify/MenuItem/461609500728-5',
          resourceId: null,
          tags: [],
          title: 'Electric Mountain Bikes',
          type: 'HTTP',
          url: '/collections/electric-mountain-bikes',
          items: [],
        },
      ],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Electric Scooters',
      type: 'HTTP',
      url: '/pages/electric-scooters',
      items: [
        {
          id: 'gid://shopify/MenuItem/461609533496-1',
          resourceId: null,
          tags: [],
          title: 'Commuter Electric Scooters',
          type: 'HTTP',
          url: '/collections/commuter-electric-scooters',
          items: [],
        },
        {
          id: 'gid://shopify/MenuItem/461609533496-2',
          resourceId: null,
          tags: [],
          title: 'Off-Road Electric Scooters',
          type: 'HTTP',
          url: '/collections/off-road-electric-scooters',
          items: [],
        },
        {
          id: 'gid://shopify/MenuItem/461609533496-3',
          resourceId: null,
          tags: [],
          title: 'Performance Electric Scooters',
          type: 'HTTP',
          url: '/collections/performance-electric-scooters',
          items: [],
        },
        {
          id: 'gid://shopify/MenuItem/461609533496-4',
          resourceId: null,
          tags: [],
          title: 'Electric Scooter for Kids',
          type: 'HTTP',
          url: '/collections/electric-scooter-for-kids',
          items: [],
        },
      ],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Electric Skateboards',
      type: 'HTTP',
      url: '/pages/electric-skateboards',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'Accessories & Parts',
      type: 'PAGE',
      url: '/collections/accessories',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599033',
      resourceId: null,
      tags: [],
      title: 'More',
      type: 'HTTP',
      url: '/pages/electric-bikes#',
      items: [],
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * Inlined from app/snippets/ai-search-svg-paths.ts
 * ════════════════════════════════════════════════════════════════════════ */
const svgPaths = {
  p20021000: "M1.76446 0.0757267C1.68512 0.0262361 1.5935 9.00731e-08 1.5 9.00731e-08C1.39566 -6.2543e-05 1.29392 0.0325406 1.20905 0.0932382C1.12417 0.153936 1.06041 0.239684 1.02671 0.338459L0.851784 0.851897L0.33901 1.02688L0.280035 1.05087C0.191154 1.0944 0.117191 1.16334 0.0675194 1.24896C0.0178475 1.33457 -0.00529696 1.43301 0.00101927 1.5318C0.00733551 1.63059 0.0428278 1.72528 0.102999 1.80387C0.163169 1.88246 0.24531 1.94142 0.33901 1.97326L0.852284 2.14824L1.02721 2.66118L1.0512 2.71967C1.09466 2.80859 1.16354 2.88261 1.2491 2.93233C1.33466 2.98206 1.43305 3.00526 1.53181 2.999C1.63056 2.99273 1.72523 2.95729 1.80383 2.89715C1.88242 2.83701 1.9414 2.75488 1.97329 2.66118L2.14822 2.14774L2.66099 1.97276L2.71996 1.94876C2.80885 1.90524 2.88281 1.8363 2.93248 1.75068C2.98215 1.66506 3.0053 1.56662 2.99898 1.46783C2.99266 1.36904 2.95717 1.27435 2.897 1.19576C2.83683 1.11717 2.75469 1.05822 2.66099 1.02638L2.14772 0.851397L1.97279 0.338459L1.9488 0.279966C1.90766 0.195978 1.8438 0.125217 1.76446 0.0757267Z",
  p3872200: "M4.70523 0.201938C4.49366 0.0699628 4.24933 2.40195e-07 4 2.40195e-07C3.72177 -0.000166781 3.45046 0.0867751 3.22412 0.248635C2.99778 0.410495 2.82775 0.639157 2.73789 0.902558L2.27142 2.27173L0.904025 2.73834L0.746761 2.80233C0.509745 2.91839 0.31251 3.10223 0.180052 3.33055C0.0475932 3.55886 -0.0141252 3.82137 0.00271806 4.08481C0.0195614 4.34825 0.114208 4.60076 0.274663 4.81033C0.435118 5.0199 0.654159 5.17711 0.904025 5.26203L2.27276 5.72864L2.73922 7.09647L2.80319 7.25245C2.9191 7.48958 3.10278 7.68695 3.33094 7.81956C3.5591 7.95216 3.82147 8.01403 4.08482 7.99733C4.34816 7.98062 4.60062 7.88609 4.81021 7.72572C5.01979 7.56535 5.17707 7.34635 5.26211 7.09647L5.72858 5.72731L7.09597 5.2607L7.25324 5.1967C7.49025 5.08064 7.68749 4.8968 7.81995 4.66848C7.95241 4.44017 8.01412 4.17766 7.99728 3.91422C7.98044 3.65078 7.88579 3.39828 7.72534 3.1887C7.56488 2.97913 7.34584 2.82192 7.09597 2.737L5.72724 2.27039L5.26078 0.902558L5.19681 0.746577C5.0871 0.522607 4.91679 0.333913 4.70523 0.201938Z",
  p3f87f980: "M7.47266 0C7.2069 0.657052 7.04443 1.36712 7.00781 2.11035C5.84189 2.38525 4.76406 2.97813 3.90332 3.83887C2.68433 5.05785 2 6.71164 2 8.43555L2.00781 8.75781C2.0875 10.3644 2.76051 11.8894 3.90332 13.0322C5.12231 14.2512 6.77609 14.9355 8.5 14.9355C10.2239 14.9355 11.8777 14.2512 13.0967 13.0322C14.2388 11.8901 14.9109 10.3663 14.9912 8.76074C15.708 8.59241 16.378 8.30561 16.9814 7.92188C16.9918 8.09248 17 8.26366 17 8.43555C17 10.3602 16.345 12.2159 15.1621 13.71L17.6797 16.2285C18.0702 16.619 18.0702 17.2521 17.6797 17.6426C17.2891 18.0329 16.6561 18.033 16.2656 17.6426L13.7441 15.1211C12.2552 16.289 10.4118 16.9355 8.5 16.9355C6.24566 16.9355 4.08332 16.0403 2.48926 14.4463C0.895199 12.8522 0 10.6899 0 8.43555C0 6.18121 0.895199 4.01886 2.48926 2.4248C3.83918 1.07488 5.5969 0.228312 7.47266 0Z",
  pd9eea00: "M12.75 0.750049L0.750051 12.75M0.75 0.75L12.75 12.75",
};

/* ════════════════════════════════════════════════════════════════════════
 * Inlined from app/hooks/useHeaderHeightSync.ts
 * ════════════════════════════════════════════════════════════════════════
 * NOTE: this hook writes to `document.documentElement` (the <html> tag)
 * directly — it's a deliberate global side-effect, not scoped to the
 * header DOM node, so route templates (CollectionFilters,
 * CollectionToolbar) can read `--header-height` / `.header-hidden`
 * without prop drilling across the route boundary. Easy to miss now
 * that it's folded into this file — see the usage note below.
 *
 * Usage (see the `Header` component further down):
 *   const headerRef = useRef<HTMLElement>(null);
 *   useHeaderHeightSync(headerRef, hidden);
 *   return <header ref={headerRef} ...>
 * ════════════════════════════════════════════════════════════════════════ */
function useHeaderHeightSync(
  ref: RefObject<HTMLElement | null>,
  hidden: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        '--header-height',
        `${entry.contentRect.height}px`,
      );
    });
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [ref]);

  useEffect(() => {
    document.documentElement.classList.toggle('header-hidden', hidden);
  }, [hidden]);
}

/* ════════════════════════════════════════════════════════════════════════
 * Header.tsx original content
 * ════════════════════════════════════════════════════════════════════════ */

interface HeaderLayoutProps {
  logo: ReactNode;
  menu: ReactNode;
  search: ReactNode;
  ctas: ReactNode;
  mobileToggle: ReactNode;
  mobileSearch?: ReactNode;
}

const HEADER_LAYOUTS: Record<HeaderStyle, React.ComponentType<HeaderLayoutProps>> = {
  launchpad: HeaderLayoutLaunchpad,
  storefront: HeaderLayoutStorefront,
  marketplace: HeaderLayoutMarketplace,
};

const ANNOUNCEMENT_DISMISS_KEY = 'announcement_bar_dismissed';

function HeaderLayoutLaunchpad({
  logo,
  menu,
  search,
  ctas,
  mobileToggle,
  mobileSearch,
}: HeaderLayoutProps) {
  return (
    <div data-header-row className="relative">
      <div className="mx-auto flex max-w-[var(--content-max-width)] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
        {mobileToggle}
        {logo}

        <div className="hidden flex-1 justify-center lg:flex [&>*]:!w-auto">
          {menu}
        </div>

        <div className="flex-1 lg:hidden" />

        <div className="hidden items-center gap-4 lg:flex">
          {search}
          {ctas}
        </div>

        <div className="lg:hidden">{ctas}</div>
      </div>

      {mobileSearch && <div className="w-full py-2 lg:hidden">{mobileSearch}</div>}
    </div>
  );
}

function HeaderLayoutStorefront({
  logo,
  menu,
  search,
  ctas,
  mobileToggle,
  mobileSearch,
}: HeaderLayoutProps) {
  return (
    <div data-header-row className="relative">
      <div className="mx-auto flex max-w-[var(--content-max-width)] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
        {mobileToggle}
        {logo}

        <div className="hidden flex-1 justify-center lg:flex [&>*]:!w-auto">
          {menu}
        </div>

        <div className="flex-1 lg:hidden" />

        <div className="hidden items-center gap-4 lg:flex">
          <div className="w-[160px] shrink-0">{search}</div>
          {ctas}
        </div>

        <div className="lg:hidden">{ctas}</div>
      </div>

      {mobileSearch && <div className="w-full py-2 lg:hidden">{mobileSearch}</div>}
    </div>
  );
}

function HeaderLayoutMarketplace({
  logo,
  menu,
  search,
  ctas,
  mobileToggle,
  mobileSearch,
}: HeaderLayoutProps) {
  return (
    <div data-header-row className="relative">
      <div className="mx-auto flex max-w-[var(--content-max-width)] items-center gap-6 px-4 py-3 sm:gap-4 sm:px-6 lg:gap-8 lg:px-8">
        {mobileToggle}
        {logo}

        <div className="hidden lg:flex [&>*]:!w-auto">{menu}</div>

        <div className="flex-1" />

        <div className="hidden items-center gap-4 lg:flex">
          {search}
          {ctas}
        </div>

        <div className="lg:hidden">{ctas}</div>
      </div>

      {mobileSearch && <div className="w-full py-2 lg:hidden">{mobileSearch}</div>}
    </div>
  );
}

export interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  collectionImages?: Record<string, CollectionImage>;
  customer?: Promise<{firstName: string | null} | null>;
}

export type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
  collectionImages,
  customer,
}: HeaderProps) {
  const {shop, menu} = header;
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  useHeaderHeightSync(headerRef, hidden);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function onScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY < 80) {
        setHidden(false);
      } else if (delta > 5) {
        setHidden(true);
      } else if (delta < -5) {
        setHidden(false);
      }

      lastScrollY.current = currentY;
    }

    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const Layout = HEADER_LAYOUTS[ACTIVE_HEADER_STYLE];

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full [transform:translateZ(0)] [backface-visibility:hidden]"
    >
      <div
        className={`w-full bg-white font-sans shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-transform duration-300 ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <AnnouncementBar />
        <HeaderUtility />

        <Layout
          logo={
            <NavLink prefetch="intent" to="/" end className="shrink-0" aria-label={`${shop.name} — home`}>
              <img src={wordmarkSrc} alt={shop.name} width={140} height={28} className="h-8 w-auto sm:h-9" />
            </NavLink>
          }
          menu={
            <HeaderMenu
              menu={menu}
              viewport="desktop"
              primaryDomainUrl={header.shop.primaryDomain.url}
              publicStoreDomain={publicStoreDomain}
              collectionImages={collectionImages}
            />
          }
          search={<HeaderSearch size="compact" />}
          ctas={<HeaderCtas isLoggedIn={isLoggedIn} cart={cart} customer={customer} />}
          mobileToggle={<HeaderMenuMobileToggle />}
          mobileSearch={<HeaderSearch />}
        />
      </div>
    </header>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function flagUrl(isoCode: string) {
  return `https://cdn.shopify.com/shopifycloud/preview-bar/assets/${isoCode.toLowerCase()}.svg`;
}

function RegionPicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<{top: number; left: number} | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 320;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    setPosition({top: rect.bottom + 6, left});
  }

  function openPicker() {
    updatePosition();
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    setQuery('');
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    function onScroll() {
      closePicker();
    }
    function onResize() {
      updatePosition();
    }
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        closePicker();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closePicker();
        triggerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && dropdownRef.current) {
        const focusable = Array.from(dropdownRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onResize, {passive: true});
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = COUNTRIES.find((c) => c.isoCode === CURRENT_COUNTRY) ?? COUNTRIES[0];
  const results = COUNTRIES.filter(
    (c) => c.isoCode !== current.isoCode && c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function selectCountry(isoCode: string) {
    console.log('select country', isoCode);
    closePicker();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-label={`Choose location: ${current.name}`}
        onClick={() => (open ? closePicker() : openPicker())}
        className="flex h-8 items-center gap-1.5 pl-2.5 text-gray-700 hover:text-gray-950"
      >
        <img src={flagUrl(current.isoCode)} alt="" width={16} height={11} className="rounded-[2px]" />
        <span className="whitespace-nowrap">
          {CURRENT_LANGUAGE} ({current.isoCode})
        </span>
        <RegionChevronDown open={open} />
      </button>

      {mounted &&
        open &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose location"
            style={{top: position.top, left: position.left}}
            className="fixed z-[2147483647] w-80 rounded-lg border border-gray-200 bg-white p-5 pb-2 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-gray-900">Choose location</p>
              <button
                aria-label="Close location picker"
                onClick={() => {
                  closePicker();
                  triggerRef.current?.focus();
                }}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={14} />
              </button>
            </div>

            <p className="mb-3.5 text-xs leading-relaxed text-gray-500">
              Changing your location might affect your delivery address options, price, product
              availability, and currency.
            </p>

            <div className="relative mb-4">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your country"
                aria-label="Search countries"
                autoComplete="off"
                className="h-[38px] w-full rounded-md border border-gray-200 bg-gray-50 pl-3 pr-9 text-sm text-gray-900 outline-none focus:border-gray-900 focus:bg-white"
              />
              <Search
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
              Current country &amp; language
            </p>

            <div className="mb-3 flex items-center gap-2.5">
              <img src={flagUrl(current.isoCode)} alt="" width={20} height={14} className="rounded-[2px]" />
              <span className="flex-1 text-sm font-semibold text-gray-900">{current.name}</span>
              <span className="text-[11.5px] text-gray-500">
                {CURRENT_LANGUAGE} ({current.isoCode})
              </span>
            </div>

            <div className="mb-3 h-px bg-gray-100" />

            <ul role="list" className="max-h-60 space-y-0.5 overflow-y-auto">
              {results.map((country) => (
                <li key={country.isoCode}>
                  <button
                    type="button"
                    onClick={() => selectCountry(country.isoCode)}
                    className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-2 text-left hover:bg-gray-100"
                  >
                    <img
                      src={flagUrl(country.isoCode)}
                      alt=""
                      width={20}
                      height={14}
                      className="rounded-[2px]"
                    />
                    <span className="flex-1 text-sm text-gray-900">{country.name}</span>
                    <span className="whitespace-nowrap text-[11.5px] text-gray-500">
                      {CURRENT_LANGUAGE} ({country.isoCode})
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="py-3 text-center text-sm text-gray-500">No countries found.</li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

function RegionChevronDown({open}: {open: boolean}) {
  return (
    <svg
      width={9}
      height={9}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

function HeaderUtility() {
  const links = UTILITY_LINKS.filter((link) => link.label && link.url);

  return (
    <div className="hidden sm:block">
      <div className="mx-auto flex max-w-[var(--content-max-width)] items-center justify-between px-6 pt-2 pb-2 text-sm text-gray-700 lg:px-8 lg:pt-2.5 lg:pb-2.5">
        <nav className="flex items-center" role="list">
          {links.map((link, i) => (
            <NavLink
              key={`${link.label}-${i}`}
              to={link.url}
              className={`flex h-8 items-center px-2.5 hover:text-gray-950 sm:px-3.5 ${i === 0 ? 'pl-0' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <RegionPicker />
      </div>
    </div>
  );
}

function AnnouncementBar() {
  const slides = ANNOUNCEMENT_SLIDES;
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);
  const rotateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ANNOUNCEMENT_ENABLE_CLOSE && sessionStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) === 'true') {
      setDismissed(true);
    }
  }, []);

  function stopAuto() {
    if (rotateTimer.current) clearInterval(rotateTimer.current);
  }

  function startAuto() {
    if (ANNOUNCEMENT_AUTOROTATE && slides.length > 1) {
      rotateTimer.current = setInterval(() => {
        setIndex((i) => (i + 1) % slides.length);
      }, ANNOUNCEMENT_AUTOROTATE_SPEED_MS);
    }
  }

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [slides.length]);

  function goTo(next: number) {
    stopAuto();
    setIndex((next + slides.length) % slides.length);
    startAuto();
  }

  function handleClose() {
    stopAuto();
    setDismissed(true);
    if (ANNOUNCEMENT_ENABLE_CLOSE) sessionStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, 'true');
  }

  if (dismissed || slides.length === 0) return null;

  const slide = slides[index];

  return (
    <div className="bg-[#0b2559] text-sm text-white">
      <div className="relative mx-auto flex max-w-[var(--content-max-width)] items-center px-4 py-2">
        {slides.length > 1 && (
          <button
            aria-label="Previous announcement"
            onClick={() => goTo(index - 1)}
            className="shrink-0 rounded p-1 hover:bg-white/10"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div className="flex flex-1 items-center justify-center gap-3 font-semibold tracking-wide">
          <AnnouncementSlideContent slide={slide} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {slides.length > 1 && (
            <button
              aria-label="Next announcement"
              onClick={() => goTo(index + 1)}
              className="rounded p-1 hover:bg-white/10"
            >
              <ChevronRight size={16} />
            </button>
          )}
          {ANNOUNCEMENT_ENABLE_CLOSE && (
            <button aria-label="Dismiss" onClick={handleClose} className="rounded p-1 hover:bg-white/10">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnouncementSlideContent({slide}: {slide: AnnouncementSlideConfig}) {
  if (slide.type === 'announcement') {
    return slide.link ? (
      <a href={slide.link} className="border-b border-white/40 hover:border-white">
        {slide.text}
      </a>
    ) : (
      <p className="m-0">{slide.text}</p>
    );
  }
  return <CountdownContent slide={slide} />;
}

function CountdownContent({
  slide,
}: {
  slide: Extract<AnnouncementSlideConfig, {type: 'countdown'}>;
}) {
  const remainingMs = useCountdown(slide);

  if (remainingMs === null) {
    return (
      <span className="invisible flex items-center gap-1" aria-hidden="true">
        {slide.label && <span>{slide.label}</span>}
        <Unit value="00" label="d" />
        <Sep />
        <Unit value="00" label="h" />
        <Sep />
        <Unit value="00" label="m" />
        <Sep />
        <Unit value="00" label="s" />
        {slide.buttonLabel && (
          <span className="ml-1 whitespace-nowrap rounded-full border px-3.5 py-1 text-xs font-semibold">
            {slide.buttonLabel}
          </span>
        )}
      </span>
    );
  }

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <>
      {slide.label && <span>{slide.label}</span>}
      <span className="flex items-center gap-1">
        <Unit value={pad(days)} label="d" />
        <Sep />
        <Unit value={pad(hours)} label="h" />
        <Sep />
        <Unit value={pad(minutes)} label="m" />
        <Sep />
        <Unit value={pad(seconds)} label="s" />
      </span>
      {slide.buttonLabel && slide.buttonLink && (
        <a
          href={slide.buttonLink}
          className="ml-1 whitespace-nowrap rounded-full border border-white/60 px-3.5 py-1 text-xs font-semibold hover:border-white hover:bg-white/15"
        >
          {slide.buttonLabel}
        </a>
      )}
    </>
  );
}

function Unit({value, label}: {value: string; label: string}) {
  return (
    <span>
      {value}
      <em className="ml-px text-[0.625rem] not-italic uppercase opacity-70">{label}</em>
    </span>
  );
}

function Sep() {
  return <span className="mx-0.5 opacity-60">:</span>;
}

function useCountdown(slide: Extract<AnnouncementSlideConfig, {type: 'countdown'}>) {
  const endMsRef = useRef<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (slide.countdownType === 'fixed') {
      endMsRef.current = slide.endDate
        ? new Date(slide.endDate.replace(/\//g, '-')).getTime()
        : null;
    } else {
      const storageKey = `ann_countdown_${slide.evergreenMinutes}`;
      const saved = sessionStorage.getItem(storageKey);
      const endMs = saved ? parseInt(saved, 10) : Date.now() + (slide.evergreenMinutes ?? 0) * 60_000;
      sessionStorage.setItem(storageKey, String(endMs));
      endMsRef.current = endMs;
    }

    function tick() {
      if (endMsRef.current === null) {
        setRemainingMs(null);
        return;
      }
      const diff = endMsRef.current - Date.now();
      setRemainingMs(diff > 0 ? diff : null);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [slide.countdownType, slide.endDate, slide.evergreenMinutes]);

  return remainingMs;
}

function isOnSaleItem(title: string) {
  return title.trim().toLowerCase() === 'on sale';
}

function StarIcon({className}: {className?: string}) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={className}>
      <path
        d="M6 0L7.854 4.146L12 6L7.854 7.854L6 12L4.146 7.854L0 6L4.146 4.146L6 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HighlightLink({
  to,
  title,
  isActive,
  onMouseEnter,
  onFocus,
}: {
  to: string;
  title: string;
  isActive: boolean;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}) {
  return (
    <NavLink
      end
      prefetch="intent"
      to={to}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      aria-expanded={isActive}
      className="nav-item nav-item--highlight shrink-0 transition"
    >
      {title}
      <StarIcon className="nav-item__star nav-item__star--1" />
      <StarIcon className="nav-item__star nav-item__star--2" />
      <StarIcon className="nav-item__star nav-item__star--3" />
    </NavLink>
  );
}

function MenuDrawer({
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
    <div className="absolute inset-x-0 top-full z-40 max-h-[75vh] overflow-y-auto border-t border-gray-100 bg-white shadow-sm">
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
                const liveImage = sub.resourceId ? collectionImages?.[sub.resourceId] : undefined;
                const imageSrc = liveImage?.url;
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

const DEFAULT_SEARCH_SUGGESTIONS = ['anything with AI', 'iPhone 17', 'Robot Vacuum', 'LG Qned AI'];

type AiSearchBarSize = 'default' | 'compact';

const AI_SEARCH_SIZE_CONFIG: Record<
  AiSearchBarSize,
  {
    height: string;
    widthClass: string;
    paddingX: string;
    gap: string;
    iconSize: number;
    itemHeight: number;
    fontSize: number;
    lineHeight: string;
    clearSize: number;
  }
> = {
  default: {
    height: 'h-[64px]',
    widthClass: 'w-full max-w-[620px]',
    paddingX: 'px-[28px]',
    gap: 'gap-[8px]',
    iconSize: 24,
    itemHeight: 22,
    fontSize: 16,
    lineHeight: '18px',
    clearSize: 24,
  },
  compact: {
    height: 'h-[40px]',
    widthClass: 'w-full min-w-0',
    paddingX: 'px-[14px]',
    gap: 'gap-[6px]',
    iconSize: 18,
    itemHeight: 17,
    fontSize: 13,
    lineHeight: '16px',
    clearSize: 16,
  },
};

function AISearchIcon({size}: {size: number}) {
  return (
    <div className="overflow-clip relative shrink-0" style={{width: size, height: size}}>
      <div className="absolute inset-[12.77%_12.61%_12.5%_12.5%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 17.9726 17.9354"
        >
          <path d={svgPaths.p3f87f980} fill="#666F7F" />
        </svg>
      </div>
      <div className="absolute inset-[4.17%_8.33%_83.33%_79.17%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 3 3"
        >
          <path d={svgPaths.p20021000} fill="#666F7F" />
        </svg>
      </div>
      <div
        className="absolute bottom-[58.33%] flex items-center justify-center left-1/2 right-[16.67%] top-[8.33%]"
        style={{containerType: 'size'}}
      >
        <div className="flex-none h-[100cqh] rotate-180 w-[100cqw]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
            <path d={svgPaths.p3872200} fill="#666F7F" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function AiSearchCloseIconSvg() {
  return (
    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.5 13.5">
      <path d={svgPaths.pd9eea00} stroke="#666F7F" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function AiSearchBlinkingCursor({compact}: {compact: boolean}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-[1px] bg-[#559bf1] ${
        compact ? 'w-[1.5px] h-[14px]' : 'w-[2px] h-[18px]'
      }`}
      style={{animation: 'blink 1s step-end infinite'}}
    />
  );
}

function AiSearchAnimatedPlaceholder({
  index,
  suggestions,
  itemHeight,
  fontSize,
  lineHeight,
}: {
  index: number;
  suggestions: string[];
  itemHeight: number;
  fontSize: number;
  lineHeight: string;
}) {
  return (
    <div className="overflow-hidden min-w-0 flex-1" style={{height: itemHeight}}>
      <div
        className="transition-transform duration-500 ease-in-out"
        style={{transform: `translateY(-${index * itemHeight}px)`}}
      >
        {suggestions.map((s) => (
          <div
            key={s}
            className="flex items-center overflow-hidden whitespace-nowrap text-ellipsis"
            style={{
              height: itemHeight,
              fontFamily: "'Rubik', sans-serif",
              fontSize,
              lineHeight,
              color: '#7f8999',
              fontWeight: 400,
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

const aiSearchPillBg = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 620 64' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0'height='100%' width='100%' fill='url(%23grad)' opacity='0.11999999731779099'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse'cx='0' cy='0' r='10' gradientTransform='matrix(36.141 -3.4171e-14 8.2601e-14 12.373 310 32)'><stop stop-color='rgba(255,255,255,0)' offset='0.45'/><stop stop-color='rgba(255,255,255,1)' offset='1'/></radialGradient></defs></svg>\"), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.053) 0%, rgba(188, 182, 237, 0.22) 100%)",
};

interface AiSearchBarProps {
  value: string;
  onQueryChange: (value: string) => void;
  onSearch: (query: string) => void;
  onFocus?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  suggestions?: string[];
  className?: string;
  size?: AiSearchBarSize;
}

const AiSearchBar = forwardRef<HTMLDivElement, AiSearchBarProps>(function AiSearchBar(
  {
    value,
    onQueryChange,
    onSearch,
    onFocus,
    inputRef: externalInputRef,
    suggestions = DEFAULT_SEARCH_SUGGESTIONS,
    className = '',
    size = 'default',
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const cfg = AI_SEARCH_SIZE_CONFIG[size];
  const compact = size === 'compact';

  useEffect(() => {
    if (value.length > 0) return;
    const id = setInterval(() => {
      setSuggestionIndex((i) => (i + 1) % suggestions.length);
    }, 2200);
    return () => clearInterval(id);
  }, [value, suggestions.length]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onQueryChange('');
      inputRef.current?.focus();
    },
    [inputRef, onQueryChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch(value.trim());
    }
    if (e.key === 'Escape') {
      onQueryChange('');
      inputRef.current?.blur();
    }
  };

  const isTyping = value.length > 0;
  const showX = focused || isTyping;

  return (
    <div
      ref={ref}
      className={`relative cursor-text ${cfg.height} ${cfg.widthClass} ${className}`}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="absolute inset-0 rounded-[999px]" style={aiSearchPillBg} />
      <div
        aria-hidden
        className="absolute border-2 border-[rgba(193,193,193,0.6)] border-solid inset-0 rounded-[999px]"
        style={{
          boxShadow: compact
            ? '0px 2px 6px 0px rgba(16,24,40,0.06)'
            : '0px 7px 15px 0px rgba(176,194,250,0.2), 0px 4px 10.3px 0px rgba(0,0,0,0.03), 0px 17px 25.8px 0px rgba(0,0,0,0.06), 0px 4px 6px 0px rgba(255,255,255,0.32)',
        }}
      />
      <div
        className="absolute inset-0 rounded-[999px]"
        style={{
          boxShadow:
            'inset 0px -1px 18px 0px rgba(255,255,255,0.4), inset 0px -1px 14px 0px rgba(255,255,255,0.56), inset 0px 0px 16px 0px rgba(0,0,0,0.02), inset 0px -4px 8px 0px rgba(0,0,0,0.03), inset 0px -1px 2px 0px rgba(0,0,0,0.02), inset 0px -0.5px 0.5px 0px rgba(0,0,0,0.04), inset 0px 10px 12px 0px rgba(0,0,0,0.04)',
        }}
      />

      <div className={`absolute inset-0 flex items-center ${cfg.paddingX} ${cfg.gap}`}>
        <AISearchIcon size={cfg.iconSize} />

        <div className="relative flex-1 flex items-center min-w-0 gap-[1px]">
          {isTyping ? (
            <>
              <span
                className="whitespace-nowrap shrink-0"
                style={{
                  fontFamily: "'Rubik', sans-serif",
                  fontSize: cfg.fontSize,
                  lineHeight: cfg.lineHeight,
                  color: '#0b0c0e',
                  fontWeight: 400,
                }}
              >
                {value}
              </span>
              {focused && <AiSearchBlinkingCursor compact={compact} />}
            </>
          ) : (
            <>
              {focused ? (
                <AiSearchBlinkingCursor compact={compact} />
              ) : (
                <span
                  className="whitespace-nowrap shrink-0 mr-[4px]"
                  style={{
                    fontFamily: "'Rubik', sans-serif",
                    fontSize: cfg.fontSize,
                    lineHeight: cfg.lineHeight,
                    color: '#7f8999',
                    fontWeight: 400,
                  }}
                >
                  Search
                </span>
              )}
            </>
          )}

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              setFocused(true);
              onFocus?.();
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            aria-label="AI Search"
            className="absolute inset-0 opacity-0 cursor-text w-full bg-transparent"
            style={{caretColor: 'transparent'}}
          />
        </div>

        <button
          className={`relative shrink-0 cursor-pointer overflow-hidden transition-opacity duration-150 ${
            showX ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{width: cfg.clearSize, height: cfg.clearSize}}
          onMouseDown={handleClear}
          aria-label="Clear search"
          tabIndex={showX ? 0 : -1}
        >
          <div className="absolute inset-1/4">
            <div className="absolute inset-[-6.25%]">
              <AiSearchCloseIconSvg />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
});

function SearchIcon() {
  return (
    <div className="overflow-clip relative size-[22px] shrink-0">
      <div className="absolute inset-[12.77%_12.61%_12.5%_12.5%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          height="17.9354"
          preserveAspectRatio="none"
          viewBox="0 0 17.9726 17.9354"
          width="17.9726"
        >
          <path d={svgPaths.p3f87f980} fill="#666F7F" />
        </svg>
      </div>
      <div className="absolute inset-[4.17%_8.33%_83.33%_79.17%]">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          height="3"
          preserveAspectRatio="none"
          viewBox="0 0 3 3"
          width="3"
        >
          <path d={svgPaths.p20021000} fill="#666F7F" />
        </svg>
      </div>
      <div
        className="absolute bottom-[58.33%] flex items-center justify-center left-1/2 right-[16.67%] top-[8.33%]"
        style={{ containerType: "size" }}
      >
        <div className="flex-none h-[100cqh] rotate-180 w-[100cqw]">
          <svg
            className="block size-full"
            fill="none"
            height="8"
            preserveAspectRatio="none"
            viewBox="0 0 8 8"
            width="8"
          >
            <path d={svgPaths.p3872200} fill="#666F7F" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function CloseIconSvg() {
  return (
    <svg
      className="block size-full"
      fill="none"
      height="13.5"
      preserveAspectRatio="none"
      viewBox="0 0 13.5 13.5"
      width="13.5"
    >
      <path
        d={svgPaths.pd9eea00}
        stroke="#666F7F"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function BlinkingCursor() {
  return (
    <span
      className="inline-block w-[1.5px] h-[13px] bg-[#559bf1] shrink-0 rounded-[1px]"
      style={{ animation: "blink 1s step-end infinite" }}
    />
  );
}

const pillBg = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 620 64' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0'height='100%' width='100%' fill='url(%23grad)' opacity='0.11999999731779099'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse'cx='0' cy='0' r='10' gradientTransform='matrix(36.141 -3.4171e-14 8.2601e-14 12.373 310 32)'><stop stop-color='rgba(255,255,255,0)' offset='0.45'/><stop stop-color='rgba(255,255,255,1)' offset='1'/></radialGradient></defs></svg>\"), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.053) 0%, rgba(188, 182, 237, 0.22) 100%)",
};

const focusedShadow =
  "0px 2px 4px 0px rgba(16,24,40,0.06), 0px 4px 10px 0px rgba(85,155,241,0.12)";

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (node: T | null) => void {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    }
  };
}

export interface SearchBarProps {
  value: string;
  onQueryChange: (value: string) => void;
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
}

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  function SearchBar(
    {value, onQueryChange, onSearch, onFocus, className = "", inputRef, autoFocus},
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const internalInputRef = useRef<HTMLInputElement>(null);

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onQueryChange("");
        internalInputRef.current?.focus();
      },
      [onQueryChange],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim()) {
        onSearch?.(value.trim());
      }
      if (e.key === "Escape") {
        onQueryChange("");
        internalInputRef.current?.blur();
      }
    };

    const isTyping = value.length > 0;
    const showX = focused || isTyping;

    return (
      <div
        ref={ref}
        className={`relative h-[36px] w-full cursor-text ${className}`}
        onClick={() => internalInputRef.current?.focus()}
      >
        <div className="absolute inset-0 rounded-[999px]" style={pillBg} />
        <div
          aria-hidden
          className="absolute border-2 border-[rgba(193,193,193,0.6)] border-solid inset-0 rounded-[999px] transition-shadow duration-150"
          style={{boxShadow: focused ? focusedShadow : 'none'}}
        />
        <div
          className="absolute inset-0 rounded-[999px]"
          style={{
            boxShadow:
              "inset 0px -1px 18px 0px rgba(255,255,255,0.4), inset 0px -1px 14px 0px rgba(255,255,255,0.56), inset 0px 0px 16px 0px rgba(0,0,0,0.02), inset 0px -4px 8px 0px rgba(0,0,0,0.03), inset 0px -1px 2px 0px rgba(0,0,0,0.02), inset 0px -0.5px 0.5px 0px rgba(0,0,0,0.04), inset 0px 10px 12px 0px rgba(0,0,0,0.04)",
          }}
        />

        <div className="absolute inset-0 flex items-center px-[12px] gap-[6px]">
          <SearchIcon />

          <div className="relative flex-1 flex items-center min-w-0 gap-[1px]">
            {isTyping ? (
              <>
                <span
                  className="whitespace-nowrap shrink-0"
                  style={{fontFamily: "'Rubik', sans-serif", fontSize: 13, lineHeight: "16px", color: "#0b0c0e", fontWeight: 400}}
                >
                  {value}
                </span>
                {focused && <BlinkingCursor />}
              </>
            ) : focused ? (
              <BlinkingCursor />
            ) : (
              <span
                className="whitespace-nowrap shrink-0"
                style={{fontFamily: "'Rubik', sans-serif", fontSize: 13, lineHeight: "16px", color: "#7f8999", fontWeight: 400}}
              >
                Search
              </span>
            )}

            <input
              ref={mergeRefs(internalInputRef, inputRef)}
              autoFocus={autoFocus}
              type="text"
              value={value}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => {
                setFocused(true);
                onFocus?.();
              }}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              aria-label="Search"
              className="absolute inset-0 opacity-0 cursor-text w-full bg-transparent"
              style={{caretColor: "transparent"}}
            />
          </div>

          <button
            className={`relative shrink-0 size-[15px] cursor-pointer overflow-hidden transition-opacity duration-150 ${
              showX ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onMouseDown={handleClear}
            aria-label="Clear search"
            tabIndex={showX ? 0 : -1}
          >
            <div className="absolute inset-1/4">
              <div className="absolute inset-[-6.25%]">
                <CloseIconSvg />
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  },
);

type PredictiveSearchHit = {
  objectID: string;
  title: string;
  handle: string;
  image_url: string | null;
  price: number | null;
  compare_at_price: number | null;
  is_eco: boolean;
  vendor?: string | null;
};

type PredictiveCollection = {
  id: string;
  title: string;
  handle: string;
  image_url: string | null;
};

type PredictiveArticle = {
  id: string;
  title: string;
  handle: string;
  blog_handle: string;
  image_url: string | null;
  published_at: string;
};

type PredictivePage = {
  id: string;
  title: string;
  handle: string;
};

type PredictiveSearchResponse = {
  hits: PredictiveSearchHit[];
  querySuggestions: string[];
  vendors: string[];
  collections: PredictiveCollection[];
  articles: PredictiveArticle[];
  pages: PredictivePage[];
  error?: string;
};

const RECENT_SEARCHES_KEY = 'ecombio:recent-searches';
const MAX_RECENT_SEARCHES = 5;

function formatMoney(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function HighlightedText({text, query}: {text: string; query: string}) {
  const q = query.trim();
  if (!q) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <span>
      {before}
      <span className="font-bold text-gray-950">{match}</span>
      {after}
    </span>
  );
}

function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(terms: string[]) {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch {
  }
}

function SearchPanel({
  open,
  onClose,
  triggerRef,
  term,
  onTermChange,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  term: string;
  onTermChange: (value: string) => void;
  onNavigate: (value: string) => void;
}) {
  const fetcher = useFetcher<PredictiveSearchResponse>();

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (open) setRecentSearches(readRecentSearches());
  }, [open]);

  useEffect(() => {
    if (!term) return;
    const timeout = setTimeout(() => {
      fetcher.load(`/api/predictive-search?q=${encodeURIComponent(term)}`);
    }, 250);
    return () => clearTimeout(timeout);
  }, [term]);

  const hits: PredictiveSearchHit[] = term ? fetcher.data?.hits ?? [] : [];
  const querySuggestions = term ? fetcher.data?.querySuggestions ?? [] : [];
  const vendors = term ? fetcher.data?.vendors ?? [] : [];
  const collections = term ? fetcher.data?.collections ?? [] : [];
  const articles = term ? fetcher.data?.articles ?? [] : [];
  const pages = term ? fetcher.data?.pages ?? [] : [];
  const error = fetcher.data?.error ?? null;

  const state: 'idle' | 'loading' =
    term && (fetcher.state === 'loading' || fetcher.state === 'submitting')
      ? 'loading'
      : 'idle';

  const matchingRecent = term
    ? recentSearches.filter((r) =>
        r.toLowerCase().includes(term.toLowerCase()),
      )
    : [];

  const hasSuggestions =
    matchingRecent.length > 0 ||
    querySuggestions.length > 0 ||
    vendors.length > 0 ||
    collections.length > 0 ||
    pages.length > 0;

  const primaryCollection = collections[0] ?? null;

  const panelRef = useRef<HTMLDivElement>(null);
  const panelInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) panelInputRef.current?.focus();
  }, [open]);

  function closeSearch() {
    onTermChange('');
    onClose();
  }

  function applySuggestion(value: string) {
    onTermChange(value);
    panelInputRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, triggerRef]);

  useEffect(() => {
    if (!open) return;
    function onScroll() {
      onClose();
    }
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, [open, onClose]);

  const total = hits.length;
  const topOffset = 0;

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{top: topOffset}}
        className={`fixed inset-x-0 bottom-0 z-[900] bg-black/40 backdrop-blur-[6px] transition-opacity duration-200 ease-out ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        style={{top: topOffset}}
        className={`fixed inset-x-0 z-[901] grid max-h-[calc(100vh-var(--sp-top,0px))] border-b border-gray-200 bg-white shadow-2xl transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'pointer-events-none grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-auto max-h-[80vh] max-w-[1080px] overflow-y-auto px-6 py-5">
            <div className="search-bar flex items-center gap-3">
              <SearchBar
                inputRef={panelInputRef}
                className="flex-1"
                value={term}
                onQueryChange={onTermChange}
                onSearch={onNavigate}
              />
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="shrink-0 text-sm font-semibold text-gray-950 transition hover:text-gray-600"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4">
              {!term ? (
                <PopularSearches
                  terms={TRENDING_SEARCH_TERMS}
                  onSelect={onTermChange}
                />
              ) : state === 'loading' ? (
                <SearchResultsSkeleton />
              ) : error ? (
                <div>
                  <p className="text-sm text-red-600">{error}</p>
                  <div className="mt-7">
                    <PopularSearches
                      terms={TRENDING_SEARCH_TERMS}
                      onSelect={onTermChange}
                    />
                  </div>
                </div>
              ) : !total && !hasSuggestions ? (
                <div>
                  <p className="text-sm text-gray-500">
                    No results found for <q>{term}</q>
                  </p>
                  <div className="mt-7">
                    <PopularSearches
                      terms={TRENDING_SEARCH_TERMS}
                      onSelect={onTermChange}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
                  {hasSuggestions && (
                    <SuggestionsRail
                      term={term}
                      recent={matchingRecent}
                      queries={querySuggestions}
                      vendors={vendors}
                      collections={collections}
                      pages={pages}
                      onSelectTerm={applySuggestion}
                    />
                  )}
                  <div className="min-w-0">
                    {total > 0 && (
                      <div>
                        <p className="mb-4 text-sm text-gray-400">
                          Products
                          {primaryCollection && (
                            <span className="ml-1.5 font-semibold text-gray-800">
                              In {primaryCollection.title}
                            </span>
                          )}
                        </p>
                        <ProductHitsCarousel hits={hits} onNavigate={closeSearch} />
                        <div className="mt-6 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate(term);
                              onClose();
                            }}
                            className="inline-flex items-center justify-center rounded-sm bg-gray-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                          >
                            See all results for &ldquo;{term}&rdquo;
                          </button>
                        </div>
                      </div>
                    )}
                    {articles.length > 0 && (
                      <div className={total > 0 ? 'mt-8' : ''}>
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm text-gray-400">Articles</p>
                          <Link
                            to={`/search?q=${encodeURIComponent(term)}&type=article`}
                            onClick={closeSearch}
                            className="text-sm font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-900"
                          >
                            See all
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {articles.slice(0, 2).map((article) => (
                            <Link
                              key={article.id}
                              to={`/blogs/${article.blog_handle}/${article.handle}`}
                              onClick={closeSearch}
                              className="group flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 transition hover:border-gray-200 hover:bg-gray-50"
                            >
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                {article.image_url ? (
                                  <img
                                    src={article.image_url}
                                    alt={article.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <ImageOff size={16} className="text-gray-300" aria-hidden="true" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-gray-950">
                                  {article.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Published{' '}
                                  {formatArticleDate(article.published_at)}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

const MAX_SUGGESTIONS = 8;

function SuggestionsRail({
  term,
  recent,
  queries,
  vendors,
  collections,
  pages,
  onSelectTerm,
}: {
  term: string;
  recent: string[];
  queries: string[];
  vendors: string[];
  collections: PredictiveCollection[];
  pages: PredictivePage[];
  onSelectTerm: (term: string) => void;
}) {
  let remaining = MAX_SUGGESTIONS;
  const take = <T,>(items: T[]): T[] => {
    if (remaining <= 0) return [];
    const slice = items.slice(0, remaining);
    remaining -= slice.length;
    return slice;
  };
  const shownRecent = take(recent);
  const shownQueries = take(queries);
  const shownVendors = take(vendors);
  const shownCollections = take(collections);
  const shownPages = take(pages);

  return (
    <div className="border-b border-gray-100 pb-6 md:border-b-0 md:border-r md:border-gray-100 md:pb-0 md:pr-6">
      <p className="mb-4 text-sm text-gray-400">Suggestions</p>
      <div className="flex flex-col gap-1.5">
        {shownRecent.map((value) => (
          <SuggestionRow
            key={`recent-${value}`}
            icon={<RotateCcw size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {shownQueries.map((value) => (
          <SuggestionRow
            key={`query-${value}`}
            icon={<Search size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {shownVendors.map((value) => (
          <SuggestionRow
            key={`vendor-${value}`}
            icon={<Tag size={15} aria-hidden="true" />}
            label={value}
            query={term}
            onClick={() => onSelectTerm(value)}
          />
        ))}
        {shownCollections.map((collection) => (
          <Link
            key={collection.id}
            to={`/collections/${collection.handle}`}
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="text-gray-400">
              <LayoutGrid size={15} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              <HighlightedText text={collection.title} query={term} />
            </span>
          </Link>
        ))}
        {shownPages.map((page) => (
          <Link
            key={page.id}
            to={`/pages/${page.handle}`}
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="text-gray-400">
              <Info size={15} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 leading-snug">
              <HighlightedText text={page.title} query={term} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SuggestionRow({
  icon,
  label,
  query,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-sm text-gray-800 transition hover:bg-gray-50"
    >
      <span className="text-gray-400">{icon}</span>
      <span className="min-w-0 flex-1 leading-snug">
        <HighlightedText text={label} query={query} />
      </span>
      <span className="shrink-0 text-gray-300 opacity-0 transition group-hover:opacity-100">
        <ArrowUpLeft size={14} aria-hidden="true" />
      </span>
    </button>
  );
}

function ProductHitsCarousel({
  hits,
  onNavigate,
}: {
  hits: PredictiveSearchHit[];
  onNavigate: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 1);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, {passive: true});
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, hits.length]);

  function scrollByDirection(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-carousel-item]');
    const styles = card ? getComputedStyle(el) : null;
    const gap = styles ? parseFloat(styles.columnGap || styles.gap || '0') : 0;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({left: step * direction, behavior: 'smooth'});
  }

  if (!hits.length) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="group"
        aria-label="Product results"
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {hits.map((hit) => (
          <div
            key={hit.objectID}
            data-carousel-item
            className="w-[45%] shrink-0 snap-start sm:w-[31%] lg:w-[23%]"
          >
            <ProductHit hit={hit} onNavigate={onNavigate} />
          </div>
        ))}
      </div>
      {canScrollPrev && (
        <button
          type="button"
          onClick={() => scrollByDirection(-1)}
          aria-label="Scroll to previous products"
          className="absolute left-0 top-1/2 hidden -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2 text-gray-700 shadow-md ring-1 ring-gray-200 transition hover:bg-gray-50 sm:flex"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11 4.5 6.5 9l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          onClick={() => scrollByDirection(1)}
          aria-label="Scroll to next products"
          className="absolute right-0 top-1/2 hidden translate-x-3 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2 text-gray-700 shadow-md ring-1 ring-gray-200 transition hover:bg-gray-50 sm:flex"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M7 4.5 11.5 9 7 13.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function ProductHit({
  hit,
  onNavigate,
}: {
  hit: PredictiveSearchHit;
  onNavigate: () => void;
}) {
  const price = formatMoney(hit.price);
  const compareAtPrice = formatMoney(hit.compare_at_price);
  const onSale =
    hit.compare_at_price != null &&
    hit.price != null &&
    hit.compare_at_price > hit.price;
  const percentOff =
    onSale && hit.price != null && hit.compare_at_price != null
      ? Math.round((1 - hit.price / hit.compare_at_price) * 100)
      : null;

  return (
    <div className="group relative">
      <Link to={`/products/${hit.handle}`} onClick={onNavigate}>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 ring-1 ring-transparent transition group-hover:ring-gray-200">
          {hit.image_url ? (
            <img
              src={hit.image_url}
              alt={hit.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff size={22} className="text-gray-300" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {hit.is_eco && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                ECO
              </span>
            )}
            {percentOff !== null && percentOff > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                -{percentOff}% OFF
              </span>
            )}
          </div>
        </div>
        {hit.vendor && (
          <p className="mt-2.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {hit.vendor}
          </p>
        )}
        <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-gray-900 group-hover:text-gray-950">
          {hit.title}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          {price && (
            <span className="text-[15px] font-semibold text-gray-900">
              {price}
            </span>
          )}
          {onSale && compareAtPrice && (
            <span className="text-[13px] text-gray-400 line-through">
              {compareAtPrice}
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Add ${hit.title} to wishlist`}
        onClick={(e) => e.preventDefault()}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition hover:bg-white"
      >
        <Heart size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function PopularSearches({
  terms,
  onSelect,
}: {
  terms: string[];
  onSelect: (term: string) => void;
}) {
  if (!terms.length) return null;
  return (
    <div>
      <p className="search-title text-sm text-gray-400">Popular Search Terms</p>
      <div className="search-terms flex flex-wrap">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect(term)}
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-200"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      {Array.from({length: 6}).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square w-full rounded-xl bg-gray-100" />
          <div className="mt-2.5 h-3.5 w-4/5 rounded bg-gray-100" />
          <div className="mt-2 h-3.5 w-1/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function HeaderSearch({
  size = 'default',
}: {
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
    <div className="search-trigger flex min-w-0 flex-1 items-center">
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

function HeaderCtas({
  isLoggedIn,
  cart,
  customer,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart' | 'customer'>) {
  return (
    <nav className="flex shrink-0 items-center gap-3 sm:gap-6" role="navigation">
      <HeaderAccount isLoggedIn={isLoggedIn} customer={customer} />
      {SHOW_WISHLIST_CTA && <WishlistToggle />}
      {SHOW_COMPARE_CTA && <CompareToggle />}
      <CartToggle cart={cart} />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      aria-label="Open menu"
      className="shrink-0 rounded p-1 text-gray-800 hover:text-gray-950 lg:hidden"
      onClick={() => open('mobile')}
    >
      <span className="text-lg">☰</span>
    </button>
  );
}

function HeaderAccount({
  isLoggedIn,
  customer,
}: {
  isLoggedIn: Promise<boolean>;
  customer?: Promise<{firstName: string | null} | null>;
}) {
  return (
    <NavLink
      prefetch="intent"
      to="/account"
      className="flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-gray-950"
      aria-label="Account"
    >
      <Suspense fallback={<AccountContent label="Sign in/ Register" />}>
        <Await
          resolve={isLoggedIn}
          errorElement={<AccountContent label="Sign in/ Register" />}
        >
          {(loggedIn) => {
            if (!loggedIn) {
              return <AccountContent label="Sign in/ Register" />;
            }
            if (!customer) {
              return <AccountContent label="Account" />;
            }
            return (
              <Suspense fallback={<AccountContent label="Account" />}>
                <Await
                  resolve={customer}
                  errorElement={<AccountContent label="Account" />}
                >
                  {(customerData) => (
                    <AccountContent
                      label={
                        customerData?.firstName
                          ? `Hi, ${customerData.firstName}`
                          : 'Account'
                      }
                    />
                  )}
                </Await>
              </Suspense>
            );
          }}
        </Await>
      </Suspense>
    </NavLink>
  );
}

function AccountContent({label}: {label: string}) {
  return (
    <>
      <User size={28} aria-hidden="true" />
    </>
  );
}

function CartBadge({count = 0}: {count?: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <Link
      to="/cart"
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
      className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition hover:text-gray-600"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <span className="relative">
        <ShoppingBag size={28} className="shrink-0" aria-hidden="true" />
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-semibold leading-none text-white"
            aria-hidden="true"
          >
            {count}
          </span>
        )}
      </span>
    </Link>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}

function WishlistBadge({count = 0}: {count?: number}) {
  return (
    <Link
      to="/wishlist"
      className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition hover:text-gray-600"
      aria-label={`Wishlist, ${count} item${count === 1 ? '' : 's'}`}
    >
      <span className="relative">
        <Heart size={17} className="shrink-0" aria-hidden="true" />
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-semibold leading-none text-white"
            aria-hidden="true"
          >
            {count}
          </span>
        )}
      </span>
      <span className="hidden sm:inline" aria-hidden="true">
        Wishlist
      </span>
    </Link>
  );
}

function WishlistToggle() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readWishlist().length);

    function onWishlistUpdated(e: Event) {
      const detail = (e as CustomEvent<{items: WishlistEntry[]}>).detail;
      setCount(detail?.items?.length ?? readWishlist().length);
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== WISHLIST_KEY) return;
      setCount(readWishlist().length);
    }

    document.addEventListener('wishlist:updated', onWishlistUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('wishlist:updated', onWishlistUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return <WishlistBadge count={count} />;
}

function CompareBadge({count = 0}: {count?: number}) {
  return (
    <Link
      to="/compare"
      className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition hover:text-gray-600"
      aria-label={`Compare, ${count} of ${COMPARE_MAX} item${count === 1 ? '' : 's'}`}
    >
      <span className="relative">
        <Scale size={17} className="shrink-0" aria-hidden="true" />
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-semibold leading-none text-white"
            aria-hidden="true"
          >
            {count}
          </span>
        )}
      </span>
      <span className="hidden sm:inline" aria-hidden="true">
        Compare
      </span>
    </Link>
  );
}

function CompareToggle() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readCompareList().length);

    function onCompareUpdated(e: Event) {
      const detail = (e as CustomEvent<{items: CompareEntry[]}>).detail;
      setCount(detail?.items?.length ?? readCompareList().length);
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== COMPARE_KEY) return;
      setCount(readCompareList().length);
    }

    document.addEventListener('compare:updated', onCompareUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('compare:updated', onCompareUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return <CompareBadge count={count} />;
}