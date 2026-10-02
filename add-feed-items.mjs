// Adds in-feed items (promo cards, teaser cards, full-width banners) to collection grids.
// Run from the repo root: node add-feed-items.mjs
import fs from "node:fs";

const CONFIG = "lib/collections/feed-items.ts";
const CARD = "components/collections/feed-item-card.tsx";
const GRID = "components/collections/infinite-product-grid.tsx";
const RESULTS = "components/collections/results-grid.tsx";

if (!fs.existsSync(GRID)) {
  console.log("Run this from the repo root (the folder that contains components/ and lib/).");
  process.exit(1);
}

function createFile(file, content) {
  if (fs.existsSync(file)) return console.log("EXISTS   " + file + "  (left alone)");
  fs.writeFileSync(file, content);
  console.log("CREATED  " + file);
}

function edit(file, oldStr, newStr, guard) {
  if (!fs.existsSync(file)) return console.log("MISSING  " + file);
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  if (text.includes(guard))
    return console.log("ALREADY  " + file + "  (" + guard.slice(0, 40) + ")");
  const count = text.split(oldStr).length - 1;
  if (count !== 1)
    return console.log(
      "SKIPPED  " + file + "  (anchor found " + count + " times): " + oldStr.split("\n")[0].trim(),
    );
  const out = text.replace(oldStr, () => newStr);
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, "\r\n") : out);
  console.log("OK       " + file + "  (" + guard.slice(0, 40) + ")");
}

// 1. The list of feed items. Edit this file to change what shows up.
createFile(
  CONFIG,
  `export type FeedWidth = 1 | 2 | "full";

export interface FeedItem {
  id: string;
  /** Shown after this many products. */
  position: number;
  /** Columns wide: 1, 2, or "full" for a whole row. Defaults to 1. */
  width?: FeedWidth;
  label?: string;
  title: string;
  body?: string;
  image?: { src: string; alt: string };
  href?: string;
  linkLabel?: string;
  /** Tailwind classes for background and text colour. */
  className?: string;
  /** Collection handles this shows on. Leave out to show on every collection. */
  collections?: string[];
}

// Placeholder content: replace the text and links with real ones.
export const FEED_ITEMS: FeedItem[] = [
  {
    id: "buying-guide",
    position: 6,
    width: 2,
    label: "Buying guide",
    title: "Not sure which one to pick?",
    body: "Our guides compare the options side by side.",
    href: "/",
    linkLabel: "Read the guides",
    className: "bg-[#e9e1f7]",
  },
  {
    id: "tip",
    position: 13,
    label: "Tip",
    title: "Compare before you buy",
    body: "Check range, weight limit and folded size.",
    className: "bg-white",
  },
  {
    id: "article",
    position: 18,
    width: "full",
    label: "Guide",
    title: "What should you look for in an electric scooter?",
    body: "A short read on range, motor power and portability.",
    href: "/",
    linkLabel: "See more",
    className: "bg-white",
  },
];

export function getFeedItems(handle: string): FeedItem[] {
  return FEED_ITEMS.filter((item) => !item.collections || item.collections.includes(handle));
}
`,
);

// 2. One card component for all three kinds. Layout follows the width.
createFile(
  CARD,
  `import Image from "next/image";
import Link from "next/link";

import type { FeedItem } from "@/lib/collections/feed-items";

export function FeedItemCard({ item }: { item: FeedItem }) {
  const { label, title, body, image, href, linkLabel, className = "bg-white", width = 1 } = item;
  const horizontal = width !== 1;
  const frame =
    "flex h-full overflow-hidden rounded-xl " +
    (horizontal ? "flex-col sm:flex-row " : "flex-col ") +
    className;

  const inner = (
    <>
      {image ? (
        <div
          className={
            "relative shrink-0 " +
            (horizontal
              ? "h-36 sm:h-auto sm:w-1/3 " + (width === 2 ? "sm:order-last" : "")
              : "aspect-[4/3] w-full")
          }
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 640px) 33vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-5">
        {label ? (
          <span className="text-xs font-semibold tracking-wide uppercase opacity-70">{label}</span>
        ) : null}
        <h3 className="text-base leading-snug font-semibold sm:text-lg">{title}</h3>
        {body ? <p className="text-sm leading-5 opacity-80">{body}</p> : null}
        {href && linkLabel ? (
          <span className="mt-2 inline-flex w-fit rounded-md border border-current px-3 py-1.5 text-sm font-medium">
            {linkLabel}
          </span>
        ) : null}
      </div>
    </>
  );

  return href ? (
    <Link href={href} className={frame}>
      {inner}
    </Link>
  ) : (
    <div className={frame}>{inner}</div>
  );
}
`,
);

