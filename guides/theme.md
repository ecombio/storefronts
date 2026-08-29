# Theme Architecture — Sections, Snippets, Templates, Assets, Config

This document explains how this Hydrogen storefront borrows Shopify Liquid's
theme vocabulary (`sections` / `snippets` / `templates` / `assets` / `config` /
`layout`), why it maps the way it does, and how to keep new code consistent
with the convention.

## Why we're doing this

Hydrogen (React Router v7, formerly Remix) has no built-in concept of sections,
snippets, templates, or config — it's just a React Router app, structured
however you like. The vocabulary comes from Shopify's traditional theme
architecture (Online Store 2.0), where:

- **templates** assemble a page
- **sections** are page-level content blocks a template places directly
- **snippets** are small reusable pieces only ever nested inside sections or
  other snippets
- **assets** hold static files (CSS, images, fonts)
- **config** holds theme-wide settings
- **layout** is the outer HTML shell every page renders inside

We've adopted this vocabulary as a folder convention on top of Hydrogen's
React/route architecture — not because Hydrogen requires it, but because it
gives the team a consistent, shared mental model for where new code belongs.

**Important caveat:** this is a naming convention we impose, not something
React Router or Hydrogen enforces or is aware of. Liquid enforces the
section/snippet split structurally (different render mechanisms); we enforce
it by convention and code review only.

## Folder structure

```
app/
├── templates/         ← routes (file-based routing root)
├── sections/          ← page-level content blocks, rendered directly by templates
├── snippets/          ← small reusable pieces, nested inside sections/snippets only
├── assets/            ← static CSS and other static files
├── config/            ← app-wide constants and configuration values
├── root.tsx           ← the outer shell (this IS our "layout", see below)
├── components/        ← deliberate leftovers that don't fit the taxonomy
├── graphql/           ← GraphQL query/mutation definitions, by domain
├── lib/               ← general utilities
└── hooks/             ← React hooks
```

### templates/ ← routes

`app/templates` is the file-based routing root, configured explicitly in
`app/routes.ts`:

```ts
import {flatRoutes} from '@react-router/fs-routes';
import {type RouteConfig} from '@react-router/dev/routes';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([
  ...(await flatRoutes({
    rootDirectory: 'templates',
  })),
]) satisfies RouteConfig;
```

This overrides React Router's default `app/routes` folder name. All flat-file
routing conventions (`products.$handle.tsx`, `_index.tsx`, optional segments,
etc.) still apply inside `templates/` — the folder is just renamed, not the
routing rules.

A template's job: load data via a `loader`, then compose `sections` (and
occasionally `snippets` directly) into a page.

### sections/ ← page-level content blocks

A section is something a template renders directly, and usually owns a slice
of loader/API data. Ask:

1. **Would a route ever render this directly as a top-level child?** Yes →
   section.
2. **Does it own or consume a slice of loader/Storefront API data**, rather
   than just receiving props? Usually yes for sections.
3. **Does it have "page block" identity** — could you describe it to a
   non-engineer as "a part of the page"? (Header, Footer, ProductMedia,
   ReviewsWidget) → section.

Current sections: `AnnouncementBar`, `BenefitGrid`, `FeatureGrid`, `Header`,
`Footer`, `UtilityBar`, `MockShopNotice`, `ProductForm`, `ProductMedia`,
`ProductDetail`, `StickyAddToCart`, `ReviewsWidget`, `ProductDescriptionPanels`,
`CartMain`, `SearchPanel`.

(`ProductGallery` was renamed/absorbed into `ProductMedia`, and
`ProductDetail` is new — see Changelog.)

### snippets/ ← reusable, nested-only pieces

A snippet only ever appears nested inside a section or another snippet. Ask:

1. **Is it reused across unrelated contexts with no shared "page block"
   meaning?** (a button, a price, a rating) → snippet.
2. **Is it purely presentational**, receiving props rather than binding to
   Storefront API shapes? → snippet.

Current snippets: `AddToCartButton`, `CartLineItem`, `CartSummary`,
`HeaderAccount`, `HeaderCart`, `HeaderMenu`, `HeaderMenuOnSale`,
`HeaderSearch`, `MenuDrawer`, `Breadcrumbs`, `ProductImage`, `ProductItem`,
`ProductPrice`, `StarRating`, `RegionPicker`, `OnSale`, `SearchForm`,
`SearchFormPredictive`, `SearchResults`, `SearchResultsPredictive`,
`ProductDescription`.

(`ProductImage` is still a standalone snippet — it is not currently used by
`ProductMedia`, which renders its own `<Image>` calls directly. Worth
revisiting whether `ProductMedia`'s main-image rendering should delegate to
`ProductImage` instead of duplicating it — see Changelog.)

### assets/ ← static files

