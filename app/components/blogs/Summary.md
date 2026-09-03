# Summary ("Key Takeaways") Block

A hand-authored "Key takeaways" / summary box that renders at the very
top of a blog article — below the hero image, above the body — no
matter where in the article body the marker itself is placed.

Built for two audiences at once:

1. **Human readers** who want the gist before committing to the full
   article.
2. **Search engines and AI answer engines** (Google AI Overviews,
   featured snippets, LLM-based search) — the box ships with
   structured data (JSON-LD `ItemList`) specifically so these bullets
   can be lifted directly into search results.

There is **no auto-generation** and **no metafield gate**. The
summary only appears when an editor hand-authors the marker below. If
the marker is present and parses to at least one item, it renders. If
it's absent, or has no usable items, nothing renders — and either
way, the raw marker is always stripped out of the article body so it
never leaks as unstyled HTML.

---

## 1. Quick start

Paste this into the article's **Content** field, using the `</>`
code/HTML view in the Shopify blog editor:

```html
<div data-summary-embed data-summary-title="Summary" data-summary-layout="list">
  <ul>
    <li>First key takeaway, one clear sentence.</li>
    <li>Second key takeaway.</li>
    <li>Third key takeaway.</li>
  </ul>
</div>
```

Save the article. The box renders automatically at the top — no metafield, no toggle, nothing else to configure.

---

## 2. Marker syntax reference

| Attribute               | Required? | Values                                    | Default  |
|--------------------------|-----------|--------------------------------------------|----------|
| `data-summary-embed`     | **Yes**   | (presence-only, no value needed)            | —        |
| `data-summary-title`     | No        | any string                                  | no heading rendered |
| `data-summary-layout`    | No        | `list` \| `numbered` \| `grid` \| `highlight` | `list`   |

**Content inside the marker:**

- Use `<li>` items (wrapped in `<ul>` or `<ol>` — the wrapper itself
  doesn't matter, only the `<li>` tags are read).
- If there are no `<li>` tags, `<p>` tags are used instead (useful for
  the `highlight` layout, which reads best as prose — see below).
- If neither is found, the marker is dropped entirely and nothing
  renders.

**Rules editors should know:**

- Only the **first** marker in an article is used. A second
  `data-summary-embed` block anywhere else in the same article is
  silently ignored (a summary box is a single top-of-article element,
  not a repeatable block like FAQ or CTA buttons).
- The marker can be placed **anywhere** in the body — top, middle,
  bottom. It's always extracted and moved to the top of the page
  regardless.
- Item text is plain text only. Any HTML tags inside an `<li>`/`<p>`
  are stripped — bold, links, etc. won't survive.

---

## 3. Layouts

### `list` (default)
```html
<div data-summary-embed data-summary-layout="list">
  <ul>
    <li>Takeaway one.</li>
    <li>Takeaway two.</li>
  </ul>
</div>
```
Standard bulleted list. Best default for most articles.

### `numbered`
```html
<div data-summary-embed data-summary-layout="numbered">
  <li>First step.</li>
  <li>Second step.</li>
</div>
```
Circular numbered badges instead of bullets. Best for sequential
content — steps, rankings, ordered processes.

### `grid`
```html
<div data-summary-embed data-summary-layout="grid">
  <li>30 min prep</li>
  <li>Serves 4</li>
  <li>Beginner friendly</li>
</div>
```
Short standalone chips in a wrapping grid. Best for terse
at-a-glance facts, not full sentences — keep each item to a few
words.

### `highlight`
```html
<div data-summary-embed data-summary-layout="highlight">
  <p>The single biggest factor in long-term success is designing an environment that makes the right choice the easy choice.</p>
</div>
```
One pull-quote-style statement instead of a list. Use `<p>` (not
`<li>`) here — if multiple `<p>` tags are given, they're joined into
one paragraph with spaces. Best for a single core insight rather than
several bullets.

---

## 4. SEO / AI-answer-engine best practices

The summary box is one of the few places on the page explicitly
optimized to be lifted verbatim into search snippets and AI
Overviews. Follow these to get the most benefit:

- **Keep it short.** Aim for **3–5 bullets, under ~100 words total**.
  Longer lists dilute the "TL;DR" effect and are less likely to be
  pulled into a snippet whole.
- **One idea per bullet.** Each `<li>` should stand alone as a
  complete thought — avoid bullets that depend on the previous one to
  make sense.
- **Write it last.** Draft the summary after finishing the article so
  it accurately reflects the actual content, not the outline you
  started with.
- **Place it high.** This is already enforced by the code — the box
  always renders directly below the hero image regardless of where
  the marker sits in the source — but keep the same instinct when
  drafting: this content should work as a true opener, not a
  mid-article recap.
- **Use your primary keyword once, naturally**, if it fits — don't
  force it.
- **Prefer `list` or `numbered` over `grid` for snippet purposes.**
  `grid`'s short chip-style items are great for at-a-glance scanning
  but read poorly as pulled search-snippet text. If SEO is the
  priority for a given article, use `list`.

### What ships automatically (no editor action needed)

- The box is rendered inside a semantic `<section aria-label="Key
  takeaways">`, not a generic `<div>` — this is a deliberate
  accessibility and crawler-clarity choice.
- An `ItemList` JSON-LD block is emitted alongside the visible box,
  built from the same items:
```json
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Summary",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "..."},
      {"@type": "ListItem", "position": 2, "name": "..."}
    ]
  }
```
  `ItemList` (not `FAQPage`) is used deliberately — these are plain
  takeaway bullets, not question/answer pairs, and `FAQPage` markup
  requires actual Q&A structure to be valid.

---

## 5. Common mistakes

| Mistake | What happens |
|---|---|
| Forgetting `data-summary-embed` | Marker is treated as ordinary body content — renders inline wherever it was pasted, no box styling, no JSON-LD. |
| Using an invalid `data-summary-layout` value (typo, etc.) | Silently falls back to `list` — no error, but check the rendered output if a different layout was intended. |
| Pasting the marker twice in one article | Only the first is used; the second is dropped entirely. |
| Wrapping items in something other than `<li>`/`<p>` (e.g. plain text with `<br>`) | No items are extracted — the whole marker is dropped, nothing renders. |
| Writing 8–10+ bullets | Still renders fine, but undercuts the SEO/snippet value — trim to 3–5. |
| Putting rich formatting (bold, links) inside an item | Stripped on render — items are plain text only. |

---

## 6. For developers

- Implementation: `~/components/blogs/Summary.tsx`
  - `extractSummarySection(contentHtml)` — finds and removes the
    marker from the article body, returns parsed `SummaryData | null`.
    Always call this and always use its returned `.html`, even if you
    don't end up rendering the summary — this is what guarantees the
    marker never leaks into the page unstyled.
  - `renderSummary(summary)` — turns `SummaryData` into the final
    `<section>...</section><script type="application/ld+json">...`
    markup string.
- Styling: `~/assets/summary.css`, route-scoped (linked explicitly in the article route's `links()`, not a global stylesheet).
- No metafield, no gating function — presence of a valid marker is
  the only signal. (This used to be gated by a `custom.show_summary`
  boolean metafield; that was removed since content here is always
  hand-authored, never auto-generated, so the extra toggle was
  redundant.)
- Rendering happens once in the article route's loader
  (`loadCriticalData`) and is passed to the component as a
  pre-rendered `summaryHtml` string, injected via
  `dangerouslySetInnerHTML` — it is fully static, no client-side
  hydration or interactivity.