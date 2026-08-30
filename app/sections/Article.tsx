// app/sections/Article.tsx

import {useEffect} from 'react';
import {Image} from '@shopify/hydrogen';

export function Article({article}: {article: ArticleFragment}) {
  const {title, image, contentHtml, author} = article;

  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  // Layout variant resolution:
  // 1. Which blog this article lives in (hub = "category", spoke = "articles")
  // 2. An optional per-article metafield override (custom.layout_variant),
  //    for cases where a single blog needs more than one look (e.g. a
  //    "feature" article inside the normally-plain "articles" blog).
  // The metafield, when set, layers on top of — it doesn't replace — the
  // hub/spoke class, so both can drive CSS at once.
  const isHub = article.blog?.handle === 'category';
  const layoutVariant = article.layoutVariant?.value; // e.g. "feature" | undefined

  const articleClassName = [
    'article',
    isHub ? 'article--hub' : 'article--spoke',
    layoutVariant ? `article--${layoutVariant}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  // dangerouslySetInnerHTML content lives outside the React tree, so any
  // <details id="..."> deep-linked via a URL hash (e.g. #faq-range)
  // needs to be opened imperatively — CSS :target can only fake the visual
  // state and leaves the item stuck open/unclosable. Re-run when contentHtml
  // changes (e.g. client-side navigation between articles).
  useEffect(() => {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
  }, [contentHtml]);

  return (
    <div className={articleClassName}>
      <h1>{title}</h1>
      <div className="article-meta">
        <time dateTime={article.publishedAt}>{publishedDate}</time> &middot;{' '}
        <address>{author?.name}</address>
      </div>

      {image && (
        <Image
          data={image}
          sizes="(min-width: 760px) 720px, 90vw"
          aspectRatio="16/9"
          crop="center"
          loading="eager"
        />
      )}
      <div
        dangerouslySetInnerHTML={{__html: contentHtml}}
        className="article-body"
      />
    </div>
  );
}
