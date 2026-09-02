// app/sections/Article.tsx

import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Image} from '@shopify/hydrogen';
import {ProductCard} from '~/snippets/ProductCard';
import {Solo, Duo, Trio} from '~/snippets/RowSnippets';
import type {ProductCardFragment} from 'storefrontapi.generated';

type ShoppableSlot = {
  el: HTMLElement;
  kind: string;
  ids: string[];
};

export function Article({
  article,
  shoppableProducts = [],
}: {
  article: ArticleFragment;
  // Full product data for every ID referenced by a shoppable-embed
  // marker in this article, returned by the loader alongside
  // contentHtml. Keyed as [numericId, product] pairs — not a Map,
  // since loader data must be JSON-serializable — and keyed on the
  // same numeric ID used in the article's data-* markers (not the
  // GID on product.id), matching extract/inject/ProductRow/
  // StaticProductRow throughout the pipeline.
  shoppableProducts?: [string, ProductCardFragment][];
}) {
  const {title, image, contentHtml, author} = article;
  const bodyRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<ShoppableSlot[]>([]);

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
  // The metafield, when set, layers on top of - it doesn't replace - the
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
  // needs to be opened imperatively - CSS :target can only fake the visual
  // state and leaves the item stuck open/unclosable. Re-run when contentHtml
  // changes (e.g. client-side navigation between articles).
  useEffect(() => {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
  }, [contentHtml]);

  // Finds each server-rendered shoppable-embed slot (rendered with the
  // hook-free Static* components in ~/lib/shoppable-embeds) and records
  // it so the real, interactive component can be portaled into it below.
  //
  // Deliberately NOT createRoot(el).render(...) here: that would spin up
  // a brand-new, disconnected React tree with no access to this app's
  // context providers (Router context for useNavigate(), the Aside
  // context for useAside(), cart context for CartForm's fetcher) - any
  // of those hooks throws immediately, the isolated root unmounts on
  // error, and the slot goes blank right after it briefly shows the
  // static SSR markup. createPortal keeps the interactive component
  // inside *this* component's tree (rendered below, alongside the rest
  // of Article's JSX) while still targeting the slot's DOM node, so it
  // inherits every provider this tree already has.
  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;

    const found: ShoppableSlot[] = [];
    container
      .querySelectorAll<HTMLElement>('[data-shoppable-slot]')
      .forEach((el) => {
        const kind = el.getAttribute('data-shoppable-slot');
        const ids = (el.getAttribute('data-product-ids') ?? '')
          .split(',')
          .filter(Boolean);
        if (!kind || ids.length === 0) return;

        // Clear the static server-rendered markup - the portal below
        // renders the live replacement into this same node.
        el.innerHTML = '';
        found.push({el, kind, ids});
      });

    setSlots(found);
  }, [contentHtml]);

  // Keyed by numeric ID (see the shoppableProducts prop comment above) —
  // must match the numeric IDs in each slot's data-product-ids
  // attribute, not product.id (a GID).
  const productsById = new Map(shoppableProducts);

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
        ref={bodyRef}
        dangerouslySetInnerHTML={{__html: contentHtml}}
        className="article-body"
      />
      {slots.map(({el, kind, ids}) => {
        let node: React.ReactNode = null;

        switch (kind) {
          case 'single': {
            const product = productsById.get(ids[0]);
            node = product ? <ProductCard product={product} /> : null;
            break;
          }
          case 'solo':
            node = (
              <Solo productIds={[ids[0]]} productsById={productsById} />
            );
            break;
          case 'duo':
            node = (
              <Duo
                productIds={[ids[0], ids[1]]}
                productsById={productsById}
              />
            );
            break;
          case 'trio':
            node = (
              <Trio
                productIds={[ids[0], ids[1], ids[2]]}
                productsById={productsById}
              />
            );
            break;
        }

        if (!node) return null;
        return createPortal(node, el, `${kind}-${ids.join('-')}`);
      })}
    </div>
  );
}