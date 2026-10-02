// Path: components/product-detail/product-detail-section.tsx
//
// Yotpo integration notes:
// 1. Computes `numericProductId` once in `ProductDetailSection` (GID -> raw numeric Shopify ID,
//    which is what Yotpo's REST widget API expects; passing the raw GID silently returned 0 reviews).
// 2. Renders `<ProductReviews />` full-width below the two-column grid, inside a `#reviews` wrapper
//    so the star badge can jump to it (the wrapper always exists, even while reviews stream in).
// 3. `<StarRating />` sits under the product title, wrapped in <Suspense> (required with cacheComponents).
//
// Uses the `@yotpo` path alias (mapped to `./@yotpo/index.ts` in tsconfig.json).

import { ProductReviews, StarRating } from "@yotpo";
import { cn } from "cn";
import { MinusIcon, PlusIcon } from "lucide-react";
import { type ReactNode, Suspense } from "react";

import { DeliveryEstimate } from "@/components/delivery-estimate";
import { type BreadcrumbItem, Breadcrumbs } from "@/components/product-detail/breadcrumbs";
import { BundleComponents, BundleParents } from "@/components/product-detail/bundle-components";
import { BuyButtons, PurchaseOptions } from "@/components/product-detail/buy-buttons";
import { BuyWithShopLogo } from "@/components/product-detail/buy-with-shop-logo";
import { CompatibleAccessories } from "@/components/product-detail/compatible-accessories";
import { ExpertReviewsSection } from "@/components/product-detail/expert-reviews-section";
import { FloatingBuyBlock } from "@/components/product-detail/floating-buy-block";
import { FrequentlyAskedQuestionsSection } from "@/components/product-detail/frequently-asked-questions-section";
import { GiftCardPurchaseForm } from "@/components/product-detail/gift-card-purchase-form";
import { ProductOpenGraph } from "@/components/product-detail/open-graph";
import {
  ProductForm,
  ProductFormOptions,
  ProductFormPrice,
} from "@/components/product-detail/product-form";
import { ProductHighlights } from "@/components/product-detail/product-highlights";
import {
  ProductInfoDescription,
  ProductInfoOptions,
} from "@/components/product-detail/product-info";
import {
  ColorImageCarouselItems,
  ColorImageGalleryItems,
  ProductMedia,
} from "@/components/product-detail/product-media";
import { ProductPrice } from "@/components/product-detail/product-price";
import { ProductTabs } from "@/components/product-detail/product-tabs";
import { ProductSchema } from "@/components/product-detail/schema";
import { StickyBuyBar } from "@/components/product-detail/sticky-buy-bar";
import { TechnicalSpecsSection } from "@/components/product-detail/technical-specs-section";
import { BreadcrumbSchema } from "@/components/schema/breadcrumb-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { shopConfig } from "@/lib/config";
import {
  getProductPurchaseOptions,
  getSelectedColorImage,
  getSharedImages,
  hasColorImagePartitioning,
  toProductFormInput,
  toStaticOptionGroups,
} from "@/lib/product";
import { type SelectedOptions } from "@/lib/product/types";
import type { ProductDetails, ProductVariant } from "@/lib/product/types";
import { getNumericShopifyId } from "@/lib/shopify/id/server";