Global CSS lives here: `app.css`, `article.css`, `blog-category.css`,
`menu.css`, `reset.css`, `tailwind.css`, `typewriter.css`, `main-product.css`,
plus `favicon.svg` and `wordmark.svg`.

Component-scoped CSS (e.g. `ai-search.css`) may stay co-located with its
component rather than moving here — that's also a legitimate pattern, decide
per case.

**Known issue:** `typewriter.css` is not currently imported anywhere in the
codebase. Either wire it up (if `typewriter-effect.tsx` is supposed to use
it) or remove it.

### config/ ← app-wide constants

Liquid's `config/settings_schema.json` + `settings_data.json` define
merchant-configurable theme settings. We have no theme editor, so there's no
direct equivalent — but the same *purpose* (a single place for site-wide
configurable values) is served by `app/config/`.

Currently holds `Header.constants.ts` — app-wide constants consumed by
multiple sections and snippets (`FALLBACK_HEADER_MENU`, `UTILITY_LINKS`,
`TRENDING_SEARCH_TERMS`, `COUNTRIES`/`CURRENT_COUNTRY`/`CURRENT_LANGUAGE`,
`ANNOUNCEMENT_SLIDES`, etc.).

As more app-wide constants accumulate, they belong here rather than being
scattered into whichever section happens to need them first.

### layout ← app/root.tsx (no folder)

Liquid's `layout/theme.liquid` is the outer HTML shell every page renders
inside — `<html>`, `<head>`, global styles/scripts, and the slot where a
template's content gets injected.

**We do not have a `layout/` folder, and shouldn't create one.** React Router
requires `root.tsx` at a fixed path — it already does this job: the `<Layout>`
component inside it (with `<html>`, `<head>`, meta tags, global CSS links, and
`<Outlet />`) is functionally our `theme.liquid`. Moving it would break the
app for no benefit. Treat this as a naming/conceptual mapping only.

### Deliberately not attempted: locales/, blocks/

- **`locales/`** — only relevant if/when we introduce translation files. None
  exist elsewhere in the repo currently. Revisit if i18n copy work starts.
- **`blocks/`** — a newer Liquid concept (section sub-pieces, distinct from
  reusable snippets). Some current snippets that are only ever used by one
  specific section (not reused broadly) could arguably be reframed as blocks
  of that section. This is a judgment-heavy audit, deferred — not done as
  part of this restructure.

### components/ — the deliberate leftover bucket

Not everything fits cleanly into sections/snippets. Rather than force a fit,
these stay in `app/components/` as infrastructure/primitives:

- `PageLayout.tsx` — page-level composition wrapper, not itself a content
  block.
- `Aside.tsx` — generic drawer/panel primitive used by `CartMain`,
  `SearchPanel`, `MenuDrawer` etc. Infrastructure, not content.
- `PaginatedResourceSection.tsx` — a generic pagination wrapper despite the
  name; not a "section" in our sense.
- `ai-search/` — not yet classified; may be split further later.
- `ui/` — low-level presentational primitives (`button.tsx`,
  `typewriter-effect.tsx`) — effectively snippets, but kept under `ui/`
  since that's an established convention of its own.

**Rule of thumb:** if something doesn't clearly fit sections or snippets,
leave it in `components/` rather than forcing a categorization.

## Outside the taxonomy entirely

Liquid has no concept of hooks, data-fetching utilities, or GraphQL query
files — those only exist because Hydrogen is a real application framework,
not a template language. These folders are intentionally **not** part of the
sections/snippets/templates/assets/config system, and shouldn't be forced
into it:

- **`lib/`** — general utilities (`algolia.ts`, `context.ts`, `fragments.ts`,
  `orderFilters.ts`, `redirect.ts`, `search.ts`, `session.ts`, `utils.ts`,
  `variants.ts`, `yotpo.ts`).
- **`graphql/`** — GraphQL query/mutation definitions, organized by domain
  (currently `graphql/customer-account/`, holding
  `CustomerAddressMutations.ts`, `CustomerDetailsQuery.ts`,
  `CustomerOrderQuery.ts`, `CustomerOrdersQuery.ts`,
  `CustomerUpdateMutation.ts`). New domains (e.g. product, cart) should get
  their own subfolder here rather than living elsewhere.
- **`hooks/`** — React hooks (`useYotpoRefresh.ts`).

## Decision framework for new components

When adding a new component, ask in order:

1. Would a route render it directly? → **section**. Only nested? →
   **snippet** (or continue below).
2. Does it own/consume loader or Storefront API data? → leans **section**.
   Pure props in, UI out? → leans **snippet**.
3. Reused across unrelated features with no shared meaning (Button, Badge)?
   → **snippet**. Same meaning wherever it's reused (a Newsletter block) even
   if reused across pages? → **section**.
4. Does it make sense to talk about "swapping it in or out" of a page? PMs/
   merchandisers think this way about sections, never about snippets.
