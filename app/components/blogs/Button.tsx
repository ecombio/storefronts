// app/components/blogs/Button.tsx
//
// CTA button for blog articles, in two forms that share one CSS file
// (./Button.css, imported below as a side-effect import — see
// "Self-contained styling" in button.md for why the *component*
// import stays a bare side-effect import rather than the ?url +
// links() convention the sibling blog-* stylesheets use, even though
// the file itself now lives co-located next to this component, the
// same way ImagesGallery.css sits next to ImagesGallery.tsx):
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
//
// UPDATE: injectBlogButtons now (1) HTML-escapes data-cta-href,
// data-cta-id, and the parsed label before writing them into the output
// <a> — matching injectQuoteEmbeds' escaping in Quote.tsx, closing a gap
// where an unescaped `"` in any of those values could break out of its
// attribute — and (2) locates each marker's true closing </div> with a
// depth-aware scan rather than a lazy regex that stopped at the first
// </div> it saw. That lazy match previously truncated a marker's label
// (and corrupted the surrounding HTML) whenever an editor wrapped the
// label text in a nested <div> instead of an inline tag like <span>.
//
// RENAME: this file was previously button.tsx (lowercase). Every
// sibling blog-marker module (FaqSection, TwoColumnContent, Quote,
// RecipeHeader, NewsletterForm, Video, ImagesGallery, Summary) uses
// PascalCase filenames, and the route's import
// (`from '~/components/blogs/Button'`) always assumed that casing —
// which only resolved locally on case-insensitive filesystems
// (macOS/Windows). Renamed to Button.tsx to match the import and the
// sibling convention, so the build no longer depends on filesystem
// case-sensitivity.

import * as React from 'react';
import {Link} from 'react-router';
import './Button.css';

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

// True for absolute http(s) URLs, mailto:, and tel: links — i.e. anything
// that should open in a new tab and use a plain <a> rather than react-router's
// client-side <Link>, which only knows how to navigate within this app.
function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
}