export function ProductDetailSection({
  collection,
  product,
  selectedOptionsPromise,
  variantPromise,
}: {
  collection?: { handle: string; title: string } | null;
  product: ProductDetails;
  selectedOptionsPromise: Promise<SelectedOptions>;
  variantPromise: Promise<ProductVariant | undefined>;
}) {
  // Yotpo's REST widget API expects the raw numeric Shopify product ID, not the GraphQL GID
  // (`gid://shopify/Product/123...`) that `product.id` holds elsewhere in this codebase.
  const numericProductId = getNumericShopifyId(product.id);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    ...(collection ? [{ name: collection.title, path: `/collections/${collection.handle}` }] : []),
    { name: product.title, path: `/products/${product.handle}` },
  ];

  return (
    <>
      <ProductSchema
        product={{
          id: product.id,
          handle: product.handle,
          title: product.title,
          description: product.description,
          images: product.images,
          vendor: product.vendor,
          currencyCode: product.currencyCode,
          priceRange: product.priceRange,
          offerCount: product.variantsCount,
          availableForSale: product.availableForSale,
        }}
      />
      <ProductOpenGraph
        availableForSale={product.availableForSale}
        price={product.priceRange.minVariantPrice}
      />
      <BreadcrumbSchema
        items={[{ name: shopConfig.site.name, path: "/" }, ...breadcrumbs.slice(1)]}
      />
      <div className="grid gap-10 lg:grid-cols-10 lg:items-start lg:gap-5">
        <ProductMediaArea product={product} selectedOptionsPromise={selectedOptionsPromise} />
        <ProductInfoArea
          product={product}
          variantPromise={variantPromise}
          numericProductId={numericProductId}
          breadcrumbs={breadcrumbs}
        />
      </div>

      {product.descriptionHtml ? (
        <div className="mt-10">
          <ProductTabs
            tabs={[
              {
                id: "description",
                label: "Description",
                content: (
                  <div className="[&_*]:max-w-none">
                    <div className="grid gap-10">
                      <ProductInfoDescription descriptionHtml={product.descriptionHtml} />
                      <Suspense fallback={<div className="min-h-48" aria-hidden />}>
                        <ExpertReviewsSection handle={product.handle} />
                      </Suspense>
                    </div>
                  </div>
                ),
              },
              {
                id: "technical-specifications",
                label: "Technical Specifications",
                content: (
                  <Suspense fallback={<div className="min-h-32" aria-hidden />}>
                    <TechnicalSpecsSection handle={product.handle} />
                  </Suspense>
                ),
              },
              {
                id: "frequently-asked-questions",
                label: "Frequently Asked Questions",
                content: (
                  <Suspense fallback={<div className="min-h-32" aria-hidden />}>
                    <FrequentlyAskedQuestionsSection handle={product.handle} />
                  </Suspense>
                ),
              },
            ]}
          />
        </div>
      ) : null}
      {numericProductId ? (
        <div id="reviews" className="scroll-mt-24">
          <Suspense fallback={<div className="min-h-64" aria-hidden />}>
            <ProductReviews
              productId={numericProductId}
              handle={product.handle}
              productTitle={product.title}
            />
          </Suspense>
        </div>
      ) : null}
    </>
  );
}

function ProductMediaArea({
  product,
  selectedOptionsPromise,
}: {
  product: ProductDetails;
  selectedOptionsPromise: Promise<SelectedOptions>;
}) {
  if (!hasColorImagePartitioning(product.options)) {
    return (
      <ProductMedia
        otherImages={product.images}
        videos={product.videos}
        title={product.title}
        className="lg:sticky lg:top-20 lg:self-start lg:col-span-6"
        footer={<ProductHighlights badges={product.trustBadges} specs={product.specs} />}
      />
    );
  }

  return (
    <ProductMedia
      otherImages={getSharedImages(product.images, product.options)}
      videos={product.videos}
      title={product.title}
      className="lg:sticky lg:top-20 lg:self-start lg:col-span-6"
      footer={<ProductHighlights badges={product.trustBadges} specs={product.specs} />}
      desktopSlot={
        // Color image is the LCP slot; a pulsing skeleton flashes harder than an empty image canvas.
        <Suspense fallback={<div className="aspect-[3/2] w-full shrink-0" />}>
          <ResolvedColorImageGrid
            product={product}
            selectedOptionsPromise={selectedOptionsPromise}
          />
        </Suspense>
      }
      mobileSlot={
        <Suspense
          fallback={
            <div className="relative shrink-0 w-full snap-start snap-always overflow-hidden aspect-square" />
          }
        >
          <ResolvedColorImageCarousel
            product={product}
            selectedOptionsPromise={selectedOptionsPromise}
          />
        </Suspense>
      }
    />
  );
}

async function ResolvedColorImageGrid({
  product,
  selectedOptionsPromise,
}: {
  product: ProductDetails;
  selectedOptionsPromise: Promise<SelectedOptions>;
}) {
  const image = getSelectedColorImage(product, await selectedOptionsPromise);
  if (!image) return null;
  return <ColorImageGalleryItems images={[image]} title={product.title} />;
}

async function ResolvedColorImageCarousel({
  product,
  selectedOptionsPromise,
}: {
  product: ProductDetails;
  selectedOptionsPromise: Promise<SelectedOptions>;
}) {
  const image = getSelectedColorImage(product, await selectedOptionsPromise);
  if (!image) return null;
  return <ColorImageCarouselItems images={[image]} title={product.title} />;
}

