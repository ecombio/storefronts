import type {ReactNode} from 'react';

/**
 * SocialShare
 * -----------
 * "Social sharing" card shown on an article: email, Facebook, X, and
 * Pinterest share links.
 *
 * Rendered directly in the tree, same as AuthorSection — no marker,
 * no portal, no DOM-scanning effect needed. Two reasons this one is
 * even simpler than AuthorSection:
 *
 *   1. It doesn't parse anything out of `contentHtml` — its only
 *      inputs (article title, image, and the page's own URL) are
 *      already available in the route/loader, not embedded in the
 *      rich text body.
 *   2. Every link is a real share-intent URL (mailto:, Facebook's
 *      sharer, X's intent, Pinterest's pin-create), so the whole
 *      component works with zero JavaScript — clicking a link just
 *      navigates, same as any other <a>. The onClick handlers below
 *      are a progressive enhancement (open a small popup instead of
 *      leaving the article) layered on top of hrefs that are already
 *      fully functional without them.
 */

export interface SocialShareProps {
  /** Canonical URL of the article being shared */
  url: string;
  /** Article title, used as the share text/subject */
  title: string;
  /** Optional image URL, used for Pinterest's richer share preview */
  imageUrl?: string;
  /** Defaults to "Social sharing" */
  heading?: string;
}

type Platform = {
  id: 'email' | 'facebook' | 'x' | 'pinterest';
  label: string;
  href: (args: {url: string; title: string; imageUrl?: string}) => string;
  /** Popup links also get target="_blank" as the no-JS fallback; email
   *  should navigate the current tab normally, not open a popup or a
   *  new tab. */
  popup: boolean;
  icon: () => ReactNode;
};

const PLATFORMS: Platform[] = [
  {
    id: 'email',
    label: 'Share by email',
    href: ({url, title}) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    popup: false,
    icon: EnvelopeIcon,
  },
  {
    id: 'facebook',
    label: 'Share on Facebook',
    href: ({url}) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    popup: true,
    icon: FacebookIcon,
  },
  {
    id: 'x',
    label: 'Share on X',
    href: ({url, title}) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    popup: true,
    icon: XIcon,
  },
  {
    id: 'pinterest',
    label: 'Share on Pinterest',
    href: ({url, title, imageUrl}) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}` +
      `&description=${encodeURIComponent(title)}` +
      (imageUrl ? `&media=${encodeURIComponent(imageUrl)}` : ''),
    popup: true,
    icon: PinterestIcon,
  },
];

export default function SocialShare({
  url,
  title,
  imageUrl,
  heading = 'Social sharing',
}: SocialShareProps) {
  return (
    <section className="ss-root" aria-labelledby="ss-heading">
      <h2 className="ss-heading" id="ss-heading">
        {heading}
      </h2>

      <ul className="ss-list">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const href = platform.href({url, title, imageUrl});

          return (
            <li key={platform.id}>
              <a
                className="ss-button"
                href={href}
                aria-label={platform.label}
                target={platform.popup ? '_blank' : undefined}
                rel={platform.popup ? 'noopener noreferrer' : undefined}
                onClick={
                  platform.popup
                    ? (event) => {
                        // Progressive enhancement only — the href above
                        // already works as a plain new-tab navigation
                        // link if this handler never runs (JS disabled,
                        // middle-click, etc).
                        event.preventDefault();
                        window.open(
                          href,
                          'share-popup',
                          'width=600,height=520,noopener,noreferrer',
                        );
                      }
                    : undefined
                }
              >
                <Icon />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 6l9 7 9-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FacebookIcon() {
  // Clean glyph inside a real 0 0 24 24 viewBox — the previous version
  // used path coordinates authored for a taller box (~y=15-29) with a
  // translate(0 -4) patch that still left it outside the 24-unit
  // viewBox, so it rendered shifted/cropped next to the other icons.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.5 8.5H18V5.2c-.43-.06-1.9-.2-3.62-.2-3.58 0-6.03 2.24-6.03 6.36V15H5v3.7h3.35V29h3.98V18.7h3.22l.5-3.7h-3.72v-3.15c0-1.07.29-1.35 1.17-1.35Z" transform="translate(0 -9)" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 3H22l-7.6 8.7L23 21h-6.9l-5.4-6.7L4.5 21H1.4l8.2-9.3L1 3h7.1l4.9 6.1L18.9 3Zm-1.2 16h1.7L7.4 4.9H5.6L17.7 19Z" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.63 7.86 6.35 9.32-.09-.79-.17-2.01.03-2.87.19-.79 1.22-5.02 1.22-5.02s-.31-.62-.31-1.55c0-1.45.84-2.53 1.89-2.53.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.87 3.48-.25 1.05.52 1.9 1.55 1.9 1.86 0 3.29-1.96 3.29-4.79 0-2.51-1.8-4.26-4.37-4.26-2.98 0-4.73 2.23-4.73 4.54 0 .9.35 1.87.78 2.39a.31.31 0 0 1 .07.3c-.08.32-.25 1.05-.29 1.19-.05.2-.15.24-.35.14-1.32-.61-2.15-2.54-2.15-4.09 0-3.33 2.42-6.39 6.98-6.39 3.66 0 6.51 2.61 6.51 6.09 0 3.63-2.29 6.55-5.47 6.55-1.07 0-2.07-.56-2.42-1.21l-.66 2.5c-.24.92-.89 2.08-1.32 2.78.99.31 2.04.47 3.13.47 5.52 0 10-4.48 10-10S17.52 2 12 2Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// Optional gating — only needed if an article should be able to opt
// out of the section. Mirrors isRelatedPostsEnabled's shape: default
// on, opt out via a metafield.
// ---------------------------------------------------------------------

export interface SocialShareSourceArticle {
  metafield?: {value: string} | null; // custom.show_social_share
}

export function isSocialShareEnabled(
  article: SocialShareSourceArticle,
): boolean {
  return article.metafield?.value !== 'false';
}