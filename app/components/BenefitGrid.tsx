/**
 * Ported from snippets/benefit-grid.liquid.
 * Styles live in main-product.css (.benefit-grid, .benefit-item, etc.).
 */

type BenefitItem = {
  icon?: {reference?: {image?: {url: string} | null} | null} | null;
  title?: {value?: string | null} | null;
  tooltip?: {value?: string | null} | null;
  // "link" is a metaobject field of type `link`, whose value is a JSON
  // string like {"text":"...","url":"..."} — not a plain URL string.
  link?: {value?: string | null} | null;
};

function parseLinkValue(value?: string | null): {url: string; text?: string} | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed?.url ? parsed : null;
  } catch {
    return null;
  }
}

export function BenefitGrid({items}: {items?: BenefitItem[] | null}) {
  if (!items?.length) return null;

  return (
    <div className="benefit-grid">
      {items.map((item, index) => {
        const title = item.title?.value;
        if (!title) return null;

        const tooltip = item.tooltip?.value || undefined;
        const link = parseLinkValue(item.link?.value);
        const iconUrl = item.icon?.reference?.image?.url;

        const content = (
          <>
            {iconUrl && (
              <div className="benefit-icon">
                <img src={iconUrl} alt="" width={24} height={24} loading="lazy" />
              </div>
            )}
            <h3 className="benefit-title">{title}</h3>
          </>
        );

        return link ? (
          <a
            key={index}
            href={link.url}
            className="benefit-item"
            target="_blank"
            rel="noopener noreferrer"
            title={tooltip}
          >
            {content}
          </a>
        ) : (
          <div key={index} className="benefit-item" title={tooltip}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