// Small classnames helper: joins truthy string fragments with a space and
// drops falsy ones (false/null/undefined), so callers can inline conditionals
// like `fullWidth && 'blog-cta--full'` without worrying about stray spaces.
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// Inline loading spinner shown in place of the icon slot when `loading` is true.
// aria-hidden because the button itself carries aria-busy for screen readers.
const Spinner = () => (
  <svg className="blog-cta__spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ---------------------------------------------------------------------------
// React component — use for CTAs placed directly in route/component JSX.
// ---------------------------------------------------------------------------

// forwardRef so callers (e.g. a parent doing focus management or measuring
// layout) can get a ref to whichever element actually renders — <a>, <Link>,
// or <button> — since which one renders depends on props.
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
  // Loading state acts as an implicit disabled state — you can't click a
  // button mid-spinner.
  const isDisabled = disabled || loading;

  // BEM-ish class list: base + variant modifier + size modifier, plus
  // optional state modifiers. `cx` drops any that don't apply.
  const classes = cx(
    'blog-cta',
    `blog-cta--${variant}`,
    `blog-cta--${size}`,
    fullWidth && 'blog-cta--full',
    loading && 'blog-cta--loading',
    className,
  );

  // Shared inner content across all three render paths (<a>, <Link>, <button>).
  // While loading, the spinner replaces a left-positioned icon; a
  // right-positioned icon is simply hidden until loading finishes, since a
  // trailing spinner would look like it belongs to the wrong side.
  const content = (
    <>
      {loading ? <Spinner /> : icon && iconPosition === 'left' && <span className="blog-cta__icon">{icon}</span>}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="blog-cta__icon">{icon}</span>}
    </>
  );

  // Link/anchor path — only taken when an href was given and the button
  // isn't disabled (a disabled CTA should not be a clickable/focusable link).
  if (href && !isDisabled) {
    // `newTab` prop wins if explicitly set; otherwise infer from the URL shape.
    const external = newTab ?? isExternalHref(href);

    if (external) {
      // Plain <a> for anything outside the app's own routing (external site,
      // mailto, tel). noopener/noreferrer is standard hardening for
      // target="_blank" links.
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

  // Fallback / default path: no href (or disabled) → a real <button>, so
  // it behaves correctly for form-adjacent actions (open modal, submit
  // handler, etc.) and gets proper disabled/aria-busy semantics.
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
// - the div's inner content is the button label. Nested tags are
//   stripped to plain text; the label may safely contain a nested
//   <div> (see the depth-aware scan below) without truncating the
//   marker, though inline tags like <span>/<strong> are still the
//   recommended way for editors to wrap label text.
//
// A marker missing data-cta-href or with empty inner text is left
// untouched rather than silently dropped, so a malformed marker shows up
// as visibly broken (raw div) in preview instead of just vanishing.
// ---------------------------------------------------------------------------

// Escapes the five HTML-significant characters before a value is written
// into generated markup — same set/approach as escapeHtml in Quote.tsx,
// duplicated here rather than shared to keep each marker transform a
// self-contained module (matches the existing project convention: no
// shared "markup helpers" module between the blog-marker files).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Matches only the *opening* tag of a marker <div> whose data-cta value is
// one of the known variants — not the whole marker. The matching closing
// </div> is located separately by findMatchingClose (below), so a nested
// <div> anywhere in the label can't cause a truncated match the way a
// single greedy/lazy "match to first </div>" regex would.
const CTA_OPEN_RE =
  /<div\b([^>]*)\bdata-cta="(primary|secondary|outline|ghost|link)"([^>]*)>/gi;

// Scans forward from just after a marker's opening tag, tracking <div>
// nesting depth, to find the </div> that actually closes *this* marker —
// not the first </div> that happens to appear (which could belong to a
// <div> nested inside the label). Returns the position of that closing
// tag's start (innerEnd, i.e. end of the label content) and its end
// (outerEnd, i.e. where scanning should resume after the whole marker).
// Returns null if the html ends before a matching close is found
// (malformed/unterminated markup) — callers should stop matching further
// markers in that case rather than guess.
function findMatchingClose(
  html: string,
  fromIndex: number,
): {innerEnd: number; outerEnd: number} | null {
  const tagRe = /<(\/?)div\b[^>]*>/gi;
  tagRe.lastIndex = fromIndex;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    if (match[1] === '/') {
      depth--;
      if (depth === 0) {
        return {innerEnd: match.index, outerEnd: tagRe.lastIndex};
      }
    } else {
      depth++;
    }
  }
  return null;
}

// Pulls a single data-xxx="value" attribute out of a raw attribute string.
// Used to read data-cta-href / data-cta-id / data-cta-size from whatever
// surrounded the matched data-cta attribute.
function readAttr(attrString: string, name: string): string | undefined {
  const match = attrString.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'));
  return match?.[1];
}

export function injectBlogButtons(html: string): string {
  let result = '';
  let lastIndex = 0;

  CTA_OPEN_RE.lastIndex = 0;
  let openMatch: RegExpExecArray | null;

  while ((openMatch = CTA_OPEN_RE.exec(html))) {
    const [, before, variant, after] = openMatch;
    const openStart = openMatch.index;
    const openEnd = CTA_OPEN_RE.lastIndex; // just after the opening tag's '>'

    const closeInfo = findMatchingClose(html, openEnd);

    // No matching close found for this marker (truncated/malformed HTML
    // past this point) — stop matching further markers and let everything
    // from here to the end of the document pass through untouched.
    if (!closeInfo) break;

    const fullMarker = html.slice(openStart, closeInfo.outerEnd);

    // Everything between the previous marker (or the start of the
    // document) and this one passes through unchanged.
    result += html.slice(lastIndex, openStart);

    // Attributes can appear on either side of data-cta in the source HTML,
    // so concatenate both capture groups before searching for them.
    const attrs = `${before} ${after}`;
    const href = readAttr(attrs, 'data-cta-href');
    const ctaId = readAttr(attrs, 'data-cta-id');
    const size = readAttr(attrs, 'data-cta-size') ?? 'md';

    // Strip any nested tags from the inner content so the label is plain
    // text (editors sometimes wrap text in <span>/<strong>, or even a
    // nested <div>, out of habit).
    const rawInner = html.slice(openEnd, closeInfo.innerEnd);
    const label = rawInner.replace(/<[^>]+>/g, '').trim();

    // Malformed marker (no destination or no visible label): leave the
    // original marker untouched rather than emitting a broken/empty button.
    if (!href || !label) {
      result += fullMarker;
    } else {
      const classes = `blog-cta blog-cta--${variant} blog-cta--${size}`;
      const external = isExternalHref(href);
      // Mirrors the React component's external-link hardening for the
      // static-HTML path.
      const relAttr = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      const idAttr = ctaId ? ` data-cta-id="${escapeHtml(ctaId)}"` : '';

      // href, ctaId, and label are all escaped before being written into
      // the output tag — a `"` (or `<`/`>`/`&`) in any editor-supplied
      // value can no longer break out of its attribute or corrupt the
      // surrounding markup.
      //
      // Output is a plain <a> (never react-router's <Link>) because this
      // HTML is rendered outside Router context — see file header note on
      // why there's no client-hydrated slot here at all.
      result += `<div class="blog-cta-row"><a class="${classes}" href="${escapeHtml(href)}"${relAttr}${idAttr}>${escapeHtml(label)}</a></div>`;
    }

    lastIndex = closeInfo.outerEnd;
    CTA_OPEN_RE.lastIndex = lastIndex;
  }

  // Trailing content after the last matched marker (or the entire
  // document, if no marker matched at all).
  result += html.slice(lastIndex);

  return result;
}

export default BlogButton;