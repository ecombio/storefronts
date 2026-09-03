// app/components/blogs/AuthorSection.tsx
//
// Optional "About the author" card shown at the bottom of a blog
// article. Off by default: an editor must both flip the
// show_author_section metafield to true AND assign an author_profile
// metaobject reference (with a bio filled in) for it to render at all
// — a bare toggle with no profile would just show an empty card,
// which is worse than not showing a card at all.
//
// Author identity (name/bio/avatar) lives in a reusable "Author"
// metaobject, not as loose fields on the article itself — see
// README.md for the metaobject definition. article.author (the
// built-in blog author field) is intentionally NOT used here: once an
// author has a full profile, the profile's own name field is the
// single source of truth, so editing it in one place updates every
// article that references it.

export type AuthorAvatar = {
  url: string;
  altText: string | null;
};

export type AuthorSectionData = {
  name: string;
  bio: string;
  avatar: AuthorAvatar | null;
};

// Shape of the raw metafield data as read off the article object in
// the loader (see the ARTICLE_QUERY additions in README.md). Kept
// loose/optional throughout — metafields and metaobject references
// are optional by nature, so any of these can be null/undefined if
// unset in the admin.
type ArticleWithAuthorMetafields = {
  authorProfile?: {
    reference?: {
      name?: {value?: string | null} | null;
      bio?: {value?: string | null} | null;
      avatar?: {
        reference?: {
          image?: {url?: string | null; altText?: string | null} | null;
        } | null;
      } | null;
    } | null;
  } | null;
  showAuthorSection?: {value?: string | null} | null;
};

/**
 * Resolves the raw author_profile metaobject reference into the data
 * AuthorSection needs to render, or null if the section shouldn't
 * show at all.
 *
 * Gating is intentionally strict and layered:
 *   1. show_author_section must be explicitly "true".
 *   2. author_profile must actually reference a metaobject entry.
 *   3. That entry must have a non-empty bio.
 *   4. That entry must have a non-empty name.
 * If any of those is missing, this returns null and the caller
 * renders nothing — no empty card, no "Author: undefined", no broken
 * circle where an avatar should be. The avatar is the one fully
 * optional field: if it's not set on the metaobject entry,
 * AuthorSection falls back to an initial instead of gating the whole
 * section on it.
 */
export function getAuthorSectionData(
  article: ArticleWithAuthorMetafields,
): AuthorSectionData | null {
  const isEnabled = article.showAuthorSection?.value === 'true';
  if (!isEnabled) return null;

  const profile = article.authorProfile?.reference;
  if (!profile) return null;

  const bio = profile.bio?.value?.trim();
  if (!bio) return null;

  const name = profile.name?.value?.trim();
  if (!name) return null;

  const image = profile.avatar?.reference?.image;
  const avatar = image?.url
    ? {url: image.url, altText: image.altText ?? null}
    : null;

  return {name, bio, avatar};
}

export function AuthorSection({data}: {data: AuthorSectionData}) {
  const {name, bio, avatar} = data;

  // Bio may contain line breaks (multi-line text metafield) — render
  // each as its own paragraph rather than collapsing into one dense
  // block, matching the reference design's two-line bio layout.
  const bioParagraphs = bio.split(/\n+/).filter(Boolean);

  return (
    <section className="author-section" aria-label="About the author">
      <h2 className="author-section__heading">The Author : {name}</h2>
      <div className="author-section__body">
        <div className="author-section__avatar">
          {avatar ? (
            <img
              src={avatar.url}
              alt={avatar.altText ?? name}
              width={72}
              height={72}
              loading="lazy"
            />
          ) : (
            // No avatar image set on the metaobject entry — fall back
            // to the author's initial rather than leaving a broken/
            // empty circle.
            <span
              className="author-section__avatar-fallback"
              aria-hidden="true"
            >
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="author-section__bio">
          {bioParagraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}