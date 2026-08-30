// app/snippets/ArticleItem.tsx

import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {ArticleItemFragment} from 'storefrontapi.generated';

interface ArticleItemProps {
  article: ArticleItemFragment;
  loading?: 'eager' | 'lazy';
}

/**
 * A single article card in a collection's "Expert Advice" feed. The
 * whole card is one click/focus target via the title link
 * (stretched-link pattern) — the image link is decorative only,
 * matching the original card's accessibility behavior.
 */
export function ArticleItem({article, loading = 'lazy'}: ArticleItemProps) {
  const url = `/blogs/${article.blog.handle}/${article.handle}`;
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const excerpt = article.excerpt ? truncateWords(article.excerpt, 20) : 'Read the full story.';

  return (
    <article className="article-card">
      <Link to={url} className="article-card__image-wrapper" aria-hidden="true" tabIndex={-1}>
        {article.image ? (
          <Image
            data={article.image}
            aspectRatio="4/3"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading={loading}
            className="article-card__image"
          />
        ) : (
          <div className="article-card__image article-card__image--placeholder" />
        )}
      </Link>

      <div className="article-card__content">
        <div className="article-card__meta">
          {publishedDate && <time dateTime={article.publishedAt}>{publishedDate}</time>}
          {article.readingTime?.value && (
            <span className="article-card__metafield-tag">
              {article.readingTime.value} min read
            </span>
          )}
        </div>

        <h3 className="article-card__title">
          <Link to={url} className="article-card__title-link">
            {article.title}
          </Link>
        </h3>

        <p className="article-card__excerpt">{excerpt}</p>

        <span className="article-card__read-more" aria-hidden="true">
          Read article
        </span>
      </div>
    </article>
  );
}

function truncateWords(text: string, wordCount: number): string {
  const stripped = text.replace(/<[^>]*>/g, '').trim();
  const words = stripped.split(/\s+/);
  return words.length > wordCount ? `${words.slice(0, wordCount).join(' ')}…` : stripped;
}