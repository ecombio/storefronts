// app/templates/blogs.$blogHandle.$articleHandle.tsx

import {useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.$articleHandle';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {extractShoppableProductIds, injectShoppableProducts} from '~/lib/shoppable-embeds';
import {Article} from '~/sections/Article';
import {ARTICLE_QUERY, SHOPPABLE_PRODUCTS_QUERY} from '~/graphql/blog/ArticleQuery';
import articleStyles from '~/assets/article.css?url';

export function links() {
  return [{rel: 'stylesheet', href: articleStyles}];
}

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data?.article.title ?? ''} article`}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, articleHandle} = params;

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', {status: 404});
  }

  const [{blog}] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: {blogHandle, articleHandle},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!blog?.articleByHandle) {
    throw new Response(null, {status: 404});
  }

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

  // Resolve any inline `data-shoppable-product` markers in the article body
  const productIds = extractShoppableProductIds(article.contentHtml);
  let contentHtml = article.contentHtml;

  if (productIds.length > 0) {
    const {nodes} = await context.storefront.query(SHOPPABLE_PRODUCTS_QUERY, {
      variables: {ids: productIds},
    });
    const productsById = new Map(
      (nodes ?? []).filter(Boolean).map((p: any) => [p.id, p]),
    );
    contentHtml = injectShoppableProducts(article.contentHtml, productsById);
  }

  return {article: {...article, contentHtml}};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function ArticleTemplate() {
  const {article} = useLoaderData<typeof loader>();
  return <Article article={article} />;
}
