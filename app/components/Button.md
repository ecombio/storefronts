# Blog CTA Button (`button.tsx`)

Two ways to render a CTA button, sharing one stylesheet
(`~/assets/blog-button.css`) so a button looks identical whether it's
placed by a developer in JSX or authored by an editor in the Shopify
blog editor's HTML source view.

| | `<BlogButton>` | `injectBlogButtons(html)` |
|---|---|---|
| Used by | Developers, directly in route/component JSX | Content editors, via a marker typed into the blog editor's **Show HTML** view |
| Output | React component | Static HTML string transform |
| Client JS required | No (works as a plain `<a>`/`<button>`) | No |
| Router context required | Yes (safe — always rendered inside the route tree) | No — output is plain `<a>`, never `<Link>` |

---

## 1. Editor marker syntax (`injectBlogButtons`)

Paste this into the article's **Show HTML** source view:

```html
<div data-cta="primary" data-cta-href="/collections/new-arrivals" data-cta-id="blog-summer-guide-shop">Shop new arrivals</div>
```

### Attributes

| Attribute | Required | Values | Notes |
|---|---|---|---|
| `data-cta` | **Yes** | `primary` \| `secondary` \| `outline` \| `ghost` \| `link` | Visual style |
| `data-cta-href` | **Yes** | any relative or absolute URL | Destination |
| `data-cta-id` | Recommended | any string | Drives click tracking — see [Tracking](#tracking) |
| `data-cta-size` | No | `sm` \| `md` (default) \| `lg` | Button size |
| inner content | **Yes** | plain text, or text wrapped in inline tags | Becomes the button label |

### Label content

- Nested inline tags (`<span>`, `<strong>`, etc.) are stripped to plain
  text automatically — the recommended way to style label text.
- A nested `<div>` inside the label is also handled correctly: the
  parser does a **depth-aware scan** for the marker's true closing
  `</div>`, rather than a naive match that stops at the first `</div>`
  it sees. Earlier versions of this transform would truncate the label
  (and corrupt surrounding HTML) if an editor wrapped label text in a
  nested `<div>` instead of an inline tag — this is fixed.

### Malformed markers

A marker missing `data-cta-href`, or with no visible label text, is
**left untouched** in the output rather than silently dropped. This
means a mistake shows up as a visibly broken raw `<div>` in preview,
so it gets caught — instead of a CTA quietly vanishing from the page.

If a marker's opening tag has no matching closing `</div>` at all
(truncated/malformed HTML), the transform stops processing further
markers and passes the remaining document through unchanged, rather
than guessing.

### Escaping

`data-cta-href`, `data-cta-id`, and the parsed label are all
HTML-escaped before being written into the output `<a>` tag (same
approach as `Quote.tsx`'s marker transform). A stray `"`, `<`, `>`, or
`&` in any editor-supplied value can't break out of its attribute or
corrupt the surrounding markup.

### External vs. internal links

Any `href` matching `http://`, `https://`, `mailto:`, or `tel:` is
treated as external and automatically gets `target="_blank"
rel="noopener noreferrer"`. Internal paths render as plain relative
links with no special handling needed from the editor.

### Output markup

```html
<div class="blog-cta-row">
  <a class="blog-cta blog-cta--primary blog-cta--md" href="/collections/new-arrivals" data-cta-id="blog-summer-guide-shop">
    Shop new arrivals
  </a>
</div>
```

`.blog-cta-row` centers and adds vertical spacing around the button so
an editor doesn't need to add their own layout markup — see
`blog-button.css`. The React `<BlogButton>` component has no
equivalent wrapper; callers control its placement directly in JSX.

---

## 2. React component (`<BlogButton>`)

For CTAs placed directly in route/component JSX (e.g. a fixed
end-of-article CTA, or inside `AuthorSection`).

```tsx
import BlogButton from '~/components/blogs/Button';

<BlogButton href="/collections/sale" variant="primary" size="lg" ctaId="author-cta-shop">
  Shop the sale
</BlogButton>
```

### Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | — | Button label |
| `href` | `string` | — | If omitted (or `disabled`/`loading` is true), renders a real `<button>` instead of a link |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'link'` | `'primary'` | |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | |
| `icon` | `ReactNode` | — | |
| `iconPosition` | `'left' \| 'right'` | `'left'` | While `loading`, a spinner replaces a left icon; a right icon is hidden until loading finishes |
| `fullWidth` | `boolean` | `false` | |
| `newTab` | `boolean` | auto-detected | Overrides the automatic external-link detection |
| `loading` | `boolean` | `false` | Implies disabled; shows a spinner |
| `disabled` | `boolean` | `false` | A disabled CTA never renders as a clickable/focusable link, even if `href` is set |
| `ctaId` | `string` | — | Rendered as `data-cta-id` — see [Tracking](#tracking) |
| `onClick` | `(event) => void` | — | |
| `className` | `string` | — | Merged with the generated class list |

### Rendering logic

- `href` set, not disabled, **external** (`http(s)://`, `mailto:`, `tel:`) → plain `<a target="_blank" rel="noopener noreferrer">`.
- `href` set, not disabled, **internal** → react-router `<Link>` (client-side nav + prefetch). Safe because `<BlogButton>` is only ever rendered directly inside the route tree — never portaled into `dangerouslySetInnerHTML` content the way the newsletter form is — so Router context is always present.
- No `href`, or `disabled`/`loading` → real `<button type="button">`, with proper `disabled` / `aria-busy` semantics.

`forwardRef` is used so a parent can get a ref to whichever element
actually renders (`<a>`, `<Link>`, or `<button>`).

---

## Tracking

Click tracking rides on the static `data-cta-id` attribute plus a
GTM/GA4 selector rule — **not** a client-side handler. This is
intentional: the injected marker output has no client JS or hydration
step (see "Self-contained styling" below), so there's nothing to
attach a handler to. Always set `data-cta-id` (or the `ctaId` prop) on
CTAs you want to measure, using a clear, unique, kebab-case identifier
(e.g. `blog-summer-guide-shop`, `author-cta-shop`).

---

## Self-contained styling

`button.tsx` imports `~/assets/blog-button.css` directly as a
side-effect import (`import '~/assets/blog-button.css'`), rather than
via the `?url` + `links()` convention the sibling `blog-*` stylesheets
use.

This is because `<BlogButton>` is a real component that can be
rendered from more than one place in the route tree (e.g. directly in
a route's JSX, or inside `AuthorSection`) — a bare import guarantees
the CSS loads wherever the component is used, without every call site
needing to remember to link it.

`injectBlogButtons`, however, is a pure server-side string transform
with **no component** in the React tree — nothing guarantees the
side-effect import fires for markers resolved this way on a given
route. So `blogButtonStyles` (`?url`) is **also** explicitly added to
`blogs.$blogHandle.$articleHandle.tsx`'s `links()` array. This is
redundant with the side-effect import in any case where both fire on
the same route — harmless, since it's the same stylesheet deduped by
the browser.

---

## No hydration, by design

Unlike the newsletter-form and video-embed markers, a CTA marker does
**not** resolve to a `data-*-slot` + `createPortal` pair. A button
needs no Router hooks (`useNavigate`/`useFetcher`) and no client JS to
be useful — a plain `<a href>` works with zero hydration — so it
follows the same "fully static, no slot" precedent as
`TwoColumnContent`. This also means `injectBlogButtons` output is
never scanned or swapped client-side by the article route component.

---

## Pipeline ordering

In `blogs.$blogHandle.$articleHandle.tsx`'s loader, `injectBlogButtons`
runs early — right after shoppable-product injection, and before
`injectQuoteEmbeds`, `injectRecipeHeader`, and `injectTwoColumnContent`.
This matters because a CTA marker's output (`<div
class="blog-cta-row">...</div>`) is a self-contained node; resolving it
first keeps `injectTwoColumnContent`'s div-depth counting accurate if a
button marker is ever nested inside a two-column layout block.