import {Image} from '@shopify/hydrogen';
import {Link} from 'react-router';

/**
 * BlogPostCard
 * -------------
 * A single blog-post preview card: image, date, title. Extracted out
 * of RelatedBlogPosts.tsx so it isn't locked to the "related posts"
 * grid — anywhere else that wants to preview an article (a blog
 * index/listing page, a search results page, a "recent posts"
 * widget, etc.) can render the exact same card by importing this
 * file, rather than reimplementing the markup or reaching into
 * RelatedBlogPosts for something it was never meant to export
 * standalone.
 *
 * Deliberately has NO knowledge of grids, sections, or headings —
 * layout (how many columns, what wraps it, spacing between cards) is
 * the caller's job. This component only renders one <li> and assumes
 * whatever wraps it is a list (see the className note below).
 *
 * Visual design notes (why this looks the way it does):
 * The previous version was the generic "SaaS-card kit" — a bordered,
 * rounded rectangle with a soft border on both the card and the image,
 * an uppercase tracked-out date label, and a filled pill "Read more"
 * button — the kind of card any template ships with by default.
 * This version separates cards with whitespace instead of a border,
 * drops the CTA pill entirely (redundant once the whole card is
 * clickable), and treats the date as a quiet byline rather than a
 * tracked-out meta chip. One hover moment (the image lifts slightly)
 * signals interactivity instead of a button-style hover state.
 *
 * This also fixes an accessibility issue the old version had: image,
 * title, and "Read more" were three separate links to the same URL —
 * a screen-reader user tabbing through the grid hit the same
 * destination three times per card. Below, only the title is a real
 * <a>; a ::after "stretched link" (see BlogPostCard.css) makes the
 * whole card clickable without adding more anchors. One link, one
 * accessible name, per post.
 *
 * No-image placeholder: renders a small inline icon on a muted tile
 * rather than an external asset. Previously used Shopify's own
 * internal "no image" fallback graphic (a circle-slash icon with
 * baked-in "No image" text) — that graphic reads as an error/blocked
 * state rather than "no photo yet," and it's an undocumented internal
 * theme asset Shopify has never published as something apps should
 * depend on. The inline SVG below has no external dependency, no
 * text baked into the graphic, and is styleable via BlogPostCard.css
 * to match the rest of the card.
 */

// The shape one card needs to render. Named generically (not
// "RelatedPost") since this component has no idea whether the post
// it's given is "related" to anything — that's a decision made by
// whoever assembles the list of posts to pass in.
export interface BlogPostCardData {
  id: string;
  title: string;
  handle: string;
  blogHandle: string; // needed to build the /blogs/{blogHandle}/{handle} URL
  publishedAt: string;
  image?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
}

export interface BlogPostCardProps {
  post: BlogPostCardData;
}

export default function BlogPostCard({post}: BlogPostCardProps) {
  const href = `/blogs/${post.blogHandle}/${post.handle}`;

  return (
    // Renders as a bare <li> — this component assumes its parent is a
    // <ul>/<ol> (as RelatedBlogPosts's grid is), same as before the
    // extraction. position: relative lives on .bpc-card in the
    // stylesheet, which is what lets the title link's ::after overlay
    // (below) stretch to fill this whole element.
    <li className="bpc-card">
      {/* Decorative relative to the card: the title link below already
          gives the whole card its one accessible name/destination, so
          this image doesn't also need to be a link or carry alt text
          that would be announced a second time. Still gets a real
          empty alt (not omitted) so screen readers skip it cleanly
          rather than falling back to the filename — same reasoning
          applies to the no-image placeholder below. */}
      <div className="bpc-image-wrap">
        {post.image ? (
          <Image
            data={post.image}
            alt=""
            // Two responsive breakpoints: roughly a third of a
            // ~960px content area on desktop, full-bleed on mobile.
            // Callers rendering this at a different grid width (e.g.
            // a 2-up listing page) may want a different `sizes` — if
            // that need comes up, promote this to a `sizes` prop with
            // this string as its default rather than hardcoding a
            // second value here.
            sizes="(min-width: 760px) 320px, 90vw"
            aspectRatio="1/1"
            crop="center"
            loading="lazy"
            className="bpc-image"
          />
        ) : (
          // Posts without an image still need a stable card height, so
          // a quiet placeholder tile fills the same slot the <Image>
          // would occupy — a simple icon, not an error-style graphic,
          // since a missing photo isn't a failure state. aria-hidden
          // since it's decorative (same reasoning as the real image's
          // empty alt above).
          <div className="bpc-image bpc-image--placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3.5" y="5" width="17" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="8.5" cy="9.5" r="1.25" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M4.5 16.5l4.4-4.2a1.3 1.3 0 0 1 1.75 0L15 16m0 0 2-2a1.3 1.3 0 0 1 1.75 0l1.75 1.7"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      <time className="bpc-date" dateTime={post.publishedAt}>
        {/* dateTime keeps the full ISO string for accessibility/SEO;
            the visible text is the shortened "10.10.24" format. */}
        {formatShortDate(post.publishedAt)}
      </time>

      <h3 className="bpc-title">
        {/* The only real link on the card. Its ::after (see
            BlogPostCard.css .bpc-title a) is positioned to cover
            the full <li>, so clicking anywhere on the image or
            whitespace still navigates — without adding two more
            anchors pointing at the same href. */}
        <Link to={href}>{post.title}</Link>
      </h3>
    </li>
  );
}

/** Formats a date as "10.10.24" — matches the reference design. */
function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  // Zero-padded day/month, 2-digit year — deliberately locale-independent
  // (not toLocaleDateString) so the format is identical for every visitor
  // regardless of browser/OS locale settings.
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}