# Newsletter Form

Inline newsletter signup form for blog articles, embedded via a marker
in Shopify's Blog Editor HTML source view. Same authoring pattern as
the shoppable-product, FAQ, CTA, quote, and recipe-header markers used
elsewhere in blog article bodies.

- Component: `app/components/blogs/NewsletterForm.tsx`
- Styles: `app/components/blogs/NewsletterForm.css`
- Route wiring: `app/templates/blogs.$blogHandle.$articleHandle.tsx`
- Submits to: `app/templates/api.newsletter-subscribe.tsx`

## For editors: marker syntax

In the Shopify Blog Editor, switch to HTML source view (the `<>` /
"Show HTML" button) and paste one of the following wherever you want
the signup form to appear in the article body.

**Plain form, default copy:**

```html
<div data-newsletter-form></div>
```

**With custom heading and/or subheading:**

```html
<div
  data-newsletter-form
  data-newsletter-heading="Get weekly ride tips"
  data-newsletter-subheading="One email a week. No spam, unsubscribe anytime."
></div>
```

### Rules

- The `<div>` must be **empty** — nothing between the opening and
  closing tags. If you switch back to the visual editor and then
  return to HTML view, check that Shopify hasn't inserted a stray
  `&nbsp;` or whitespace inside the tag, since that can stop the
  marker from being recognized.
- `data-newsletter-heading` and `data-newsletter-subheading` are both
  **optional and independent** — set one, both, or neither.
- Quotes and ampersands inside heading/subheading text are safe to
  type normally; they're escaped automatically when rendered.
- You can place more than one newsletter form in the same article.
  Each is resolved and hydrated independently.

### Defaults

| Attribute | Default value if omitted |
|---|---|
| `data-newsletter-heading` | `Join the newsletter` |
| `data-newsletter-subheading` | `New rides, gear guides, and deals. No spam, unsubscribe anytime.` |

## Data points reference

### 1. Editor-authored (typed into HTML source view)

| Attribute | Required | Purpose |
|---|---|---|
| `data-newsletter-form` | Yes | Marks the `<div>` as a newsletter-form placement. Its presence triggers `injectNewsletterForm`. |
| `data-newsletter-heading` | No | Overrides the form heading. |
| `data-newsletter-subheading` | No | Overrides the form subheading. |

### 2. Server-generated (written by `injectNewsletterForm`, never typed by editors)

| Attribute | Purpose |
|---|---|
| `data-newsletter-slot` | Marks the wrapper `<div>` as the client-side hydration target. The article template's scan effect queries `[data-newsletter-slot]` to find slots to portal into. |
| `data-newsletter-heading` | Re-written on the slot wrapper with the **resolved** value (editor override or default), so the client doesn't re-parse the original marker. |
| `data-newsletter-subheading` | Same idea — resolved subheading value read back by the client scan. |

> Note: `data-newsletter-heading` / `data-newsletter-subheading`
> appear twice in the pipeline — once as the editor's raw input
> (matched via regex in `injectNewsletterForm`), and once as the
> resolved output on the slot wrapper (read by the client scan
> effect). Same names, different stage.

### 3. Form field names (submitted via `formData`, not `data-*`)

| Field name | Purpose |
|---|---|
| `email` | Visitor's email address. Required; validated client-side (`type="email" required"`) and server-side (`EMAIL_REGEX` in `api.newsletter-subscribe.tsx`). |
| `company` | Honeypot. Off-screen and unreachable by keyboard for real visitors (`tabIndex={-1}`, CSS-hidden, not `type="hidden"`, so bots that specifically skip hidden fields still fill it). Any submission with this filled in is silently treated as a fake success. |

## How it works (engineering summary)

1. **Loader (`injectNewsletterForm`)** — pure server-side string
   transform. Scans `contentHtml` for `data-newsletter-form` markers
   and rewrites each into a real, static `<form action="/api/newsletter-subscribe"
   method="post">` — fully functional without JavaScript — wrapped in
   a `data-newsletter-slot` node carrying the resolved heading/
   subheading.
2. **Client scan (article template)** — after mount, a `useEffect`
   finds every `[data-newsletter-slot]` node, reads back its resolved
   heading/subheading (falling back to the imported
   `DEFAULT_HEADING`/`DEFAULT_SUBHEADING` constants as a safety net),
   clears the static markup, and records the slot.
3. **Portal (`<NewsletterForm />`)** — the real, interactive component
   is mounted into each slot via `createPortal` (not `createRoot`),
   so it inherits the app's Router context — required for
   `useFetcher`, which submits without a full page navigation and
   shows inline pending/success/error state.
4. **Resource route (`api.newsletter-subscribe.tsx`)** — validates the
   email, checks the honeypot, and records marketing consent via a
   Storefront API `customerCreate` mutation (`acceptsMarketing: true`).
   No Admin API token or scope required.

### Known limitation

Storefront API's `customerCreate` has no "just record marketing
consent" mode for an anonymous visitor — it always creates a full
customer record (a random, never-surfaced password is generated to
satisfy the required field). If a Shopify customer record **already
exists** for the submitted email, `customerCreate` returns a `TAKEN`
error, which this route treats as a success from the visitor's point
of view (no confusing "email already in use" message on a newsletter
form). However, the Storefront API has no anonymous mutation that can
flip `acceptsMarketing` to `true` on that **existing** record. An
existing, previously-non-subscribed customer who submits this form
will see a success message, but their marketing consent will not
actually be updated.

Closing that gap requires the Admin API's
`customerEmailMarketingConsentUpdate` mutation, called server-side
with a private app token (`write_customers` scope) — infrastructure
this route deliberately doesn't set up. Flag it if closing this gap
matters for list-growth accuracy.
