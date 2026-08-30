// app/lib/shoppable-embeds.ts
//
// Parses `<div data-shoppable-product="{numericId}"></div>` markers out of
// article contentHtml, and splices in rendered product embeds server-side
// once the product data has been resolved via a batched `nodes()` query.

const EMBED_REGEX = /<div\s+data-shoppable-product="(\d+)"\s*><\/div>/g;

export function extractShoppableProductIds(contentHtml: string): string[] {
  const ids = new Set<string>();
  for (const match of contentHtml.matchAll(EMBED_REGEX)) {
    ids.add(`gid://shopify/Product/${match[1]}`);
  }
  return Array.from(ids);
}

type ShoppableProduct = {
  id: string;
  handle: string;
  title: string;
  featuredImage: {url: string; altText: string | null} | null;
  priceRange: {
    minVariantPrice: {amount: string; currencyCode: string};
  };
};

export function injectShoppableProducts(
  contentHtml: string,
  productsById: Map<string, ShoppableProduct>,
): string {
  return contentHtml.replace(EMBED_REGEX, (_match, numericId) => {
    const product = productsById.get(`gid://shopify/Product/${numericId}`);
    if (!product) return ''; // product deleted/unavailable — drop silently

    const price = product.priceRange.minVariantPrice;
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currencyCode,
    }).format(Number(price.amount));

    return `
      <a href="/products/${product.handle}" class="shoppable-embed" data-shoppable-mount="${product.id}">
        <img src="${product.featuredImage?.url ?? ''}" alt="${product.featuredImage?.altText ?? product.title}" width="80" height="80" loading="lazy" />
        <span class="shoppable-embed__title">${product.title}</span>
        <span class="shoppable-embed__price">${formattedPrice}</span>
      </a>
    `;
  });
}
