// app/snippets/StaticProductCard.tsx
//
// Hook-free, server-safe twin of ProductCard (~/snippets/ProductCard).
// Used ONLY by ~/lib/shoppable-embeds for the initial renderToStaticMarkup
// pass - ProductCard itself can't be rendered there because it calls
// useNavigate(), useAside(), and CartForm's internal fetcher hook, none
// of which have a provider available inside the article loader's SSR
// string-injection pass, and would throw.
//
// Renders the same classes/markup as ProductCard so the page looks
// correct immediately. Article.tsx's hydration effect then swaps each
// rendered slot for the real, interactive ProductCard on the client -
// mirrors the same "static now, upgrade after mount" pattern already
// used there for FAQ deep-linking.
//
// Deliberately omits: wishlist button, quick view button, compare
// checkbox, and the CartForm add-to-cart button - all of them need JS to
// do anything, so nothing is lost by leaving them out of pre-hydration
// markup. The add-to-cart slot becomes a plain link to the product page
// instead, so it's still a usable affordance even if hydration is slow
// or fails outright.
//
// The reviews block (product-card__reviews) IS kept, as an empty
// placeholder, even though StarRating itself needs no hooks and could
// render live data here. product-card.css gives that div a fixed
// min-height and it sits in normal flow above the pricing block - if the
// static pass skipped it entirely, hydration would insert it after
// mount and shove the price down by ~18px+, a visible layout jump on
// every article page load. Kept empty (not populated with live rating
// data) rather than duplicating ProductCard's rating-parsing logic here;
// the visual gap is blank until hydration fills it in, which is a much
// smaller cost than the reflow.

import type {ProductCardFragment} from 'storefrontapi.generated';

export interface StaticProductCardProps {
  product: ProductCardFragment;
  showVendor?: boolean;
}

function formatMoney(amount: string, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

export function StaticProductCard({
  product,
  showVendor = true,
}: StaticProductCardProps) {
  const url = `/products/${product.handle}`;
  const image = product.featuredImage;
  const price = product.priceRange.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;
  const variant = product.selectedOrFirstAvailableVariant;
  const etaText = product.etaText?.value;
  const isSponsored = product.sponsored?.value === 'true';
  const onSale =
    !!compareAtPrice &&
    parseFloat(compareAtPrice.amount) > parseFloat(price.amount);

  return (
    <div
      className="product-card"
      data-product-id={product.id}
      data-product-handle={product.handle}
    >
      <div className="product-card__img-zone">
        {isSponsored && (
          <span className="product-card__sponsored-label">Sponsored</span>
        )}

        <a
          href={url}
          className="product-card__image-wrapper"
          aria-label={product.title}
        >
          {image ? (
            <img
              src={image.url}
              alt={image.altText ?? product.title}
              className="product-card__img product-card__img--primary"
              loading="lazy"
            />
          ) : (
            <div className="product-card__img-placeholder" aria-hidden="true" />
          )}
        </a>

        {onSale && (
          <span className="product-card__badge-slot">
            <span className="sale-badge">Sale</span>
          </span>
        )}
      </div>

      <div className="product-card__body">
        {showVendor && product.vendor && (
          <span className="product-card__vendor">{product.vendor}</span>
        )}

        <a href={url} className="product-card__title" title={product.title}>
          {product.title}
        </a>

        {/* Empty placeholder - see file header. Prevents a layout shift
            when hydration mounts the real ProductCard's StarRating. */}
        <div className="product-card__reviews" aria-hidden="true" />

        <div className="product-card__pricing">
          {onSale && compareAtPrice && (
            <span className="product-card__price product-card__price--compare">
              <s>{formatMoney(compareAtPrice.amount, compareAtPrice.currencyCode)}</s>
            </span>
          )}
          <span className="product-card__price product-card__price--sale">
            {formatMoney(price.amount, price.currencyCode)}
          </span>
        </div>

        {etaText && (
          <div className="product-card__eta" aria-label="Estimated delivery">
            <span>{etaText}</span>
          </div>
        )}

        {variant && (
          <div className="product-card__bottom-row">
            <a href={url} className="product-card__atc-btn">
              {variant.availableForSale ? 'View product' : 'Sold out'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}