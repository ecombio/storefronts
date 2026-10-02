"use client";

import { useCollection } from "@shopify/hydrogen/react";
import { LoaderCircleIcon } from "lucide-react";
import { Children, type ReactNode, useEffect, useEffectEvent, useRef, useState } from "react";

import { ProductCard } from "@/components/product-card/product-card";
import { getBrowseSearch } from "@/lib/collections";
import type { FeedWidth } from "@/lib/collections/feed-items";
import type { PageInfo } from "@/lib/pagination/types";
import type { ProductCard as ProductCardType } from "@/lib/product/types";

import { useBrowseView } from "./filter-sidebar-layout";

// List view restyles the existing cards with CSS: image on the left, details on the right.
const LIST_VIEW_CLASSES = [
  "grid grid-cols-1 gap-5",
  "[&>a]:border-b [&>a]:pb-5",
  "[&_[data-slot=product-card-image-container]]:flex-row",
  "[&_[data-slot=product-card-image-container]]:items-center",
  "[&_[data-slot=product-card-image-container]]:gap-5",
  "[&_[data-slot=product-card-image]]:w-36",
  "[&_[data-slot=product-card-image]]:shrink-0",
  "sm:[&_[data-slot=product-card-image]]:w-56",
  "[&_[data-slot=product-card-title]]:line-clamp-2",
  "[&_[data-slot=product-card-title]]:text-base",
  "[&_[data-slot=product-card-swatches]]:hidden",
].join(" ");

export interface FeedSlot {
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

interface InfiniteProductGridProps<TParams> {
  initialProducts: ProductCardType[];
  initialPageInfo: PageInfo;
  outOfStockText: string;
  // Top-level "use server" action; passed by reference, no closure encryption.
  loadMore: (
    params: TParams & { cursor: string; search: string },
  ) => Promise<{ products: ProductCardType[]; pageInfo: PageInfo }>;
  loadMoreParams: TParams;
  gridClassName?: string;
  feedItems?: FeedSlot[];
  children: ReactNode;
}

export function InfiniteProductGrid<TParams>({
  initialProducts,
  initialPageInfo,
  outOfStockText,
  loadMore,
  loadMoreParams,
  gridClassName,
  feedItems = [],
  children,
}: InfiniteProductGridProps<TParams>) {
  // The store, not a server snapshot, is the single source of truth for filters and sort mid-scroll.
  const search = useCollection(getBrowseSearch);
  const view = useBrowseView();
  const [additionalProducts, setAdditionalProducts] = useState<ProductCardType[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>(initialPageInfo);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const loadMorePage = useEffectEvent(async () => {
    if (loadingRef.current || !pageInfo.hasNextPage || !pageInfo.endCursor) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      const result = await loadMore({ ...loadMoreParams, cursor: pageInfo.endCursor, search });
      // Live cursor pages can re-emit a boundary product if the ranking shifts mid-scroll; skip ids already shown.
      setAdditionalProducts((prev) => {
        const seen = new Set([...initialProducts, ...prev].map((product) => product.id));
        return [...prev, ...result.products.filter((product) => !seen.has(product.id))];
      });
      setPageInfo(result.pageInfo);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  });

  // Re-arm the observer per cursor so a sentinel still in view after a page lands triggers the next load.
  const { endCursor, hasNextPage } = pageInfo;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || !endCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMorePage();
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [endCursor, hasNextPage]);
  const gridClasses =
    view === "list"
      ? LIST_VIEW_CLASSES
      : `grid grid-cols-2 grid-flow-dense gap-5 ${gridClassName ?? "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}`;

  const cards: ReactNode[] = [
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
      <div className={gridClasses}>{cards}</div>

      {pageInfo.hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-10">
          {isLoading && <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />}
        </div>
      )}
    </>
  );
}
