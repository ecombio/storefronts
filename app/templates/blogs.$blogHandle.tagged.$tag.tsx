// app/templates/blogs.$blogHandle.tagged.$tag.tsx

import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/blogs.$blogHandle.tagged.$tag';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import type {ArticleItemFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = ({params}) => {
  return [{title: `Hydrogen | ${params.blogHandle} | ${params.tag}`}];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, request, params}: Route.LoaderArgs) {
  const {blogHandle, tag} = params;

  if (!blogHandle || !tag) {
    throw new Response('Not found', {status: 404});
  }

  const paginationVariables = getPaginationVariables(request, {
    pageBy: 10,
  });

  const [{blog}] = await Promise.all([
    context.storefront.query(BLOG_TAGGED_QUERY, {
      variables: {
        blogHandle,
        query: `tag:'${tag}'`,
        ...paginationVariables,
      },
    }),
  ]);

  if (!blog?.articles) {
    throw new Response('Blog not found', {status: 404});
  }

  return {blog, tag};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function BlogTagged() {
  const {blog, tag} = useLoaderData<typeof loader>();

  return (
    <div className="blog-category">
      <section className="blog-category__hero">
        <h1>{blog.title}</h1>
        <p>Showing posts tagged “{tag}”</p>
      </section>

      <div className="blog-category__grid">
        <PaginatedResourceSection<ArticleItemFragment>
          connection={blog.articles}
        >
          {({node: article}) => (
            <Link
              key={article.id}
              className="post-card"
              prefetch="intent"
              to={`/blogs/${blog.handle}/${article.handle}`}
            >
              <h3>{article.title}</h3>
            </Link>
          )}
        </PaginatedResourceSection>
      </div>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOG_TAGGED_QUERY = `#graphql
  query BlogTagged(
    $blogHandle: String!
    $query: String
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    blog(handle: $blogHandle) {
      title
      handle
      articles(
        query: $query,
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          id
          title
          handle
        }
      }
    }
  }
` as const;