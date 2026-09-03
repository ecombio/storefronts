# FAQ Section — `FaqSection.tsx`

An accordion of frequently-asked-questions for blog articles, using native
`<details>`/`<summary>` (zero JS required for the open/close interaction),
plus optional `FAQPage` JSON-LD structured data for search-result rich
snippets.

Files:
- `app/components/blogs/FaqSection.tsx` — `injectFaqSections()` (the
  loader-side transform), `<FaqSection>` (component, for hardcoding a FAQ
  block directly into a `.tsx` template), and the shared
  `FaqAccordionItem`/structured-data helpers both paths use.
- Styles reuse the existing `.accordion` / `.accordion__item` /
  `.accordion__summary` / `.accordion__icon` / `.accordion__content` classes
  already defined in `article.css` — there is no separate `faq-section.css`.

## Architecture: static, no portal — and why

Unlike the shoppable-embed system, `FaqSection` needs no client-side
hydration at all. `<details>`/`<summary>` is natively interactive with zero
JavaScript, and the component has no hooks that need a React context
provider (no `useNavigate()`, no `useFetcher()`). So `injectFaqSections`
renders straight to final HTML with `renderToStaticMarkup` and nothing
further happens on the client — no slot, no `data-faq-slot` attribute, no
scan in the article template's hydration effect, no `Article.tsx` changes
required beyond the one loader line.

## Why a `<script>` marker instead of `data-*` attributes

Every other marker in this system (`data-quote-embed`, `data-recipe-header`,
`data-summary-embed`, etc.) is an empty `<div>` carrying its content in
`data-*` attribute values. FAQ content doesn't fit that shape well: cramming
a JSON array of `{question, answer}` pairs into a single HTML attribute
means every quote, apostrophe (`"What's the difference..."`), and newline
in the questions/answers has to be hand-escaped by whoever is editing the
article in Shopify's HTML source view.

Instead, the marker is a `<script type="application/json" data-faq>` block:

```html
<script type="application/json" data-faq>
[
  {"question": "What's the difference between a hub-drive and mid-drive motor?", "answer": "A hub-drive motor sits in the wheel; a mid-drive motor sits at the crank and pushes through your gears."},
  {"question": "Do I need a license to ride an e-bike?", "answer": "In most US states, no — Class 1–3 e-bikes are generally treated like regular bicycles. Check your local regulations."}
]
</script>
```

Editors paste ordinary JSON with none of the attribute-escaping problem —
the same reasoning that keeps GraphQL query bodies in this codebase as plain
strings rather than something fussier.

## Why the injected version has no heading

`<FaqSection>` (the component, used for hand-placed JSX blocks) renders a
default `"Frequently Asked Questions"` `<h2>` above the accordion.
`injectFaqSections` (the marker path) **omits that heading entirely** —
articles that already hand-author their own
`<h2>Frequently Asked Questions</h2>` right above the FAQ marker (as this
site's articles already do) would otherwise get a duplicate heading. The
marker only replaces the accordion itself; editors keep authoring their own
heading exactly as before.

## Wiring into the route

**1. Import in `blogs.$blogHandle.$articleHandle.tsx`:**

```tsx
import {injectFaqSections} from '~/components/blogs/FaqSection';
```

No stylesheet import needed — FAQ markup reuses `.accordion*` classes
already shipped in `article.css`.

**2. Run the transform in `loadCriticalData`.** Order isn't load-bearing
relative to the other no-fetch-needed passes (two-col, recipe header,
summary, quote, newsletter, video, gallery) — none of them touch
`data-faq`/`<script type="application/json" data-faq>` markers or vice
versa:

```tsx
contentHtml = injectQuoteEmbeds(contentHtml);
contentHtml = injectFaqSections(contentHtml);
```

No change needed to the article template's `bodyRef` scan effect — like
`TwoColumnContent`/`RecipeHeader`/`Summary`, this never creates a slot for
React to find.

## Editor marker syntax

```html
<script type="application/json" data-faq>
[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]
</script>
```

Each item: `question` (string, required), `answer` (string or, when using
`<FaqSection>` directly in JSX, `ReactNode` — the marker path only supports
plain-string answers since it's parsed from JSON), and optionally
`id` (used to build the `<details id="...">` for deep-linking) and
`defaultOpen` (boolean).

If the `id` field is omitted, an id is derived by slugifying the question
text (e.g. `"What's the range?"` → `faq-whats-the-range`), so
`#faq-whats-the-range` deep-links still work without the editor manually
assigning ids.

**Malformed input:** invalid JSON, or a JSON value that isn't a non-empty
array, is passed through untouched (the original `<script>` block is left
in place) rather than crashing the render or silently dropping the block.

## Direct usage (`<FaqSection>` component)

For hand-placed FAQ blocks in `.tsx` templates rather than editor-authored
article content:

```tsx
import {FaqSection} from '~/components/blogs/FaqSection';

<FaqSection
  title="Frequently Asked Questions"  // default; pass null to omit
  structuredData={true}                // default
  items={[
    {question: "What's the return window?", answer: "30 days from delivery."},
    {question: "Do you ship internationally?", answer: "Currently US and Canada only."},
  ]}
/>
```

## Props (`<FaqSection>`)

| Prop | Type | Default | Notes |
|---|---|---|---|
| `items` | `FaqItem[]` | — | Required. Empty array renders nothing. |
| `title` | `string \| null` | `"Frequently Asked Questions"` | Pass `null` to omit the heading entirely (e.g. if the surrounding page already has one). |
| `structuredData` | `boolean` | `true` | Emits a `FAQPage` JSON-LD `<script>` alongside the accordion. |

### `FaqItem`

```ts
interface FaqItem {
  id?: string;              // defaults to a slug of the question
  question: string;
  answer: React.ReactNode;  // string OR JSX when used directly; marker path only supports strings
  defaultOpen?: boolean;
}
```

## Structured data

Both paths (marker and direct component) emit a `FAQPage` JSON-LD block by
default, built only from items whose `answer` is a plain string — a
`ReactNode` answer (JSX) can't be serialized into `acceptedAnswer.text`, so
those items are silently excluded from the structured data (they still
render visually in the accordion, just without a corresponding rich-snippet
entry). The JSON is escaped (`<` → `\u003c`) to prevent the embedded
`<script>` from being prematurely closed by content inside an answer.

## Notes / limits

- No portal, no slot, no hydration — this is the simplest of the 14 blog
  components in terms of client-side footprint.
- Deep-linking (`#faq-whats-the-range`) opening a closed `<details>` element
  imperatively is handled by the article template's separate hash-scroll
  effect (uses `getElementById`, not `querySelector(hash)`, since
  slugified ids can start with a digit).
- Because answers in the marker path are plain JSON strings, no rich
  formatting (bold, links) is possible in FAQ answers authored via the
  script-tag marker — only the direct `<FaqSection>` component supports
  JSX answers.

## Testing

- Valid JSON array with 1+ items → accordion renders, no heading
- Invalid JSON → `<script>` block passed through untouched
- Valid JSON, empty array → passed through untouched
- Item missing `id` → id derived by slugifying the question
- Structured data with a mix of string and JSX answers (direct component
  only) → only string-answer items appear in the JSON-LD
- `#faq-{id}` in the URL → corresponding `<details>` opens on load
