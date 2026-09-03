# Newsletter Form — `NewsletterForm.tsx`

An inline newsletter signup form for blog articles: email input + submit
button, with inline pending/success/error state once hydrated, and a
fully-functional static fallback (real `<form method="post">`) before that.

Files:
- `app/components/blogs/NewsletterForm.tsx` — `injectNewsletterForm()` (the
  loader-side transform) and `<NewsletterForm>` (the interactive component,
  portaled in client-side).
- `app/assets/newsletter-form.css` — loaded **globally** in `root.tsx`, not
  route-scoped — see "Why global" below.
- `app/templates/api.newsletter-subscribe.tsx` — the POST endpoint both the
  static form and the hydrated fetcher submit to.

## Architecture: static render → client hydrate (portal)

Same shape as `ProductGallery`/`Video`/`ImagesGallery`: `injectNewsletterForm`
rewrites the editor's marker into a real, working `<form>` server-side
(progressive enhancement — it submits via a normal POST and works even
before hydration or with JS disabled), wrapped in a `data-newsletter-slot`
node. Client-side, the article template's DOM-scanning effect finds that
slot, clears the static form, and portals in the live `<NewsletterForm>`
component — which uses `useFetcher()` to submit without a full page
navigation and show inline pending/success/error state.

**Why this one needs a portal and Quote/Summary/RecipeHeader don't:**
`useFetcher()` needs Router context, which only exists inside this route's
component tree. A disconnected `createRoot(el).render(...)` mount has no
access to that context and the hook throws immediately — so, like
`ProductGallery`, this has to be `createPortal`'d into the tree rendered
here rather than mounted separately.

## Why the stylesheet is global, not route-scoped

Every other blog-content-block stylesheet (`quote.css`, `video.css`,
`gallery.css`, etc.) is imported `?url` and pushed into this route's own
`links()` array, because those markers only ever appear inside a blog
article body. `newsletter-form.css` is the one exception: the
`data-newsletter-form` marker is general-purpose and reusable **outside**
blog articles too (e.g. a footer signup, a landing page), so it's registered
once in `root.tsx`'s global `<link>` list instead of requiring every route
that might use the marker to remember to wire in its own `links()` entry.

## Wiring into the route

**1. Import in `blogs.$blogHandle.$articleHandle.tsx`:**

```tsx
import {NewsletterForm, injectNewsletterForm} from '~/components/blogs/NewsletterForm';
```

No stylesheet import here — it's already global via `root.tsx`.

**2. Run the transform in `loadCriticalData`**, alongside the other
no-fetch-needed passes:

```tsx
contentHtml = injectFaqSections(contentHtml);
contentHtml = injectNewsletterForm(contentHtml);
```

**3. Extend the article template's DOM-scanning effect** to also find
`[data-newsletter-slot]` nodes, read their heading/subheading back off
data attributes, clear the static form, and record them for portaling:

```tsx
const [newsletterSlots, setNewsletterSlots] = useState<NewsletterSlot[]>([]);

// ...inside the existing scanning effect...
const foundNewsletters: NewsletterSlot[] = [];
container.querySelectorAll<HTMLElement>('[data-newsletter-slot]').forEach((el) => {
  const heading = el.getAttribute('data-newsletter-heading') ?? 'Join the newsletter';
  const subheading = el.getAttribute('data-newsletter-subheading') ?? '';
  el.innerHTML = ''; // clear the static form — portal renders the live replacement
  foundNewsletters.push({el, heading, subheading});
});
setNewsletterSlots(foundNewsletters);
```

**4. Portal the live component in**, keyed by position (an article can
repeat the same heading/subheading in more than one placement, so there's
no natural unique id to key on):

```tsx
{newsletterSlots.map(({el, heading, subheading}, i) =>
  createPortal(
    <NewsletterForm data={{heading, subheading}} />,
    el,
    `newsletter-${i}`,
  ),
)}
```

## Editor marker syntax

