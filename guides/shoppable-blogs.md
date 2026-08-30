# Shoppable Blog Articles — Practical Guide

A working manual for adding inline shoppable products to blog articles in
Shopify admin. No code changes required for day-to-day use — this is an
admin-console workflow, not a developer task.

---

## What this is

Any article body can include inline product cards — image, title, and
live price — that resolve automatically against real Shopify product data
every time the page loads. You write a short marker in the HTML editor;
the site fills in the rest.

```html
<div data-shoppable-product="9448490696918"></div>
```

No manual pricing, no copy-pasting product images, nothing to keep in
sync by hand. If the price changes or the product photo updates, the
article reflects it automatically on the next page load.

---

## Adding a product to an article

**1. Find the numeric product ID.**
In Shopify admin, open the product — the ID is in the URL:
```
admin/products/9448490696918
                └────┬───────┘
                 this number
```

**2. Open the article's Content (HTML view)** in Shopify admin.

**3. Drop a marker wherever you want the product card to appear:**
```html
<div data-shoppable-product="9448490696918"></div>
```

**4. Save/publish.** That's it — no rebuild, no deploy.

You can add as many markers as you want, anywhere in the article. The
same product can appear more than once. Products are batched into a
single request regardless of how many markers are on the page, so there's
no performance cost to adding more.

---

## Marker syntax — get this exact

The marker is matched by a strict pattern. If it doesn't match exactly,
it silently fails — no error, the div just renders empty and nothing
shows up.

**Must be:**
- An empty, self-closing-style `<div>` — no text or nested elements inside
- Exactly the attribute name `data-shoppable-product`
- The value must be digits only (the numeric product ID, not the full GID)

✅ Correct:
```html
<div data-shoppable-product="9448490696918"></div>
```

❌ Will NOT work:
```html
<div data-shoppable-product="9448490696918">Level 4 REC</div>   <!-- has content -->
<div data-shoppable-product="gid://shopify/Product/9448490696918"></div>  <!-- full GID, not just the number -->
<div data-shoppable-product ="9448490696918"></div>   <!-- extra space breaks it, be careful copy-pasting -->
```

**If you're not sure it worked:** preview/publish and check the live page.
A missing card with no visible error usually means either a bad ID (see
below) or a malformed marker.

---

## What happens if a product ID is wrong or the product is gone

If the ID doesn't resolve to a real, available product — deleted,
unpublished, typo'd — the marker is dropped silently. No broken image,
no dead link, no error on the page. The rest of the article renders
normally around it.

This is good for safety (nothing ever looks broken to a customer) but bad
for catching mistakes — always spot-check a new article after publishing
if you're not 100% sure of an ID.

---

## FAQ / accordion blocks

Deep-linkable FAQ items use a `<details>` block with a unique `id`:

```html
<h2>FAQ</h2>
<details id="faq-range">
  <summary>What's the real-world range on these bikes?</summary>
  <p>Answer text goes here.</p>
</details>
```

- The `id` should be unique per article and descriptive (`faq-range`,
  `faq-warranty`, etc.) — it's what a `#faq-range` link in the article
  text (or an external link) jumps to and auto-opens.
- Auto-open on deep-link is handled by the site's code, not CSS — so this
  works correctly regardless of styling.
- ⚠️ **Known gap:** if the article's FAQ styling looks like a plain
  browser disclosure triangle instead of the site's custom accordion
  look, that's a known CSS mismatch between the article template and
  this content pattern — not something you did wrong. Flag it to
  engineering rather than trying to work around it in the HTML.

To link to an FAQ item from earlier in the article body:
```html
<a href="#faq-range">how far will these go on a charge?</a>
```

---

## Layout variants

Two independent settings control how an article looks. They combine —
setting one doesn't remove the other.

| Setting | Where | Values | Effect |
|---|---|---|---|
| Blog | Which blog the article lives in | `category` vs. anything else | `category` = "hub" wide layout, everything else = standard "spoke" layout |
| `custom.layout_variant` metafield | Per-article metafield override | e.g. `feature` | Layers an extra visual treatment on top of hub/spoke, for one-off standout articles |

You only need to touch the metafield if a specific article needs to look
different from the rest of its blog (e.g. a big feature piece sitting in
an otherwise plain blog).

---

## Testing before you publish

**Quick visual check (no dev help needed):** publish as a draft or
unlisted first, open the preview link, and confirm:
- Every product card shows the correct image, title, and price
- No products for the same article show duplicate cards unless intended
- FAQ items expand/collapse correctly
- Any `#anchor` links jump to and open the right FAQ item

**If something's broken:**
| Symptom | Likely cause |
|---|---|
| Product card missing entirely | Bad/deleted product ID, or malformed marker (see syntax section) |
| Product card shows wrong product | Wrong numeric ID — double check against the admin product URL |
| FAQ won't expand from a link | Mismatched `id` between the `<details id="...">` and the `#anchor` link |
| Whole article looks unstyled/broken | Content pasted outside the HTML view (rich text editor may have escaped the tags) — re-paste using "Show HTML" / code view |

---

## Reference: this guide in one paragraph

Write the article, paste it into the admin HTML view, drop a
`<div data-shoppable-product="ID"></div>` wherever a product should
appear, get the ID from the product's admin URL, and publish. Nothing
else needs to change. Bad IDs fail silently rather than breaking the
page, so always preview before publishing something you're unsure about.
