import { BookOpenIcon, type LucideIcon } from "lucide-react";

export type FeedWidth = 1 | 2 | "full";

export interface FeedItem {
  id: string;
  /** Shown after this many products. */
  position: number;
  /** Columns wide: 1, 2, or "full" for a whole row. Defaults to 1. */
  width?: FeedWidth;
  /** Small round icon above the title. */
  icon?: LucideIcon;
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
    icon: BookOpenIcon,
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
