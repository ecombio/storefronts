// Restyles the in-feed card to match the promo card reference (icon pill, bottom-aligned copy, underlined link, art on the right).
// Run from the repo root: node update-feed-card.mjs
import fs from "node:fs";

const CONFIG = "lib/collections/feed-items.ts";
const CARD = "components/collections/feed-item-card.tsx";

if (!fs.existsSync(CONFIG) || !fs.existsSync(CARD)) {
  console.log("Run this from the repo root, after add-feed-items.mjs has been run.");
  process.exit(1);
}

function edit(file, oldStr, newStr, guard) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  if (text.includes(guard)) return console.log("ALREADY  " + file + "  (" + guard + ")");
  const count = text.split(oldStr).length - 1;
  if (count !== 1)
    return console.log(
      "SKIPPED  " + file + "  (anchor found " + count + " times): " + oldStr.split("\n")[0].trim(),
    );
  const out = text.replace(oldStr, () => newStr);
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, "\r\n") : out);
  console.log("OK       " + file + "  (" + guard + ")");
}

// 1. Config: an optional icon per item.
edit(
  CONFIG,
  'export type FeedWidth = 1 | 2 | "full";',
  'import { BookOpenIcon, type LucideIcon } from "lucide-react";\n\nexport type FeedWidth = 1 | 2 | "full";',
  "import { BookOpenIcon, type LucideIcon }",
);
edit(
  CONFIG,
  "  label?: string;\n  title: string;",
  "  /** Small round icon above the title. */\n  icon?: LucideIcon;\n  label?: string;\n  title: string;",
  "icon?: LucideIcon;",
);
edit(
  CONFIG,
  '    label: "Buying guide",',
  '    icon: BookOpenIcon,\n    label: "Buying guide",',
  "icon: BookOpenIcon,",
);

// 2. The card itself.
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

  // 2-wide: art sits on the right half and is hidden on small screens. Full row: art on the left. 1-wide: art on top.
  const picture = image ? (
    <div
      className={
        full
          ? "relative hidden w-1/4 shrink-0 sm:block"
          : wide
            ? "absolute inset-y-0 right-0 hidden w-1/2 sm:block"
            : "relative aspect-[4/3] w-full shrink-0"
      }
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 640px) 25vw, 100vw"
        className={wide ? "object-contain object-right" : "object-cover"}
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
  ) : (
    <>
      {picture}
      <div
        className={
          "flex flex-1 flex-col justify-end gap-2 p-5 " + (wide ? "sm:w-1/2 sm:flex-none" : "")
        }
      >
        {copy}
        {cta}
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
`;

const current = fs.readFileSync(CARD, "utf8").replace(/\r\n/g, "\n");
if (current === card) {
  console.log("ALREADY  " + CARD);
} else {
  fs.writeFileSync(CARD, card);
  console.log("OK       " + CARD + "  (rewritten)");
}
