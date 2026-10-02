import { cn } from "cn";
import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";

import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import type { ProductCardColor } from "@/lib/product/types";

const MAX_SWATCHES = 4;

interface ProductCardProps extends ComponentProps<"article"> {
  variant?: "default" | "featured";
}

function ProductCard({ variant = "default", className, children, ...props }: ProductCardProps) {
  return (
    <article
      data-slot="product-card"
      data-variant={variant}
      className={cn(
        "group/card flex flex-col h-full overflow-hidden rounded-xl bg-background p-4 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md focus-within:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </article>
  );
}

interface ProductCardImageContainerProps extends ComponentProps<"div"> {
  variant?: "default" | "featured";
}

function ProductCardImageContainer({
  variant = "default",
  className,
  children,
  ...props
}: ProductCardImageContainerProps) {
  return (
    <div
      data-slot="product-card-image-container"
      data-variant={variant}
      className={cn(
        "flex flex-col flex-1",
        "data-[variant=featured]:-mt-px data-[variant=featured]:bg-linear-to-b/oklch data-[variant=featured]:from-primary data-[variant=featured]:from-0% data-[variant=featured]:to-45% data-[variant=featured]:to-primary/10",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ProductCardImageProps {
  src?: string | null;
  alt: string;
  outOfStock?: boolean;
  outOfStockText?: string;
  className?: string;
}

function ProductCardImage({
  src,
  alt,
  outOfStock = false,
  outOfStockText,
  className,
}: ProductCardImageProps) {
  return (
    <div
      data-slot="product-card-image"
      className={cn("relative aspect-square overflow-hidden rounded-lg", className)}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-contain p-3" sizes="100vw" />
      ) : (
        <ImagePlaceholder className="size-full" />
      )}
      {outOfStock && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <span className="text-destructive-foreground font-medium text-xs px-2 py-1 bg-destructive rounded">
            {outOfStockText}
          </span>
        </div>
      )}
    </div>
  );
}

/** Color dots under the image. The row keeps its height so titles align across cards. */
function ProductCardSwatches({
  colors = [],
  className,
}: {
  colors?: ProductCardColor[];
  className?: string;
}) {
  const visible = colors.filter((c) => c.color || c.imageUrl).slice(0, MAX_SWATCHES);
  const extra = visible.length > 0 ? colors.length - visible.length : 0;
  return (
    <div
      data-slot="product-card-swatches"
      className={cn("flex min-h-7 items-center justify-center gap-1.5", className)}
    >
      {visible.map((c) => (
        <span
          key={c.name}
          title={c.name}
          className="size-3.5 rounded-full ring-1 ring-black/15"
          style={
            c.color
              ? { backgroundColor: c.color }
              : { backgroundImage: `url("${c.imageUrl}")`, backgroundSize: "cover" }
          }
        />
      ))}
      {extra > 0 && <span className="text-xs text-muted-foreground">+{extra}</span>}
    </div>
  );
}

function ProductCardContent({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="product-card-content"
      className={cn("flex flex-col flex-1 gap-1 pt-1 pb-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function ProductCardTitle({ className, children, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="product-card-title"
      className={cn("text-sm font-medium text-foreground line-clamp-2 min-h-10", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function ProductCardRating({ children }: { children?: ReactNode }) {
  return (
    <div data-slot="product-card-rating" className="min-h-5 text-sm">
      {children}
    </div>
  );
}

/** Renders the currency symbol and cents small and raised. */
function MoneyDisplay({
  amount,
  currencyCode,
  className,
}: {
  amount: string;
  currencyCode: string;
  className?: string;
}) {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).formatToParts(parseFloat(amount));
  return (
    <span className={cn("tabular-nums", className)}>
      {parts.map((part, i) =>
        part.type === "currency" || part.type === "decimal" || part.type === "fraction" ? (
          <span key={i} className="text-[0.6em] align-super">
            {part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  );
}

interface ProductCardPriceProps {
  amount: string;
  currencyCode: string;
  maxAmount?: string;
  compareAtAmount?: string;
  compareAtCurrencyCode?: string;
  className?: string;
}

function ProductCardPrice({
  amount,
  currencyCode,
  maxAmount,
  compareAtAmount,
  compareAtCurrencyCode,
  className,
}: ProductCardPriceProps) {
  const isRange = maxAmount != null && maxAmount !== amount;
  const compareAtNum = compareAtAmount ? parseFloat(compareAtAmount) : 0;
  // A range's per-variant compare-at prices differ, so a single one would be misleading.
  const showCompareAt = !isRange && compareAtNum > parseFloat(amount);

  return (
    <div data-slot="product-card-price" className={cn("min-h-16", className)}>
      <div className="h-5 text-sm text-muted-foreground">{isRange ? "Starting at" : null}</div>
      <MoneyDisplay
        amount={amount}
        currencyCode={currencyCode}
        className="text-xl font-semibold text-foreground"
      />
      {showCompareAt && compareAtAmount && (
        <div className="text-sm text-muted-foreground">
          Was{" "}
          <MoneyDisplay
            amount={compareAtAmount}
            currencyCode={compareAtCurrencyCode ?? currencyCode}
            className="line-through [&>span]:!align-baseline [&>span]:!text-[1em]"
          />
        </div>
      )}
    </div>
  );
}

function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="product-card-skeleton"
      className={cn("flex flex-col overflow-hidden", className)}
    >
      <ImagePlaceholder className="aspect-square animate-pulse" />
      <div className="py-2.5 grid gap-2">
        <div className="h-4 w-full bg-accent animate-pulse" />
        <div className="h-4 w-2/3 bg-accent animate-pulse" />
        <div className="h-6 w-24 bg-accent animate-pulse" />
      </div>
    </div>
  );
}

export {
  ProductCard,
  ProductCardContent,
  ProductCardImage,
  ProductCardImageContainer,
  ProductCardPrice,
  ProductCardRating,
  ProductCardSkeleton,
  ProductCardSwatches,
  ProductCardTitle,
};
