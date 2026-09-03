// app/components/blogs/NewsletterForm.tsx
//
// Inline newsletter signup form for blog articles, following the same
// marker-based injection pattern as ProductGallery.tsx (shoppable
// embeds) and FaqSection.tsx (FAQ accordions):
//
//   1. `injectNewsletterForm(html)` — a pure, server-side string
//      transform run in the loader. Scans contentHtml for
//      `<div data-newsletter-form>` markers and rewrites each into a
//      static, no-JS-required <form> (progressive enhancement: it
//      works even before hydration) plus a `data-newsletter-slot`
//      attribute the client-side scan looks for — same shape as
//      `data-shoppable-slot` in the article template.
//
//   2. `<NewsletterForm />` — the real, interactive component. Uses
//      useFetcher (Remix/React Router) to submit without a full page
//      navigation and show inline pending/success/error state.
//      Mounted via createPortal in the article template, not
//      createRoot — useFetcher needs the app's Router context, same
//      reasoning documented for the shoppable-slot portal.
//
// Editor-facing marker syntax (written directly in Shopify's blog
// HTML source view, same spirit as data-shoppable-product / data-faq):
//
//   <div data-newsletter-form></div>
//     Plain signup form, default heading/copy.
//
//   <div
//     data-newsletter-form
//     data-newsletter-heading="Get weekly ride tips"
//     data-newsletter-subheading="One email a week. No spam, unsubscribe anytime."
//   ></div>
//     Optional per-placement copy override. Both attributes are
//     optional and independent — set one, both, or neither.
//
// Submits to POST /api/newsletter-subscribe (see
// app/templates/api.newsletter-subscribe.tsx), which records
// marketing consent via a Storefront API customerCreate mutation —
// see that file's header comment for the one real limitation that
// comes with staying on the Storefront API (no admin token required)
// instead of the Admin API.

import {useEffect, useId, useRef} from 'react';
import {useFetcher} from 'react-router';

export type NewsletterFormData = {
  heading: string;
  subheading: string;
};

const DEFAULT_HEADING = 'Join the newsletter';
const DEFAULT_SUBHEADING =
  'New rides, gear guides, and deals. No spam, unsubscribe anytime.';

const MARKER_REGEX = /<div([^>]*\bdata-newsletter-form\b[^>]*)>\s*<\/div>/g;
const HEADING_ATTR_REGEX = /\bdata-newsletter-heading=["']([^"']*)["']/;
const SUBHEADING_ATTR_REGEX = /\bdata-newsletter-subheading=["']([^"']*)["']/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Scans article HTML for `data-newsletter-form` markers and rewrites
 * each into a static, server-rendered <form> — real markup that works
 * with zero JS (submits via a normal POST) — wrapped in a
 * `data-newsletter-slot` node carrying the resolved heading/
 * subheading as data attributes, so the client-side scan in the
 * article template can read them without re-parsing the original
 * HTML. Mirrors `data-shoppable-slot` from ProductGallery.tsx.
 */
export function injectNewsletterForm(html: string): string {
  return html.replace(MARKER_REGEX, (full, attrs: string) => {
    const heading = attrs.match(HEADING_ATTR_REGEX)?.[1] ?? DEFAULT_HEADING;
    const subheading =
      attrs.match(SUBHEADING_ATTR_REGEX)?.[1] ?? DEFAULT_SUBHEADING;

    const headingAttr = escapeHtml(heading);
    const subheadingAttr = escapeHtml(subheading);

    // Static fallback: a real <form action method> that works before
    // hydration or with JS disabled entirely. Cleared and replaced by
    // the interactive component the same way shoppable slots are, but
    // unlike those, this one degrades to a fully working native form
    // rather than an empty node if JS never loads.
    return (
      `<div data-newsletter-slot data-newsletter-heading="${headingAttr}" data-newsletter-subheading="${subheadingAttr}">` +
      `<form class="newsletter-form" action="/api/newsletter-subscribe" method="post">` +
      `<h3 class="newsletter-form__heading">${headingAttr}</h3>` +
      `<p class="newsletter-form__subheading">${subheadingAttr}</p>` +
      `<div class="newsletter-form__row">` +
      `<label class="newsletter-form__label" for="newsletter-email-static">Email address</label>` +
      `<input class="newsletter-form__input" id="newsletter-email-static" type="email" name="email" placeholder="you@example.com" required />` +
      `<button class="newsletter-form__submit" type="submit">Subscribe</button>` +
      `</div>` +
      `</form>` +
      `</div>`
    );
  });
}

type FetcherData = {ok: true} | {ok: false; error: string};

/**
 * Interactive replacement for the static form above. Portaled into
 * the `[data-newsletter-slot]` node found by the article template's
 * slot scan (extended alongside the existing shoppable-slot scan —
 * see the template's useEffect).
 */
export function NewsletterForm({data}: {data: NewsletterFormData}) {
  const {heading, subheading} = data;
  const fetcher = useFetcher<FetcherData>();
  const inputId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const isSubmitting = fetcher.state !== 'idle';
  const result = fetcher.data;
  const succeeded = result?.ok === true;

  // Clear the input after a successful subscribe, so the form doesn't
  // sit there with the just-submitted address still visible.
  useEffect(() => {
    if (succeeded) {
      formRef.current?.reset();
    }
  }, [succeeded]);

  return (
    <div className="newsletter-form">
      <h3 className="newsletter-form__heading">{heading}</h3>
      <p className="newsletter-form__subheading">{subheading}</p>

      {succeeded ? (
        <p className="newsletter-form__success" role="status">
          You&rsquo;re subscribed — thanks for joining!
        </p>
      ) : (
        <fetcher.Form
          ref={formRef}
          method="post"
          action="/api/newsletter-subscribe"
          className="newsletter-form__row"
        >
          <label className="newsletter-form__label" htmlFor={inputId}>
            Email address
          </label>
          <input
            className="newsletter-form__input"
            id={inputId}
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
          />
          {/* Honeypot: real visitors never see or fill this (off-
              screen via CSS in newsletter-form.css, not
              type="hidden" — some bots specifically skip
              hidden-type inputs but still fill visible-but-off-
              screen ones). The subscribe route silently treats any
              submission with this filled in as a fake success. */}
          <input
            className="newsletter-form__hp"
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <button
            className="newsletter-form__submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Subscribing…' : 'Subscribe'}
          </button>
        </fetcher.Form>
      )}

      {result?.ok === false && (
        <p className="newsletter-form__error" role="alert">
          {result.error}
        </p>
      )}
    </div>
  );
}