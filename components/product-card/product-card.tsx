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
            <ProductCardTitle>{product.title}</ProductCardTitle>
            <ProductCardRating>
              {product.rating ? (
                <CardStars score={product.rating.score} count={product.rating.count} />
              ) : null}
            </ProductCardRating>
            <ProductCardPrice
              amount={product.price.amount}
              currencyCode={product.price.currencyCode}
              maxAmount={product.maxPrice.amount}
              compareAtAmount={product.compareAtPrice?.amount}
              compareAtCurrencyCode={product.compareAtPrice?.currencyCode}
            />
          </ProductCardContent>
        </ProductCardImageContainer>
      </ProductCardRoot>
    </Link>
  );
}

export { ProductCardSkeleton };