```html
<div data-newsletter-form></div>
```

Plain signup form, default heading/copy (`"Join the newsletter"` /
`"New rides, gear guides, and deals. No spam, unsubscribe anytime."`).

Optional per-placement copy override:

```html
<div
  data-newsletter-form
  data-newsletter-heading="Get weekly ride tips"
  data-newsletter-subheading="One email a week. No spam, unsubscribe anytime."
></div>
```

Both attributes are optional and independent — set one, both, or neither.

## Static fallback markup

What `injectNewsletterForm` actually renders server-side (real, working
HTML, not a placeholder):

```html
<div data-newsletter-slot data-newsletter-heading="..." data-newsletter-subheading="...">
  <form class="newsletter-form" action="/api/newsletter-subscribe" method="post">
    <h3 class="newsletter-form__heading">...</h3>
    <p class="newsletter-form__subheading">...</p>
    <div class="newsletter-form__row">
      <label for="newsletter-email-static">Email address</label>
      <input id="newsletter-email-static" type="email" name="email" required />
      <button type="submit">Subscribe</button>
    </div>
  </form>
</div>
```

This works with zero JS — a real POST to `/api/newsletter-subscribe` — right
up until the hydration effect swaps it for the live fetcher-backed version.

## Props (`<NewsletterForm>`)

| Prop | Type | Notes |
|---|---|---|
| `data` | `{heading: string; subheading: string}` | Required. Read from the slot's data attributes by the article template, or passed directly if used outside the marker pipeline. |

## Backend: `/api/newsletter-subscribe`

Records marketing consent via a Storefront API `customerCreate` mutation —
deliberately built on the **Storefront API**, not the Admin API, so no
admin token is required. The one real limitation that comes with that
choice: Storefront API `customerCreate` behavior around existing customers
and consent-only (no full account) signups is more limited than what the
Admin API's customer mutations offer — see that route file's own header
comment for the specifics before changing this behavior.

## Anti-spam: honeypot field

The hydrated form includes a honeypot input:

```tsx
<input
  className="newsletter-form__hp"
  type="text"
  name="company"
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
/>
```

Hidden **off-screen via CSS** (`newsletter-form.css`), not `type="hidden"` —
some bots specifically skip `type="hidden"` inputs but still blindly fill
in visible-but-off-screen ones, so the CSS-hiding approach catches more
automated submissions. The subscribe route silently treats any submission
with this field filled in as a fake success (no error shown to the bot, no
real subscribe performed).

## Client-side UX details

- `fetcher.state !== 'idle'` drives a `"Subscribing…"` disabled state on the
  submit button.
- On success, the form is `.reset()` via a `useEffect` keyed on the success
  flag, so the just-submitted address doesn't linger visible in the input.
- On success, the form area is replaced with a `role="status"` confirmation
  message rather than staying as an empty form.
- On error, `result.error` is rendered in a `role="alert"` paragraph below
  the form.

## Notes / limits

- Because the static and hydrated versions render visually identical markup
  (same classes), there's no layout shift when the portal swap happens.
- The static `<input id="newsletter-email-static">` and the hydrated
  version's `useId()`-generated id are deliberately different — avoids any
  risk of a duplicate-id collision if the swap is ever slow enough for both
  to briefly coexist in the DOM.
- If an article has more than one `data-newsletter-form` marker, each gets
  its own independent fetcher/state — submitting one doesn't affect the
  others.

## Testing

- No JS → static form submits via real POST, subscribes successfully
- With JS → static form swapped for hydrated version on mount
- Submit with valid email → pending state → success message, input cleared
- Submit with invalid/empty email → native browser validation blocks it
  (the input has `required` + `type="email"`)
- Submit with honeypot field filled (simulated) → fake success, no real
  subscribe
- Two newsletter markers in one article, different heading/subheading →
  both render correctly and independently
- Custom `data-newsletter-heading`/`-subheading` → override the defaults
