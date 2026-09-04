// app/sections/CollectionBanner.tsx

export type CollectionBannerTextAlignment = 'left' | 'center' | 'right';

interface CollectionBannerProps {
  title: string;
  descriptionHtml?: string | null;
  /** Default: 'left'. */
  textAlignment?: CollectionBannerTextAlignment;
}

/**
 * Collection page banner: title + rich-text description, text-only.
 */
export function CollectionBanner({
  title,
  descriptionHtml,
  textAlignment = 'left',
}: CollectionBannerProps) {
  return (
    <div
      id="collection-banner"
      className={`collection-banner collection-banner--text-${textAlignment}`}
    >
      <div className="collection-banner__text">
        <h1 className="collection-title">{title}</h1>
        {descriptionHtml && (
          <div
            className="collection-description rte"
            dangerouslySetInnerHTML={{__html: descriptionHtml}}
          />
        )}
      </div>
    </div>
  );
}