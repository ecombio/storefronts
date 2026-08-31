// app/snippets/CollectionCard.tsx
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';

export interface CollectionCardImage {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface CollectionCardProps {
  title: string;
  image?: CollectionCardImage | null;
  /** Usually `/collections/${handle}`. Card renders as a plain div if omitted. */
  href?: string;
}

const IMAGE_SIZES = '(max-width: 640px) 96px, 140px';

export function CollectionCard({title, image, href}: CollectionCardProps) {
  const body = (
    <>
      <div className="collection-card__img-zone">
        {image ? (
          <Image
            data={image}
            className="collection-card__img"
            loading="lazy"
            sizes={IMAGE_SIZES}
            alt={image.altText ?? title}
          />
        ) : (
          <div className="collection-card__img-placeholder" aria-hidden="true" />
        )}
      </div>
      <span className="collection-card__title">{title}</span>
    </>
  );

  if (href) {
    return (
      <Link to={href} className="collection-card">
        {body}
      </Link>
    );
  }

  return <div className="collection-card">{body}</div>;
}
