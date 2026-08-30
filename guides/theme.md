# Theme Architecture — Sections, Snippets, Templates, Assets, Config

This document explains how this Hydrogen storefront borrows Shopify Liquid's
theme vocabulary (`sections` / `snippets` / `templates` / `assets` / `config` /
`layout`), why it maps the way it does, and how to keep new code consistent
with the convention.

This is a living convention, not a snapshot — it describes *how to decide
where something goes*, not an inventory of what currently exists. Folders
will gain and lose files over time; this document shouldn't need an edit
every time that happens.

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
├── templates/          ← routes (file-based routing root)
├── sections/            ← page-level content blocks, rendered directly by templates
├── snippets/            ← small reusable pieces, nested inside sections/snippets only
├── assets/              ← static CSS and other static files
├── config/              ← app-wide constants and configuration values
├── root.tsx             ← the outer shell (this IS our "layout", see below)
├── routes.ts            ← React Router config, points file-based routing at templates/
├── entry.client.tsx     ← Hydrogen/React Router framework entry point (browser)
├── entry.server.tsx     ← Hydrogen/React Router framework entry point (server)
├── components/          ← deliberate leftovers that don't fit the taxonomy
├── graphql/              ← GraphQL query/mutation definitions, by domain
├── lib/                  ← general utilities
└── hooks/                ← React hooks
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
   non-engineer as "a part of the page"? (e.g. a page header, a footer, a
   product media gallery, a reviews widget) → section.

### snippets/ ← reusable, nested-only pieces

A snippet only ever appears nested inside a section or another snippet. Ask:

1. **Is it reused across unrelated contexts with no shared "page block"
   meaning?** (a button, a price, a rating) → snippet.
2. **Is it purely presentational**, receiving props rather than binding to
   Storefront API shapes? → snippet.

### assets/ ← static files

Global CSS and other static files (images, fonts) live here.
Component-scoped CSS may stay co-located with its component rather than
moving here — that's also a legitimate pattern, decide per case.

### config/ ← app-wide constants

Liquid's `config/settings_schema.json` + `settings_data.json` define
merchant-configurable theme settings. We have no theme editor, so there's no
direct equivalent — but the same *purpose* (a single place for site-wide
configurable values) is served by `app/config/`. As app-wide constants
accumulate, they belong here rather than being scattered into whichever
section happens to need them first.

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

- **`locales/`** — only relevant if/when translation files are introduced.
  Revisit if i18n copy work starts.
- **`blocks/`** — a newer Liquid concept (section sub-pieces, distinct from
  reusable snippets). Some snippets that are only ever used by one specific
  section (not reused broadly) could arguably be reframed as blocks of that
  section. This is a judgment-heavy audit, deferred.

### components/ — the deliberate leftover bucket

Not everything fits cleanly into sections/snippets. Rather than force a fit,
generic infrastructure/primitives that don't map to a page block or a
reusable content piece stay in `app/components/` — for example, a
page-level composition wrapper, a generic drawer/panel primitive, or a
generic pagination wrapper. A `ui/` subfolder can hold low-level
presentational primitives (buttons, effects) that are effectively snippets
but are kept separate since that's an established convention of its own.

**Rule of thumb:** if something doesn't clearly fit sections or snippets,
leave it in `components/` rather than forcing a categorization.

## Outside the taxonomy entirely

Liquid has no concept of hooks, data-fetching utilities, GraphQL query
files, or framework entry points — those only exist because Hydrogen is a
real application framework, not a template language. These folders/files are
intentionally **not** part of the sections/snippets/templates/assets/config
system, and shouldn't be forced into it:

- **`lib/`** — general utilities.
- **`graphql/`** — GraphQL query/mutation definitions, organized by domain
  subfolder (e.g. `customer-account/`). New domains (e.g. product,
  collection, cart) should get their own subfolder here rather than living
  elsewhere.
- **`hooks/`** — React hooks.
- **`entry.client.tsx` / `entry.server.tsx`** — Hydrogen/React Router
  framework entry points, required at fixed top-level paths, same category
  as `root.tsx` and `routes.ts`.

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