function ProductInfoArea({
  product,
  variantPromise,
  numericProductId,
  breadcrumbs,
}: {
  product: ProductDetails;
  variantPromise: Promise<ProductVariant | undefined>;
  numericProductId: string | null;
  breadcrumbs: BreadcrumbItem[];
}) {
  const { options, handle, descriptionHtml } = product;
  const uniformStock = product.allVariantsInStock;
  const singleVariant = product.variantsCount === 1;
  const showBuyLabel = uniformStock && !singleVariant;
  const allInStock = product.defaultVariant?.availableForSale ?? product.availableForSale;
  const hasOptions = options.some((option) => option.values.length > 1);
  return (
    <div className="grid gap-10 lg:col-span-4">
      <div
        className="grid data-[uniform-price=true]:gap-10"
        data-uniform-price={product.hasUniformPricing}
      >
        <div data-slot="product-info-header">
          <Breadcrumbs items={breadcrumbs} />
          <h1 className="text-foreground text-2xl">{product.title}</h1>
          {numericProductId ? (
            <div className="mt-2 min-h-5">
              <Suspense fallback={<div className="h-5" aria-hidden />}>
                <StarRating productId={numericProductId} />
              </Suspense>
            </div>
          ) : null}
          {product.hasUniformPricing ? (
            <ProductPrice
              amount={product.priceRange.minVariantPrice.amount}
              currencyCode={product.priceRange.minVariantPrice.currencyCode}
              compareAtAmount={product.compareAtPriceRange?.minVariantPrice.amount}
            />
          ) : null}
          <DeliveryEstimate />
        </div>

        {singleVariant ? (
          <ProductInfoContent
            accessoriesSlot={<AccessoriesSlot handle={handle} isGiftCard={product.isGiftCard} />}
            priceSlot={
              !product.hasUniformPricing ? (
                <Suspense fallback={<div className="h-7" aria-hidden />}>
                  <ResolvedProductPrice variantPromise={variantPromise} />
                </Suspense>
              ) : undefined
            }
            product={product}
            selectedVariant={product.defaultVariant}
          />
        ) : (
          <Suspense
            fallback={
              <ProductInfoFallback
                accessoriesSlot={
                  <AccessoriesSlot handle={handle} isGiftCard={product.isGiftCard} />
                }
                allInStock={allInStock}
                hasOptions={hasOptions}
                product={product}
                showLabel={showBuyLabel}
              />
            }
          >
            <ResolvedProductInfo
              accessoriesSlot={<AccessoriesSlot handle={handle} isGiftCard={product.isGiftCard} />}
              product={product}
              variantPromise={variantPromise}
            />
          </Suspense>
        )}
      </div>

      {!product.isGiftCard && shopConfig.pdp.bundles.isEnabled ? (
        <BundleRelationships variant={product.defaultVariant} />
      ) : null}
    </div>
  );
}

async function ResolvedProductPrice({
  variantPromise,
}: {
  variantPromise: Promise<ProductVariant | undefined>;
}) {
  const variant = await variantPromise;
  return (
    <ProductFormPrice
      fallbackVariant={
        variant ? { compareAtPrice: variant.compareAtPrice, price: variant.price } : undefined
      }
    />
  );
}

async function ResolvedProductInfo({
  accessoriesSlot,
  product,
  variantPromise,
}: {
  accessoriesSlot?: ReactNode;
  product: ProductDetails;
  variantPromise: Promise<ProductVariant | undefined>;
}) {
  return (
    <ProductInfoContent
      accessoriesSlot={accessoriesSlot}
      product={product}
      selectedVariant={await variantPromise}
    />
  );
}

// The store is seeded from the URL-resolved variant so server HTML and client state agree on first paint.
function ProductInfoContent({
  accessoriesSlot,
  priceSlot,
  product,
  selectedVariant,
}: {
  accessoriesSlot?: ReactNode;
  priceSlot?: ReactNode;
  product: ProductDetails;
  selectedVariant: ProductVariant | undefined;
}) {
  const formProduct = toProductFormInput(product, selectedVariant);
  const fallbackVariant = formProduct.selectedOrFirstAvailableVariant ?? undefined;
  const hasOptions = product.options.some((option) => option.values.length > 1);

  return (
    <ProductForm product={formProduct}>
      <div className="grid gap-10">
        {!product.hasUniformPricing ? (
          <div data-slot="product-info-price">
            {priceSlot ?? <ProductFormPrice fallbackVariant={fallbackVariant} />}
          </div>
        ) : null}
        {hasOptions ? <ProductFormOptions handle={product.handle} /> : null}
        {product.isGiftCard ? null : accessoriesSlot}
        {product.isGiftCard ? (
          <GiftCardPurchaseForm />
        ) : (
          <FloatingBuyBlock>
            <BuyButtons
              fallbackVariant={fallbackVariant}
              availableForSale={product.availableForSale}
              buyWithShop={shopConfig.pdp.buyWithShop.isEnabled}
              quantityPicker={shopConfig.pdp.quantityPicker.isEnabled}
            />
          </FloatingBuyBlock>
        )}
      </div>
      {product.isGiftCard ? null : (
        <StickyBuyBar
          targetId="primary-buy-buttons"
          title={product.title}
          price={<ProductFormPrice fallbackVariant={fallbackVariant} />}
        />
      )}
    </ProductForm>
  );
}

