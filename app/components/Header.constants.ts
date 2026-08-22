// Promo/announcement bar
export const PROMO_MESSAGE = '✌️ Free Express Shipping on orders $500!';
// "Evergreen" countdown — resets to this many minutes remaining for every visitor.
// (Matches the live site's data-duration="720", i.e. 12 hours.)
export const PROMO_COUNTDOWN_MINUTES = 720;

// How long to wait before closing the mega menu after the pointer leaves,
// so moving diagonally from the link down into the panel doesn't close it.
export const MEGA_MENU_CLOSE_DELAY = 150;

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

// Wordmark asset used by the live Liquid theme.
export const LOGO_SRC =
  '//ecombio.com/cdn/shop/files/wordmark.svg?v=1781367807&width=140';

// Real collection images from the live site, keyed by menu item title.
// Swap this for `image { url altText }` on the header GraphQL query once
// that's wired up server-side — this is a stopgap so visuals match today.
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

// "Good to know" sidebar tips shown in a mega menu panel, keyed by the
// top-level menu item title.
export const MEGA_MENU_TIPS: Record<string, string[]> = {
  'Electric Scooters': ['Trade-in: Get up to $700 for your old device'],
};

export const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500001',
      resourceId: null,
      tags: [],
      title: 'Single Link',
      type: 'HTTP',
      url: '/pages/single-link',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Electric Bicycles',
      type: 'HTTP',
      url: '/collections/electric-bicycles',
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
      url: '/collections/electric-scooters',
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
      url: '/pages/more',
      items: [],
    },
  ],
};
