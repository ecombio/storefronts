// app/components/blogs/button.tsx
//
// CTA button for blog articles, in two forms that share one CSS file
// (~/assets/blog-button.css, imported below as a side-effect import —
// see "Self-contained styling" in button.md for why this one diverges
// from the ?url + links() convention the sibling blog-* stylesheets use):
//
// 1. <BlogButton> — a real React component for CTAs you place directly
//    in a route's JSX (e.g. a fixed end-of-article CTA in
//    blogs.$blogHandle.$articleHandle.tsx, or inside AuthorSection).
//    Rendered wherever the route tree already provides Router context,
//    so it's safe to use react-router's <Link> for internal hrefs.
//
// 2. injectBlogButtons(html) — a pure string transform, same shape as
//    injectFaqSections/injectNewsletterForm/injectVideoEmbeds, that lets
//    editors drop a CTA marker directly into an article's HTML in the
//    Shopify blog editor and have it come out as real button markup.
//
// Unlike the newsletter-form and video-embed markers, a CTA marker does
// NOT resolve to a data-*-slot + createPortal pair. A button needs no
// Router hooks (no useNavigate/useFetcher) and no client JS to be
// useful — an <a href> works with zero hydration — so it follows the
// same "fully static, no slot" precedent as two-column-content instead.
// Click tracking (see button.md) rides on the static data-cta-id
// attribute plus a GTM/GA4 selector rule, not a client handler, for the
// same reason: nothing hydrates this node.

import * as React from 'react';
import {Link} from 'react-router';
import '~/assets/blog-button.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BlogButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Button label. Keep it a short, active-voice action ("Shop the set"). */
  children: React.ReactNode;
  /** If provided, renders a link (internal → react-router <Link>, external → <a>) instead of a <button>. */
  href?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  /** Stretch to fill the width of its container. */
  fullWidth?: boolean;
  /** Force new-tab behavior. Auto-detected for external hrefs when omitted. */
  newTab?: boolean;
  /** Shows a spinner and disables interaction. */
  loading?: boolean;
  /**
   * Analytics identifier, e.g. "blog-midpost-shop-now". Rendered as
   * data-cta-id so GTM/GA4 can target it without any client JS from
   * this component — see button.md "Tracking".
   */
  ctaId?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const Spinner = () => (
  <svg className="blog-cta__spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ---------------------------------------------------------------------------
// React component — use for CTAs placed directly in route/component JSX.
// ---------------------------------------------------------------------------

export const BlogButton = React.forwardRef<HTMLElement, BlogButtonProps>(function BlogButton(
  {
    children,
    href,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    newTab,
    loading = false,
    disabled,
    ctaId,
    onClick,
    className,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const classes = cx(
    'blog-cta',
    `blog-cta--${variant}`,
    `blog-cta--${size}`,
    fullWidth && 'blog-cta--full',
    loading && 'blog-cta--loading',
    className,
  );

  const content = (
    <>
      {loading ? <Spinner /> : icon && iconPosition === 'left' && <span className="blog-cta__icon">{icon}</span>}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="blog-cta__icon">{icon}</span>}
    </>
  );

  if (href && !isDisabled) {
    const external = newTab ?? isExternalHref(href);

    if (external) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          data-cta-id={ctaId}
          className={classes}
        >
          {content}
        </a>
      );
    }

    // Internal link: use react-router's <Link> for client-side nav +
    // prefetch. Safe here because BlogButton is only ever rendered
    // directly inside the route tree (see file header) — never
    // portaled into dangerouslySetInnerHTML content the way the
    // newsletter form is, so Router context is always present.
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={href}
        onClick={onClick}
        data-cta-id={ctaId}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-cta-id={ctaId}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
});

BlogButton.displayName = 'BlogButton';

// ---------------------------------------------------------------------------
// injectBlogButtons — marker → static markup, for CTAs embedded inside an
// article's own HTML via the Shopify blog editor.
//
// Marker syntax (typed by editors directly into the HTML source view):
//
//   <div data-cta="primary" data-cta-href="/collections/new-arrivals"
//        data-cta-id="blog-summer-guide-shop">Shop new arrivals</div>
//
// - data-cta       required. One of: primary | secondary | outline | ghost | link
// - data-cta-href  required. Destination URL (relative or absolute).
// - data-cta-id    optional but strongly recommended — see button.md "Tracking".
// - data-cta-size  optional. sm | md (default) | lg
// - the div's inner text is the button label.
//
// A marker missing data-cta-href or with empty inner text is left
// untouched rather than silently dropped, so a malformed marker shows up
// as visibly broken (raw div) in preview instead of just vanishing.
// ---------------------------------------------------------------------------

const CTA_MARKER_RE =
  /<div\b([^>]*)\bdata-cta="(primary|secondary|outline|ghost|link)"([^>]*)>([\s\S]*?)<\/div>/gi;

function readAttr(attrString: string, name: string): string | undefined {
  const match = attrString.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'));
  return match?.[1];
}

export function injectBlogButtons(html: string): string {
  return html.replace(CTA_MARKER_RE, (full, before: string, variant: string, after: string, inner: string) => {
    const attrs = `${before} ${after}`;
    const href = readAttr(attrs, 'data-cta-href');
    const ctaId = readAttr(attrs, 'data-cta-id');
    const size = readAttr(attrs, 'data-cta-size') ?? 'md';
    const label = inner.replace(/<[^>]+>/g, '').trim();

    if (!href || !label) return full;

    const classes = `blog-cta blog-cta--${variant} blog-cta--${size}`;
    const external = isExternalHref(href);
    const relAttr = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    const idAttr = ctaId ? ` data-cta-id="${ctaId}"` : '';

    return `<div class="blog-cta-row"><a class="${classes}" href="${href}"${relAttr}${idAttr}>${label}</a></div>`;
  });
}

export default BlogButton;