function ProductInfoFallback({
  accessoriesSlot,
  showLabel,
  allInStock,
  hasOptions,
  product,
}: {
  accessoriesSlot?: ReactNode;
  allInStock: boolean;
  hasOptions: boolean;
  product: ProductDetails;
  showLabel: boolean;
}) {
  return (
    <div className="grid gap-10">
      {!product.hasUniformPricing ? <div className="h-7" aria-hidden /> : null}
      {hasOptions ? (
        <ProductInfoOptions options={toStaticOptionGroups(product)} hideImages />
      ) : null}
      {product.isGiftCard ? null : accessoriesSlot}
      {product.isGiftCard ? (
        <GiftCardPurchaseFormFallback />
      ) : (
        <BuyButtonsFallback
          allInStock={allInStock}
          showLabel={showLabel}
          variant={product.defaultVariant}
        />
      )}
    </div>
  );
}

// Bundle relationships are product-level, so keep them in the static shell.
function BundleRelationships({ variant }: { variant: ProductVariant | undefined }) {
  if (!variant) return null;
  if (variant.components.length === 0 && variant.bundleParents.length === 0) return null;
  return (
    <div className="grid gap-5">
      <BundleComponents components={variant.components} title="Bundle Includes" />
      <BundleParents variants={variant.bundleParents} title="Available in Bundles" />
    </div>
  );
}

function GiftCardPurchaseFormFallback() {
  // Match the resolved form's geometry to avoid layout shift.
  return (
    <div className="grid gap-5">
      <div className="grid gap-2.5">
        <div className="grid gap-2.5">
          <Label>Recipient email</Label>
          <Input type="email" disabled placeholder="friend@example.com" />
        </div>
        <div className="grid gap-2.5">
          <Label>Recipient name</Label>
          <Input type="text" disabled placeholder="Friend's name (optional)" />
        </div>
        <div className="grid gap-2.5">
          <Label>Message</Label>
          <Textarea rows={3} disabled placeholder="Write a personal note (optional)" />
        </div>
        <div className="grid gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2.5">
            <Label>Schedule for later</Label>
            <span className="inline-flex h-[1.15rem] w-8 items-center rounded-full bg-input opacity-50" />
          </div>
        </div>
      </div>
      <div className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground opacity-50">
        Add to Cart
      </div>
    </div>
  );
}

function QuantityPickerFallback() {
  return (
    <div
      aria-hidden="true"
      className="grid h-12 w-32 shrink-0 grid-cols-[3rem_2rem_3rem] rounded-lg bg-background ring-1 ring-border ring-inset"
    >
      <span className="flex size-12 items-center justify-center opacity-50">
        <MinusIcon className="size-4 shrink-0" />
      </span>
      <span className="flex h-12 w-8 items-center justify-center text-sm font-medium tabular-nums">
        1
      </span>
      <span className="flex size-12 items-center justify-center">
        <PlusIcon className="size-4 shrink-0" />
      </span>
    </div>
  );
}

function BuyButtonsFallback({
  allInStock,
  showLabel,
  variant,
}: {
  allInStock: boolean;
  showLabel: boolean;
  variant: ProductVariant | undefined;
}) {
  const { plans, selectedPlan } = getProductPurchaseOptions(variant);
  return (
    <div className="grid gap-2.5">
      {variant ? (
        <PurchaseOptions
          disabled
          plans={plans}
          price={variant.price}
          requiresSellingPlan={variant.requiresSellingPlan}
          selectedPlan={selectedPlan}
        />
      ) : null}
      <div className="flex gap-2.5">
        {shopConfig.pdp.quantityPicker.isEnabled ? <QuantityPickerFallback /> : null}
        <div className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
          {showLabel ? (allInStock ? "Add to Cart" : "Out of Stock") : null}
        </div>
      </div>
      {shopConfig.pdp.buyWithShop.isEnabled && !selectedPlan && !variant?.requiresSellingPlan ? (
        <div
          className={cn(
            "flex h-12 items-center justify-center rounded-lg bg-shop px-4 text-white",
            !allInStock && "invisible",
          )}
        >
          <BuyWithShopLogo aria-hidden="true" className="h-auto w-24.5" />
        </div>
      ) : null}
    </div>
  );
}

function AccessoriesSlot({ handle, isGiftCard }: { handle: string; isGiftCard: boolean }) {
  if (isGiftCard || !shopConfig.pdp.complementaryProducts.isEnabled) return null;
  return (
    <Suspense fallback={<div className="h-40" aria-hidden />}>
      <CompatibleAccessories handle={handle} />
    </Suspense>
  );
}