5. Is it app-wide configuration/constants rather than UI at all? → **config**.
6. Is it a data query/mutation, utility function, or React hook rather than
   UI? → **graphql/lib/hooks**, not this taxonomy at all.

If none of this cleanly applies, it's fine to leave it in `components/`.

## Import path conventions

- Use the `~/` alias rooted at `app/`, not relative `./` imports, when
  crossing folder boundaries (e.g. a snippet importing something from
  `sections/` or `config/`).
- Relative `./` imports are fine only for same-folder siblings (e.g.
  `sections/Header.tsx` importing `./AnnouncementBar` which also lives in
  `sections/`).
- When moving a file between folders, grep for both its old absolute import
  path *and* any relative `./` imports in files that used to be its siblings
  — both break silently until Vite/MiniOxygen hits the route at runtime.

## Lessons learned during the migration

- Moving a file breaks two kinds of imports: absolute paths pointing at its
  old folder (`~/components/Footer` → `~/sections/Footer`), and relative
  imports *inside* the moved file that assumed its old neighbors
  (`./AddToCartButton` inside `ProductForm.tsx`, which used to sit next to
  it in `components/` but now doesn't, since `AddToCartButton` is a snippet).
- A single component file can export more than one symbol (e.g.
  `Header.tsx` re-exporting `HeaderMenu` from `./HeaderMenu`) — check for
  re-exports before assuming an import only needs updating in one place.
- Search sweeps should include filenames with dots (e.g.
  `Header.constants.ts`) as their own explicit pattern — a broad `Header`
  regex won't reliably catch `Header.constants` depending on how the regex
  is built.
- Orphaned imports can hide: `typewriter.css` moved with the rest of
  `styles/` → `assets/`, but turned out not to be imported anywhere in the
  codebase at all — worth a periodic check for files like this that exist
  but are never wired in.
- When a shared file (like `Header.constants.ts`) moves a second time (out
  of `sections/` into `config/`), both the relative imports *and* the
  previously-fixed absolute imports need a second pass — don't assume a
  file is done moving just because it moved once already.

## Changelog

### 2026-08-28 — PDP split into `ProductMedia` / `ProductDetail`

`templates/products.$handle.tsx` previously hand-assembled the whole
two-column product layout inline (image on the left via the `ProductImage`
snippet, title/rating/price/form/description on the right). Per the
decision framework, both halves are sections — a route renders each
directly, and each owns a slice of loader/Storefront API data.

- **`ProductGallery` → `ProductMedia`**: `ProductGallery` (multi-image
  gallery with thumbnails, ported from `product-media.liquid` +
  `product-media.js`, added in an earlier pass) had been built but never
  wired into the route — the route was still using the older single-image
  `ProductImage` snippet. Rather than create a thin wrapper around
  `ProductGallery`, its full implementation was inlined into
  `sections/ProductMedia.tsx` and `ProductGallery.tsx` was deleted (git
  recorded this as a rename, ~65% similarity).
  - `PRODUCT_FRAGMENT` in the route was updated to fetch
    `images(first: 12) { nodes { id url altText width height } }`, since
    the original fragment only fetched the selected variant's single
    `image` field — insufficient for a multi-image gallery.
  - Added hover-reveal scroll arrows (up/down) on the thumbnail rail,
    thumbnails bumped 84px → 96px with more gap, thumbnail track scrollbar
    hidden in favor of the new arrow controls.
  - Made the gallery `position: sticky` (pinned while the usually-taller
    `ProductDetail` column scrolls past it), disabled on mobile
    (`≤768px`) where the layout stacks vertically instead.
  - New stylesheet `assets/main-product.css` created for all of the
    above (this file was previously only referenced in a code comment as
    aspirational/never-ported — see "Known issue" note in `assets/`
    above, which now no longer applies to this file; it does still apply
    to `typewriter.css`). Wired into `root.tsx` the same way as the
    existing `resetStyles`/`appStyles`/`menuStyles` — `?url` import +
    manual `<link rel="stylesheet">` tag (not the `links()` export).
- **`ProductDetail` (new)**: composes title, `StarRating`, `ProductPrice`,
  `ProductForm`, and the `Description` snippet — previously inlined
  directly in the route's JSX.
- **Not yet done**: `ProductDetail` still uses the plain `Description`
  snippet rather than `ProductDescriptionPanels` (the accordion-style
  Description/Shipping/Refund/Warranty component, built earlier but also
  never wired in — it needs `shippingHtml`/`refundHtml`/`warrantyHtml`
  sourced from shop policies or a metaobject, which the route doesn't
  currently fetch). Revisit when that data is available.
- **Not yet done**: `ProductMedia`'s main image duplicates `<Image>`
  rendering logic that also exists in the `ProductImage` snippet, rather
  than delegating to it. `ProductImage` is currently unused by the PDP as
  a result (still may be used elsewhere — not audited).