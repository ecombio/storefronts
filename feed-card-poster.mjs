// Gives the 1-column feed card a "poster" layout: title on top, artwork in the middle, link at the bottom.
// Run from the repo root, after update-feed-card.mjs: node feed-card-poster.mjs
import fs from "node:fs";

const CARD = "components/collections/feed-item-card.tsx";

if (!fs.existsSync(CARD)) {
  console.log(
    "Run this from the repo root, after add-feed-items.mjs and update-feed-card.mjs have been run.",
  );
  process.exit(1);
}

const card = `import Image from "next/image";
import Link from "next/link";

import type { FeedItem } from "@/lib/collections/feed-items";

export function FeedItemCard({ item }: { item: FeedItem }) {
  const {
    icon: Icon,
    label,
    title,
    body,
    image,
    href,
    linkLabel,
    className = "bg-white",
    width = 1,
  } = item;
  const full = width === "full";
  const wide = width === 2;

  // 1-wide: art fills the space between the copy and the link. 2-wide: art on the right half, hidden on small screens. Full row: art on the left.
  const picture = image ? (
    <div
      className={
        full
          ? "relative hidden w-1/4 shrink-0 sm:block"
          : wide
            ? "absolute inset-y-0 right-0 hidden w-1/2 sm:block"
            : "relative min-h-32 w-full flex-1"
      }
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 640px) 25vw, 100vw"
        className={wide ? "object-contain object-right" : "object-contain"}
      />
    </div>
  ) : null;

  const copy = (
    <>
      {Icon ? (
        <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-foreground text-background">
          <Icon className="size-5" />
        </span>
      ) : null}
      {label ? (
        <span className="text-xs font-semibold tracking-wide uppercase opacity-70">{label}</span>
      ) : null}
      <p className="text-lg leading-snug font-semibold sm:text-xl">{title}</p>
      {body ? <p className="text-sm leading-5 opacity-80">{body}</p> : null}
    </>
  );

  const cta =
    href && linkLabel ? (
      full ? (
        <span className="rounded-md border border-current px-4 py-2 text-sm font-medium">
          {linkLabel}
        </span>
      ) : (
        <span className="mt-1 w-fit text-sm font-medium underline">{linkLabel}</span>
      )
    ) : null;

  const frame =
    "relative flex h-full overflow-hidden rounded-lg " +
    (full ? "flex-col sm:flex-row " : "min-h-[262px] flex-col ") +
    className;

  const inner = full ? (
    <>
      {picture}
      <div className="flex flex-1 flex-col justify-center gap-1.5 p-5">{copy}</div>
      {cta ? <div className="flex items-center px-5 pb-5 sm:p-5">{cta}</div> : null}
    </>
  ) : wide ? (
    <>
      {picture}
      <div className="flex flex-1 flex-col justify-end gap-2 p-5 sm:w-1/2 sm:flex-none">
        {copy}
        {cta}
      </div>
    </>
  ) : (
    <>
      <div className={"flex flex-col gap-2 p-5 " + (image ? "pb-0" : "flex-1 justify-end")}>
        {copy}
      </div>
      {picture}
      {cta ? <div className="p-5 pt-3">{cta}</div> : null}
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
`;

const current = fs.readFileSync(CARD, "utf8").replace(/\r\n/g, "\n");
if (current === card) {
  console.log("ALREADY  " + CARD);
} else {
  fs.writeFileSync(CARD, card);
  console.log("OK       " + CARD + "  (rewritten)");
}
