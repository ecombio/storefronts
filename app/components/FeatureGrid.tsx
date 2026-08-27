/**
 * Ported from snippets/feature-grid.liquid.
 * Styles live in main-product.css (.feature-grid, .feature-tile, etc.)
 * — reuse the CSS file already generated for the theme version.
 *
 * Expects the shape produced by the featureGrid metafield query added
 * to PRODUCT_FRAGMENT (see products.$handle.tsx below): a list of
 * metaobject references with icon / title / label / description /
 * subtitle / link fields.
 */

type FeatureItem = {
  icon?: {reference?: {image?: {url: string} | null} | null} | null;
  title?: {value?: string | null} | null;
  label?: {value?: string | null} | null;
  description?: {value?: string | null} | null;
  subtitle?: {value?: string | null} | null;
  link?: {value?: string | null} | null;
};

export function FeatureGrid({items}: {items?: FeatureItem[] | null}) {
  if (!items?.length) return null;

  return (
    <div className="feature-grid">
      {items.map((item, index) => {
        const label = item.label?.value;
        const description = item.description?.value;

        // Skip entries with nothing meaningful to show.
        if (!label && !description) return null;

        const title = item.title?.value || undefined;
        const link = item.link?.value;
        const iconUrl = item.icon?.reference?.image?.url;
        const iconAlt = label || title || '';

        const content = (
          <>
            {iconUrl && (
              <div className="feature-icon">
                <img src={iconUrl} alt={iconAlt} width={48} height={48} loading="lazy" />
              </div>
            )}
            <div className="feature-text">
              {label && <p className="feature-uptitle">{label}</p>}
              {description && <p className="feature-headline">{description}</p>}
              {item.subtitle?.value && (
                <p className="feature-subtitle">{item.subtitle.value}</p>
              )}
            </div>
          </>
        );

        return link ? (
          <a key={index} href={link} className="feature-tile" title={title}>
            {content}
          </a>
        ) : (
          <div key={index} className="feature-tile" title={title}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
