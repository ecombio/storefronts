# Theme Architecture — Sections, Snippets, Templates, Assets

This document explains how this Hydrogen storefront borrows Shopify Liquid's
`sections` / `snippets` / `templates` / `assets` vocabulary, why it maps the way
it does, and how to keep new code consistent with the convention.

## Why we're doing this

Hydrogen (React Router v7, formerly Remix) has no built-in concept of sections,
snippets, or templates — it's just a React Router app, structured however you
like. The Liquid vocabulary comes from Shopify's traditional theme architecture
(Online Store 2.0), where:

- **templates** assemble a page
- **sections** are page-level content blocks a template places directly
- **snippets** are small reusable pieces only ever nested inside sections or
  other snippets
- **assets** hold static files (CSS, images, fonts)

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
├── templates/     ← routes (file-based routing root, see below)
├── sections/      ← page-level content blocks, rendered directly by templates
├── snippets/       ← small reusable pieces, nested inside sections/snippets only
├── assets/        ← static CSS and other static files
└── components/    ← anything that doesn't cleanly fit sections/snippets (see below)
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
   non-engineer as "a part of the page"? (Header, Footer, ProductGallery,
   ReviewsWidget) → section.

Current sections: `AnnouncementBar`, `BenefitGrid`, `FeatureGrid`, `Header`
(+ `Header.constants.ts`), `Footer`, `UtilityBar`, `MockShopNotice`,
`ProductForm`, `ProductGallery`, `StickyAddToCart`, `ReviewsWidget`,
`ProductDescriptionPanels`, `CartMain`, `SearchPanel`.

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

### assets/ ← static files

Global CSS lives here: `app.css`, `article.css`, `blog-category.css`,
`menu.css`, `reset.css`, `tailwind.css`, `typewriter.css`, plus `favicon.svg`.
Previously lived in `app/styles/` (removed).

Component-scoped CSS (e.g. `ai-search.css`) may stay co-located with its
component rather than moving here — that's also a legitimate pattern, decide
per case.

### components/ — the deliberate leftover bucket

Not everything fits cleanly into sections/snippets. Rather than force a fit,
these stay in `app/components/` as infrastructure/primitives:

- `PageLayout.tsx` — the app shell, not a page-content block.
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

If none of this cleanly applies, it's fine to leave it in `components/`.

## Import path conventions

- Use the `~/` alias rooted at `app/`, not relative `./` imports, when
  crossing folder boundaries (e.g. a snippet importing something from
  `sections/`).
- Relative `./` imports are fine only for same-folder siblings (e.g.
  `sections/Header.tsx` importing `./AnnouncementBar` which also lives in
  `sections/`).
- When moving a file between folders, grep for both its old `~/components/X`
  import path *and* any relative `./X` imports in files that used to be its
  siblings — both break silently until Vite/MiniOxygen hits the route at
  runtime.

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
