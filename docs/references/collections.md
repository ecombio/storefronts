# Collections

> **Description:** Reference for the collection page (`/collections/[handle]`) in the Ecombio storefront. It explains how product browsing works and how to maintain the two features built on top of the grid: the deals carousel and the feed items (promo cards, tip cards, and article banners between products). Read it before changing the collection grid, the on-sale rule, or the cards between products.
>
> **Last updated:** 2026-10-01

How the collection page (`/collections/[handle]`) works, with the two features added on top of the product grid: the **deals carousel** and **feed items**.

## What the page shows

1. Header, tabs, filters, and toolbar (unchanged).
2. Sub-collection tiles.
3. **Deals carousel**: on-sale products in this collection, titled "<collection name> deals". Hidden when there are none.
4. **Product grid** with infinite scroll. It holds only full-price products, because on-sale products live in the carousel.
5. **Feed items** (promo cards, tip cards, article banners) placed between products in the grid.

## Files

| Area          | File                                               | Role                                                                 |
| ------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Page          | `app/collections/[handle]/page.tsx`                | Starts the deals fetch and asks the grid to exclude on-sale products |
| Page layout   | `components/collections/collection-page.tsx`       | Renders the carousel above the grid                                  |
| Carousel      | `components/collections/deals-carousel.tsx`        | Client component: scroll track and arrow buttons                     |
| Grid (server) | `components/collections/results-grid.tsx`          | Builds the first page and the feed items                             |
| Grid (client) | `components/collections/infinite-product-grid.tsx` | Infinite scroll, merges feed items in by position                    |
| Feed content  | `lib/collections/feed-items.ts`                    | **The list of feed items. This is the file you edit.**               |
| Feed card     | `components/collections/feed-item-card.tsx`        | One card component for every feed item                               |
| Data          | `lib/collections/server.ts`                        | `getCollectionDeals`, `fetchCollectionProductsExcludingSale`         |
| Load more     | `lib/collections/action.ts`                        | Server action for infinite scroll, carries the exclude flag          |
| Sale rule     | `lib/product/sale.ts`                              | `isOnSale`, the one definition of "on sale"                          |

## Deals carousel

**What counts as a deal.** A product whose compare-at price is above its price. This is the same rule as the Price drop badge, and it lives in `isOnSale` in `lib/product/sale.ts`. Change the rule there and both the carousel and the grid follow.

**How deals are found.** The Storefront API cannot filter on compare-at price, so `getCollectionDeals` reads the collection 100 products at a time, up to 5 pages (500 products), and keeps the on-sale ones. The result is cached for a few minutes and tagged with the collection and its products, so product and collection updates refresh it.

**How the grid excludes them.** `fetchCollectionProductsExcludingSale` drops on-sale products from each page. If a page of 24 comes back short, it reads further pages until it fills, up to 4. The same exclusion runs for every infinite-scroll page through the `excludeOnSale` flag in `lib/collections/action.ts`.

**Failure behavior.** If the deals lookup fails, the carousel is hidden and the page still renders. A collection with no deals shows no carousel.

**Known limits**

- The carousel ignores the sidebar filters, so "Under $1000" still shows every deal.
- The "N results" tab count and the sidebar filter counts still include on-sale products, so they read higher than the grid.
- A collection with more than 500 products may have deals beyond what the carousel reads. Raise `DEALS_MAX_PAGES` in `lib/collections/server.ts` if that matters.
- `/collections/all` uses a different search backend. The grid there is not filtered and has no carousel.

## Feed items

Feed items are cards placed between products. Edit `lib/collections/feed-items.ts`; each entry in `FEED_ITEMS` is one card.

### Fields

| Field         | Required | Meaning                                                                 |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `id`          | yes      | Unique name, used as the React key                                      |
| `position`    | yes      | Shown after this many products (`6` puts it after the 6th product)      |
| `width`       | no       | `1` (default), `2`, or `"full"` for a whole row                         |
| `icon`        | no       | A lucide icon, shown in a dark round pill above the title               |
| `label`       | no       | Small uppercase text above the title                                    |
| `title`       | yes      | Heading text                                                            |
| `body`        | no       | Supporting text                                                         |
| `image`       | no       | `{ src, alt }`. Use a file in `public/`, like `/promo.png`              |
| `href`        | no       | Makes the whole card a link                                             |
| `linkLabel`   | no       | Link text. Needs `href`, otherwise no link text shows                   |
| `className`   | no       | Tailwind classes for background and text colour. Defaults to `bg-white` |
| `collections` | no       | List of collection handles. Leave out to show everywhere                |

### Layout by width

- **1 wide:** a poster. Title and body on top, artwork filling the middle, link at the bottom. With no image, the text sits at the bottom of the card.
- **2 wide:** copy on the left half, bottom-aligned, with an underlined link. Artwork on the right half, hidden on small screens.
- **Full row:** artwork on the left, copy in the middle, a bordered button on the right.

### Add a feed item

1. Open `lib/collections/feed-items.ts`.
2. Add an entry to `FEED_ITEMS`:

   ```ts
   {
     id: "free-returns",
     position: 12,
     width: 2,
     label: "Returns",
     title: "Your headline here",
     body: "One short supporting sentence.",
     image: { src: "/free-returns.png", alt: "" },
     href: "/pages/returns",
     linkLabel: "Learn more",
     className: "bg-[#e9e1f7]",
     collections: ["electric-bikes"],
   },
   ```

3. Save. The dev server reloads. For production, commit and deploy as usual.

### Behavior to know

- Items are placed by absolute product position, so they stay put as infinite scroll loads more pages.
- An item appears only once that many products have loaded. A `position` of 18 shows nothing in a collection with 10 products.
- The grid uses dense flow, so a 2-wide or full-row card does not leave a hole at the end of a row. Rows can reorder slightly across screen sizes.
- Feed items are hidden in list view.
- Feed items show regardless of the active filters or sort.
- Tailwind only generates classes it can see in the source. A colour like `bg-[#e9e1f7]` works when written in `feed-items.ts`.
- Remote images need their domain allowed in `next.config`. Local images in `public/` need nothing.
- The shipped entries are placeholders with `/` links. Replace the text and links before deploying.

### Moving the content to Shopify later

`FeedItem` is a plain object, so `getFeedItems` can later fetch the same fields from Shopify metaobjects without changing the grid or the card. A metaobject definition needs Storefront API access turned on for the site to read it.

## Checking it works

Start the dev server (`pnpm dev`) and open a collection that has Price drop products.

- A "<collection name> deals" carousel above the grid, with working arrows.
- No Price drop cards in the grid.
- Feed cards at their positions, staying in place while you scroll.

From the terminal, this prints the carousel's section tag when it renders in the first HTML:

```powershell
$h = "electric-bikes"
$html = (Invoke-WebRequest "http://localhost:3000/collections/$h" -UseBasicParsing).Content
[regex]::Match($html, '<section aria-label="[^"]* deals"').Value
```

An empty result can also mean the carousel streams in after the first HTML, so check the browser too.

## Troubleshooting

- **No carousel:** the collection may have no on-sale products in its first 500, or the lookup failed. Cached results can lag by a few minutes.
- **A Price drop product is in the grid:** check that product has a compare-at price above its price, and that the page passes `excludeOnSale` (see `page.tsx`).
- **A feed card is missing:** check its `position` against the number of loaded products, its `collections` list, and that the view is not list view.
- **A feed image breaks:** confirm the file exists in `public/`, or that a remote domain is allowed in `next.config`.
- **Type errors after editing:** run `pnpm exec tsc --noEmit`.
