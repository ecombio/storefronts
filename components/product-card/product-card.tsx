import Link from "next/link";

import { buildProductUrl } from "@/lib/product";
import type { ProductCard as ProductCardType } from "@/lib/product/types";

import {
  ProductCardContent,
  ProductCardImage,
  ProductCardImageContainer,
  ProductCardPrice,
  ProductCardRating,
  ProductCard as ProductCardRoot,
  ProductCardSkeleton,
  ProductCardSwatches,
  ProductCardTitle,
} from "./components";
import { getSaleInfo, SaleBadge, SaleSavings } from "./sale";
import { CardStars } from "./stars";

export interface ProductCardProps {
  product: ProductCardType;
  variant?: "default" | "featured";
  outOfStockText?: string;
  className?: string;
}

export function ProductCard({
  product,
  variant = "default",
  outOfStockText,
  className,
}: ProductCardProps) {
  const isFeatured = variant === "featured";
  const sale = getSaleInfo(product.price.amount, product.compareAtPrice?.amount);
  const subtitle =
    (product.defaultVariantSelectedOptions ?? [])
      .map((o) => o.value)
      .filter((v) => v !== "Default Title")
      .join(" • ") ||
    product.vendor ||
    "";
  const specLine = (product.cardSpecs ?? []).map((s) =>
    typeof s === "string" ? s : (s as { text: string }).text,
  );
  const subtitleText = [subtitle, ...specLine].filter(Boolean).join(" • ");
  const href = buildProductUrl(product.handle, product.defaultVariantSelectedOptions ?? []);

  return (
    <Link href={href} className={className}>
      <ProductCardRoot variant={variant}>
        {isFeatured && (
          <div data-slot="product-card-badge">
            <span className="inline-flex self-start items-center pl-2 pr-5 py-0.5 bg-primary rounded-tl-lg not-supports-[clip-path:shape(from_0_0)]:rounded-tr-lg clip-featured-badge text-xs text-primary-foreground font-medium">
              Assistant's pick
            </span>
          </div>
        )}
        <ProductCardImageContainer variant={variant}>
          <ProductCardImage
            src={product.featuredImage?.url}
            alt={product.featuredImage?.altText || product.title}
            outOfStock={!product.availableForSale}
            outOfStockText={outOfStockText}
          />
          <ProductCardSwatches colors={product.colors} />
          <ProductCardContent>
            <SaleBadge price={product.price.amount} compareAt={product.compareAtPrice?.amount} />
            <ProductCardTitle>{product.title}</ProductCardTitle>
            <div className="min-h-8 line-clamp-3 text-xs text-muted-foreground">{subtitleText}</div>
            <ProductCardRating>
              {product.rating && product.rating.count > 0 ? (
                <CardStars score={product.rating.score} count={product.rating.count} />
              ) : null}
            </ProductCardRating>
            <ProductCardPrice
              amount={product.price.amount}
              currencyCode={product.price.currencyCode}
              maxAmount={product.maxPrice.amount}
              className={sale.onSale ? "text-positive" : undefined}
            />
            <SaleSavings
              price={product.price.amount}
              compareAt={product.compareAtPrice?.amount}
              currencyCode={product.price.currencyCode}
            />
          </ProductCardContent>
        </ProductCardImageContainer>
        <div className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-foreground/70 py-2.5 text-sm font-bold text-foreground transition-colors group-hover/card:bg-foreground/5">
          <span aria-hidden="true">+</span> View product
        </div>
      </ProductCardRoot>
    </Link>
  );
}

export { ProductCardSkeleton };
