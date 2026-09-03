# Newsletter Forms — Editor Guide

Inline newsletter signup forms can be embedded anywhere inside a blog article's HTML source. They're rendered by the `data-newsletter-form` marker, processed automatically when the article loads — no developer involvement needed once you've placed the marker.

---

## Where this lives (for reference)

| Piece | File |
|---|---|
| Marker → static form transform | `app/components/blogs/NewsletterForm.tsx` (`injectNewsletterForm`) |
| Live interactive form | `app/components/blogs/NewsletterForm.tsx` (`<NewsletterForm />`) |
| Styling | `app/assets/newsletter-form.css` (loaded globally via `root.tsx`) |
| Wired into | `app/templates/blogs.$blogHandle.$articleHandle.tsx` |
| Submits to | `POST /api/newsletter-subscribe` |

This doc is for **content editors** working in Shopify's blog HTML source view — not developers.

> **Dev note:** `DEFAULT_HEADING` and `DEFAULT_SUBHEADING` are exported from `NewsletterForm.tsx` and imported into `blogs.$blogHandle.$articleHandle.tsx`'s client-side scan effect, rather than being retyped as literals there. This keeps the server-rendered default and the client-hydrated fallback from ever silently drifting apart. If you ever change the default copy, only `NewsletterForm.tsx` needs editing.

---

## How to add a newsletter form

In Shopify admin: **Online Store → Blog posts → [your article] → edit content → "Show HTML"** (the `<>` icon in the content editor toolbar).

Drop one of the following directly into the HTML source, wherever you want the form to appear.

### Plain form (default copy)

```html
<div data-newsletter-form></div>
```

Renders with the built-in default heading and subheading:
- Heading: **"Join the newsletter"**
- Subheading: **"New rides, gear guides, and deals. No spam, unsubscribe anytime."**

### Custom heading and/or subheading

```html
<div
  data-newsletter-form
  data-newsletter-heading="Get e-bike buying tips in your inbox"
  data-newsletter-subheading="Weekly guides on motors, range, and new arrivals. No spam, unsubscribe anytime."
></div>
```

Both attributes are **optional and independent** — set one, both, or neither:

```html
<!-- Custom heading only, default subheading -->
<div data-newsletter-form data-newsletter-heading="Don't miss a ride"></div>

<!-- Custom subheading only, default heading -->
<div data-newsletter-form data-newsletter-subheading="One email a week, that's it."></div>
```

---

## Real example (live in production)

From the "Top Electric Bikes for Every Rider" article — placed right after the product picks wrap up, before the price-comparison section:

```html
<div
  data-newsletter-form
  data-newsletter-heading="Get e-bike buying tips in your inbox"
  data-newsletter-subheading="Weekly guides on motors, range, and new arrivals. No spam, unsubscribe anytime."
></div>
```

That same article also uses the plain/default marker at the very end, after the FAQ:

```html
<div data-newsletter-form></div>
```

Two forms, two different jobs — the mid-article one is tailored to what the reader just read, the end one just catches anyone who made it to the bottom.

---

## Placement

There's no fixed position — place it wherever it reads naturally in the article. Common patterns already in use:

- **Mid-article**, right after a product recommendation section, with copy tailored to what the reader just read
- **End of article**, after the FAQ, with the plain/default marker

You can use the marker **more than once** in the same article (e.g. once mid-article with custom copy, once at the end with defaults).

---

## Rules to get right

1. **Keep the div empty.** The marker only works as `<div data-newsletter-form ...></div>` with *nothing* between the opening and closing tag — not even a space of visible content. If Shopify's rich-text editor injects a stray `&nbsp;` or text node when you save, the marker won't be recognized and will show up as a blank empty div on the live page instead of a form.
   → **Always re-open "Show HTML" after saving to confirm the marker is still empty.**

2. **Use straight double quotes (`"`) around attribute values.** Pasting from Word or Google Docs can silently convert these to curly/smart quotes, which breaks attribute parsing. Type directly into the HTML source view.

3. **No product IDs needed.** Unlike shoppable product markers (`data-solo`, `data-duo`, `data-trio`, `data-shoppable-product`), this marker takes no ID — just optional text copy. There's nothing to "get wrong" data-wise, only typos in your heading/subheading text.

4. **Works with JS disabled or slow to load.** The form is server-rendered as a real, working `<form>` first, then swapped for the interactive version once the page hydrates. Readers on slow connections still get a fully functional signup form immediately — nothing to worry about there.

---

## Troubleshooting

**"I pasted my HTML but the Save button won't activate."**
- Make sure you've clicked *out* of the "Show HTML" modal back into the normal editor view — pasting into the HTML source alone doesn't always trigger the page-level Save button. The modal needs to apply/close first.
- Confirm you pasted into the main **body** content field, not a separate excerpt or summary field some themes have.
- If you'd already pasted the exact same content earlier in the session, Shopify may correctly detect no changes and leave Save inactive — that's expected, not a bug.

**"The form isn't showing up on the live page — just a blank space."**
- Re-open "Show HTML" and check the marker div is still completely empty. Shopify's rich-text editor can silently inject a stray `&nbsp;` or line break inside the div when you save from the visual view, which breaks the marker match.
- Check your quotes weren't converted to curly/smart quotes (common when pasting from Word or Google Docs).

**"I don't see the form rendered while editing in Shopify."**
- That's expected — Shopify's admin editor doesn't run your storefront's React code, so the marker just looks like an empty block (or nothing at all) while editing. It only renders as a real form on the actual live storefront page.

---

## Quick copy-paste templates

**Default:**
```html
<div data-newsletter-form></div>
```

**Custom heading + subheading:**
```html
<div
  data-newsletter-form
  data-newsletter-heading="YOUR HEADING HERE"
  data-newsletter-subheading="YOUR SUBHEADING HERE"
></div>
```