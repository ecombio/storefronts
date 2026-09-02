// app/templates/blogs.$blogHandle.$articleHandle.tsx
//
// Route: /blogs/:blogHandle/:articleHandle
// Renders a single blog article, including support for "shoppable"
// product embeds placed inline inside the article's rich-text HTML.

import {useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {extractShoppableProductIds, injectShoppableProducts} from '~/components/blogs/ProductGallery';
import {Article} from '~/sections/Article';
import {ARTICLE_QUERY, SHOPPABLE_PRODUCTS_QUERY} from '~/graphql/blog/ArticleQuery';
import type {ProductCardFragment} from 'storefrontapi.generated';
import articleStyles from '~/assets/article.css?url';

// Registers this route's stylesheet with React Router so it's only
// loaded when this route is active (route-scoped CSS).
export function links() {
  return [{rel: 'stylesheet', href: articleStyles}];
}

// Sets the <title> tag using the article title returned by the loader.
// `data` may be undefined if the loader threw before returning, so the
// article title is optional-chained with a fallback empty string.
export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.article.title ?? ''} article`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Kick off non-critical ("below the fold") data fetching without
  // blocking Time To First Byte. Currently a no-op (see below), but
  // the split is kept so deferred data can be added later without
  // restructuring the loader.
  const deferredData = loadDeferredData(args);

  // Critical data: everything required to render the initial page.
  // If this fails, the whole route should error (400/500) rather
  // than render a broken page.
  const criticalData = await loadCriticalData(args);

  // Merge both into a single loader payload for the component.
  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;

  // Defensive guard: route params should always be present given the
  // file-based route naming, but bail out early with a 404 if not.
  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  // Fetch the article. Wrapped in Promise.all so additional parallel
  // queries can be added later (e.g. related articles) without
  // serializing requests.
  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  // No matching blog/article for these handles -> 404.
  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

  // If Shopify's canonical handle for this market/locale differs from
  // the one in the URL, issue a redirect to the correct localized URL.
  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  );

  const article = blog.articleByHandle;

  // --- Shoppable product embeds ---
  // Editors can embed inline product callouts in the article body via
  // `data-shoppable-product` / `data-solo` / `data-duo` / `data-trio`
  // attributes in the rich-text HTML. Scan the raw HTML for the
  // (numeric) product IDs referenced by those markers.
  const productIds = extractShoppableProductIds(article.contentHtml);
  let contentHtml = article.contentHtml;

  // Keyed by the same numeric IDs used in the article markup — extract,
  // inject, ProductRow/StaticProductRow, and Article.tsx's hydration
  // effect all key their lookups on the numeric ID, not the GID.
  // shoppableProducts is passed down as entries (not a Map — loader data
  // must be JSON-serializable) for Article.tsx to rebuild on the client.
  let shoppableProducts: [string, ProductCardFragment][] = [];

  if (productIds.length > 0) {
    // The Storefront API's nodes(ids: $ids) requires full GIDs, not the
    // plain numeric IDs pulled from the article's data-* markers.
    const gids = productIds.map((id) => `gid://shopify/Product/${id}`);

    // Batch-fetch all referenced products in a single query.
    const {nodes} = await context.storefront.query(SHOPPABLE_PRODUCTS_QUERY, {
      variables: {ids: gids},
    });

    // nodes() preserves input order, so zip back to the numeric IDs
    // rather than trusting node.id (which comes back as a GID) — this
    // keeps the numeric ID as the join key end-to-end.
    const productsById = new Map(
      productIds
        .map((id, i) => [id, nodes?.[i]] as const)
        // Drop entries where the product node came back null (e.g. the
        // product was deleted or is no longer accessible), and narrow
        // the type so TypeScript knows the remaining entries are valid.
        .filter(
          (entry): entry is [string, ProductCardFragment] =>
            Boolean(entry[1]),
        ),
    );

    // Replace the data-* markers in the raw HTML with resolved product
    // markup/placeholders, and keep the resolved map (as entries) so
    // the client can rehydrate interactive product rows.
    contentHtml = injectShoppableProducts(article.contentHtml, productsById);
    shoppableProducts = [...productsById.entries()];
  }

  // Return the article with its HTML swapped for the shoppable-embed
  // version, plus the resolved product data needed to hydrate it.
  return {article: {...article, contentHtml}, shoppableProducts};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  // No deferred data yet — placeholder for future below-the-fold
  // fetches (e.g. related articles, comment counts).
  return {};
}

// Route component: reads the loader payload and hands it off to the
// Article section component for rendering.
export default function ArticleTemplate() {
  const {article, shoppableProducts} = useLoaderData<typeof loader>();
  return <Article article={article} shoppableProducts={shoppableProducts} />;
}
