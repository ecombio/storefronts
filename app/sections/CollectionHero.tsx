// app/sections/CollectionHero.tsx

interface CollectionHeroProps {
  title: string;
  descriptionHtml?: string | null;
}

/**
 * Collection page hero: title + rich-text description. Mirrors the
 * Liquid theme's `collection-hero` section 1:1 (same id/class names)
 * so any ported `collection-hero.css` needs no changes to match.
 */
export function CollectionHero({title, descriptionHtml}: CollectionHeroProps) {
  return (
    <div className="collection-hero" id="collection-hero">
      <h1 className="collection-title">{title}</h1>
      {descriptionHtml && (
        <div
          className="collection-description rte"
          dangerouslySetInnerHTML={{__html: descriptionHtml}}
        />
      )}
    </div>
  );
}