// app/sections/CollectionArticles.tsx

import {ArticleItem} from '~/snippets/ArticleItem';
import type {ArticleItemFragment} from 'storefrontapi.generated';

interface CollectionArticlesProps {
  articles: ArticleItemFragment[];
}

/**
 * The "Expert Advice" tab panel for a collection page. Owns the
 * `articles` slice of the collection's loader data (sourced from the
 * `custom.posts` metafield), the same way CollectionFeed owns `products`.
 */
export function CollectionArticles({articles}: CollectionArticlesProps) {
  if (!articles.length) {
    return <p className="collection-empty">No articles found.</p>;
  }

  return (
    <div className="article-feed">
      {articles.map((article, index) => (
        <ArticleItem
          key={article.id}
          article={article}
          loading={index < 8 ? 'eager' : undefined}
        />
      ))}
    </div>
  );
}