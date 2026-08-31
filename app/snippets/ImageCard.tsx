// app/snippets/ImageCard.tsx
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';

export interface ImageCardImage {
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface ImageCardProps {
  image: ImageCardImage;
  title: string;
  /** Optional secondary line under the title. */
  caption?: string;
  /** If provided, the whole card becomes a link. */
  href?: string;
  /** Optional small badge over the image, e.g. "Going fast", "New". */
  eyebrow?: string;
}

const IMAGE_SIZES =
  '(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';

export function ImageCard({image, title, caption, href, eyebrow}: ImageCardProps) {
  const body = (
    <>
      <div className="image-card__img-zone">
        <Image
          data={image}
          className="image-card__img"
          loading="lazy"
          sizes={IMAGE_SIZES}
          alt={image.altText ?? title}
        />
        {eyebrow && <span className="image-card__eyebrow">{eyebrow}</span>}
      </div>

      <div className="image-card__body">
        <span className="image-card__title">{title}</span>
        {caption && <span className="image-card__caption">{caption}</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link to={href} className="image-card" aria-label={title}>
        {body}
      </Link>
    );
  }

  return <div className="image-card">{body}</div>;
}
