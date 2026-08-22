// Wordmark asset used by the live Liquid theme.
export const LOGO_SRC =
  '//ecombio.com/cdn/shop/files/wordmark.svg?v=1781367807&width=140';

// ─────────────────────────────────────────────────────────────────────────
// Announcement bar
// Stand-in for sections/announcement-bar.liquid's ann_1..ann_5 settings.
// Swap for a metaobject/Storefront API query if merchants need to edit
// this without a deploy.
// ─────────────────────────────────────────────────────────────────────────
export type AnnouncementSlideConfig =
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
export const ANNOUNCEMENT_SLIDES: AnnouncementSlideConfig[] = [
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

export const ANNOUNCEMENT_ENABLE_CLOSE = true;
export const ANNOUNCEMENT_AUTOROTATE = true;
export const ANNOUNCEMENT_AUTOROTATE_SPEED_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────
// Utility bar
// Stand-in for sections/utility-bar.liquid's link_1..link_3 settings.
// ─────────────────────────────────────────────────────────────────────────
export interface UtilityLink {
  label: string;
  url: string;
  icon?: string;
}

export const UTILITY_LINKS: UtilityLink[] = [
  {label: 'Track Order', url: '/apps/track'},
  {label: 'Store Locator', url: '/pages/stores'},
  {label: 'Track Order', url: '/apps/track'},
];

// ─────────────────────────────────────────────────────────────────────────
// Region / language picker
// Stand-in for `localization.available_countries` / `.available_languages`.
// Replace with a real Storefront API / root-loader query when wiring this
// up to Hydrogen's actual localization flow.
// ─────────────────────────────────────────────────────────────────────────
export interface Country {
  name: string;
  isoCode: string;
}

export const CURRENT_COUNTRY = 'US';
export const CURRENT_LANGUAGE = 'English';

export const COUNTRIES: Country[] = [
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
export const TRENDING_SEARCH_TERMS = [
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
export const MEGA_MENU_CLOSE_DELAY = 150;

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
export const MENU_COLLECTION_IMAGES_QUERY = `#graphql
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

export interface CollectionImage {
  url: string;
  altText: string | null;
}

// Static fallback, keyed by menu item title — used only when a submenu
// item doesn't resolve to a live collection image (a custom link, a page,
// or a collection with no image set in the Admin).
export const SUBMENU_IMAGES: Record<string, string> = {
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
export interface ShowcaseTip {
  icon?: string; // 'truck' | 'shield' | 'gift' | 'clock' | 'return' | 'tag' | ...
  heading: string;
  body?: string;
}

export const SHOWCASE_TIPS: Record<string, ShowcaseTip[]> = {
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
export const SHOWCASE_SEE_ALL: Record<string, {label?: string; link?: string}> = {};

export const FALLBACK_HEADER_MENU = {
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