// 3. The client grid weaves feed items in by absolute product position, so infinite scroll keeps them in place.
edit(
  GRID,
  'import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";',
  'import { Children, type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";',
  "import { Children, type ReactNode",
);
edit(
  GRID,
  'import { getBrowseSearch } from "@/lib/collections";',
  'import { getBrowseSearch } from "@/lib/collections";\nimport type { FeedWidth } from "@/lib/collections/feed-items";',
  "import type { FeedWidth }",
);
edit(
  GRID,
  "interface InfiniteProductGridProps<TParams> {",
  `export interface FeedSlot {
  id: string;
  position: number;
  width: FeedWidth;
  node: ReactNode;
}

const FEED_WIDTH_CLASSES: Record<FeedWidth, string> = {
  1: "",
  2: "col-span-2",
  full: "col-span-full",
};

interface InfiniteProductGridProps<TParams> {`,
  "export interface FeedSlot",
);
edit(
  GRID,
  "  gridClassName?: string;\n  children: ReactNode;\n}",
  "  gridClassName?: string;\n  feedItems?: FeedSlot[];\n  children: ReactNode;\n}",
  "feedItems?: FeedSlot[];",
);
edit(
  GRID,
  "  gridClassName,\n  children,\n}: InfiniteProductGridProps<TParams>) {",
  "  gridClassName,\n  feedItems = [],\n  children,\n}: InfiniteProductGridProps<TParams>) {",
  "feedItems = [],",
);
edit(GRID, "grid grid-cols-2 gap-5 ", "grid grid-cols-2 grid-flow-dense gap-5 ", "grid-flow-dense");
edit(
  GRID,
  `  return (
    <>
      <div className={gridClasses}>
        {children}
        {additionalProducts.map((product) => (
          <ProductCard key={product.id} product={product} outOfStockText={outOfStockText} />
        ))}
      </div>`,
  `  const cards: ReactNode[] = [
    ...Children.toArray(children),
    ...additionalProducts.map((product) => (
      <ProductCard key={product.id} product={product} outOfStockText={outOfStockText} />
    )),
  ];
  // Feed items sit between products by absolute position, so they stay put as more pages load.
  if (view !== "list") {
    [...feedItems]
      .filter((slot) => slot.position <= cards.length)
      .sort((a, b) => b.position - a.position)
      .forEach((slot) => {
        cards.splice(
          slot.position,
          0,
          <div key={"feed-" + slot.id} className={FEED_WIDTH_CLASSES[slot.width]}>
            {slot.node}
          </div>,
        );
      });
  }

  return (
    <>
      <div className={gridClasses}>{cards}</div>`,
  "const cards: ReactNode[] = [",
);

// 4. The server grid builds the feed items for the current collection and hands them to the client grid.
edit(
  RESULTS,
  'import { loadMoreCollectionProductsAction } from "@/lib/collections/action";',
  'import { loadMoreCollectionProductsAction } from "@/lib/collections/action";\nimport { getFeedItems } from "@/lib/collections/feed-items";',
  "import { getFeedItems }",
);
edit(
  RESULTS,
  'import { InfiniteProductGrid } from "./infinite-product-grid";',
  'import { FeedItemCard } from "./feed-item-card";\nimport { InfiniteProductGrid } from "./infinite-product-grid";',
  "import { FeedItemCard }",
);
edit(
  RESULTS,
  "  // /collections/all pagination must use the same search backend as its initial page.",
  `  const feedItems = getFeedItems(collection).map((item) => ({
    id: item.id,
    position: item.position,
    width: item.width ?? 1,
    node: <FeedItemCard item={item} />,
  }));

  // /collections/all pagination must use the same search backend as its initial page.`,
  "const feedItems = getFeedItems(",
);
edit(
  RESULTS,
  "        loadMore={loadMoreSearchProductsAction}\n",
  "        loadMore={loadMoreSearchProductsAction}\n        feedItems={feedItems}\n",
  "loadMore={loadMoreSearchProductsAction}\n        feedItems={feedItems}",
);
edit(
  RESULTS,
  "      loadMore={loadMoreCollectionProductsAction}\n",
  "      loadMore={loadMoreCollectionProductsAction}\n      feedItems={feedItems}\n",
  "loadMore={loadMoreCollectionProductsAction}\n      feedItems={feedItems}",
);
