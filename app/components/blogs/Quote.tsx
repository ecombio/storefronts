/**
 * Quote
 * -----
 * Blog content block for emphasizing a single piece of information — a
 * stat, a customer line, a key takeaway — as a styled pull-quote card
 * with optional attribution.
 *
 * Unlike Video, this block has no interactivity (no click handler, no
 * state that changes after render), so it does NOT use the
 * marker-injection → portal-hydration pattern Video/NewsletterForm use.
 * It follows the simpler pattern FaqSection/TwoColumnContent already
 * use: `injectQuoteEmbeds` rewrites the marker directly into final
 * markup server-side, in the loader. Nothing ships to the client for
 * this block beyond the CSS — no slot, no scan, no createPortal.
 *
 * The `Quote` component below is exported for typed reuse (e.g. hand-
 * placing a quote in a Liquid section later), but it is never portaled
 * into anything — `injectQuoteEmbeds` writes equivalent static HTML
 * directly.
 */

export type QuoteVariant = "card" | "pull";

export interface QuoteProps {
  /** The quote itself. Rendered wrapped in straight double quotes. */
  text: string;
  /** Who said it. Rendered in a <cite>. */
  attribution?: string;
  /** Secondary detail — title/company. Only rendered alongside `attribution`. */
  role?: string;
  /**
   * "card" (default): bordered white card with a quote-mark icon —
   * matches the reference design (see quote.md).
   * "pull": lighter-weight, no card chrome — just a left border accent,
   * for dropping a quote inline without visually boxing it off.
   */
  variant?: QuoteVariant;
  /** Extra class on the root element. */
  className?: string;
}

export default function Quote({
  text,
  attribution,
  role,
  variant = "card",
  className,
}: QuoteProps) {
  return (
    <figure
      className={["quote", `quote--${variant}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      {variant === "card" && (
        <svg
          className="quote__mark"
          viewBox="0 0 24 16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M0 16 4 0h5l-3 16H0Zm11 0 4-16h5l-3 16h-6Z" />
        </svg>
      )}

      <blockquote className="quote__text">&quot;{text}&quot;</blockquote>

      {attribution && (
        <figcaption className="quote__attribution">
          &mdash; <cite className="quote__name">{attribution}</cite>
          {role && <span className="quote__role">, {role}</span>}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Marker syntax an editor drops into a blog article's HTML (via the
 * Shopify blog editor's custom-HTML block):
 *
 *   <div
 *     data-quote-embed
 *     data-text="Life is like a sandwich - the more you add to it..."
 *     data-attribution="Max Crunch"
 *     data-role="Crunchly Co-founder"
 *     data-variant="card"
 *   ></div>
 *
 * Only `data-text` is required. `data-role` is ignored unless
 * `data-attribution` is also present.
 */

const QUOTE_EMBED_RE = /<div\s+data-quote-embed\b([^>]*)><\/div>/gi;
const ATTR_RE = /data-([\w-]+)="([^"]*)"/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString))) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

/**
 * Rewrites every `data-quote-embed` marker in `html` into final,
 * semantic quote markup. Pure string transform, no data fetch and no
 * hydration needed — runs alongside injectFaqSections/
 * injectNewsletterForm/injectVideoEmbeds in the loader.
 *
 * A marker missing `data-text` is dropped silently (renders nothing)
 * rather than left in place or thrown on — same "skip malformed"
 * behavior as the other blocks.
 */
export function injectQuoteEmbeds(html: string): string {
  return html.replace(QUOTE_EMBED_RE, (_match, attrString: string) => {
    const attrs = parseAttrs(attrString);
    if (!attrs.text) return "";

    const variant = attrs.variant === "pull" ? "pull" : "card";
    const text = escapeHtml(attrs.text);

    const markMarkup =
      variant === "card"
        ? `<svg class="quote__mark" viewBox="0 0 24 16" aria-hidden="true" focusable="false"><path d="M0 16 4 0h5l-3 16H0Zm11 0 4-16h5l-3 16h-6Z" /></svg>`
        : "";

    let attributionMarkup = "";
    if (attrs.attribution) {
      const attribution = escapeHtml(attrs.attribution);
      const roleMarkup = attrs.role
        ? `<span class="quote__role">, ${escapeHtml(attrs.role)}</span>`
        : "";
      attributionMarkup = `<figcaption class="quote__attribution">&mdash; <cite class="quote__name">${attribution}</cite>${roleMarkup}</figcaption>`;
    }

    return (
      `<figure class="quote quote--${variant}">` +
      markMarkup +
      `<blockquote class="quote__text">&quot;${text}&quot;</blockquote>` +
      attributionMarkup +
      `</figure>`
    );
  });
}
