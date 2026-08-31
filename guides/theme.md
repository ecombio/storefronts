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

Global, cross-component design tokens (breakpoints, content max-width, and
any future shared values) live in `assets/theme.css`, imported ahead of
component-scoped stylesheets — see **Design Tokens & Breakpoints** below.

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

## Design Tokens & Breakpoints

All shared design tokens live in `app/assets/theme.css` (formerly split
between `base.css` and this doc — now consolidated so the values and their
rationale aren't drifting apart in two places). Import `theme.css` ahead of
component-scoped stylesheets.

**Single source of truth for the values themselves:** `app/sections/Header.tsx`

Header is the one component every page shares, it's the hardest to change
without site-wide impact, and it's already built on Tailwind's `sm:` / `lg:`
utility prefixes and a `max-w-[1200px]` content cap. Every other
component's tokens should match it — not invent their own.

### The three breakpoint tiers

Tokenized in `theme.css` as `--bp-sm` / `--bp-lg`. These two pixel
values mark the boundaries of **three** named tiers — mobile, tablet,
desktop — not two:

| Tier | Range | Nav (Header) | Layout expectation |
|------|-------|--------------|---------------------|
| **Mobile** | `< 640px` | Hamburger / drawer | Most compact spacing and type. Touch-only — no hover reveals; anything that would hide-until-hover on desktop (wishlist icon, quickview) is shown permanently instead. |
| **Tablet** | `640px – 1023px` | Hamburger / drawer *(same as mobile — Header doesn't switch nav until 1024px)* | Roomier spacing/type, closer to desktop's — there's more screen to use — but still touch-first: no hover reveals, same as mobile. |
| **Desktop** | `≥ 1024px` | Full inline nav, inline search, mega-menu row | Full spacing. Hover-reveal interactions are appropriate (wishlist fade-in on card hover, quickview button, hover-swap product image). |

`--bp-sm` (640px) is the **mobile/tablet** boundary. `--bp-lg` (1024px) is
the **tablet/desktop** boundary — and, not incidentally, the point where
Header's own nav structurally changes. No new pixel values were needed to
introduce the third tier — `sm` simply stopped being treated as
"cosmetic-only" and became a real tier line.

**Nav is intentionally still 2-state**, even though layout is now 3-state:
Header doesn't have a distinct tablet nav treatment today (tablet gets the
same drawer as mobile). If tablet ever needs its own nav pattern (e.g. a
condensed inline bar instead of a drawer), that's a `Header.tsx` change
first — reflect it here afterward, don't invent it in another component.

### Content max-width

Tokenized in `theme.css` as `--content-max-width: 1200px`. Matches
Header's own `lg:max-w-[1200px]` + `mx-auto` centering — confirmed via
DevTools that the header's content row measures exactly 1200px wide at
desktop viewports, so this isn't a guess.

Any section/component that renders full-width page content (i.e. isn't
already nested inside another capped container) should cap and center at
this same width, with responsive horizontal padding matching Header's own
`px-4 sm:px-6 lg:px-8` scale. Without this, a component can render wider
than the header sitting above it on the page — this happened in practice:
`ProductCarousel` had no max-width at all, so its content (and its scroll
arrows) stretched to the full, uncontained page width while Header stayed
capped at 1200px, leaving the carousel's arrows stranded far past the
header's right edge instead of aligned under it. Fixed in
`product-carousel.css` — see that file for the working pattern
(`max-width: 1200px` + `margin-inline: auto` + tiered `padding-inline`).

### Content padding (horizontal)

Tokenized in `theme.css` as `--content-padding-mobile` (1rem / 16px),
`--content-padding-tablet` (1.5rem / 24px), and `--content-padding-desktop`
(2rem / 32px). Matches Header's own `px-4 / sm:px-6 / lg:px-8` scale,
tiered to the same `--bp-sm` / `--bp-lg` boundaries above — this is not a
fourth breakpoint, just the horizontal padding value that applies within
each existing tier.

Any component that caps at `--content-max-width` should also use these
padding tokens so its edges align with Header's content row, not just its
overall width — a matching max-width with mismatched padding still looks
misaligned against Header at a glance.

### How we got here

An audit of the codebase (Aug 2026) found three different components each
using a different "mobile" cutoff, and a two-tier (mobile/desktop only)
model in this doc's first draft that then proved too coarse for card/grid
layouts, which benefit from a tablet step. A later pass found a separate
content-max-width gap on top of that.

| File | Issue found | Correct? |
|------|--------------|----------|
| `Header.tsx` | `lg:` 1024px (nav), `sm:` 640px (label/spacing tweaks), `lg:max-w-[1200px]` content cap | ✅ still the standard for all three tokens |
| `product-card.css` | `max-width: 767px` breakpoint | ❌ was invented locally |
| `product-carousel.css` | `max-width: 640px` breakpoint; no content max-width at all | ❌ breakpoint invented locally; max-width simply missing |
| `app.css` (legacy) | `45em` / `48em` (720px / 768px) breakpoints | ❌ dead code — tied to markup that predates the current Tailwind-based `Header.tsx` |

Practical effect of the breakpoint mismatch: at a width like 900px (a
tablet), the header still showed its mobile hamburger nav, while the
product card had already switched into "desktop" styling (larger price
text, hover-only wishlist icon meant for pointer devices). Practical
effect of the missing content max-width: the product carousel section
rendered wider than the header above it, so its layout visually
disagreed with the rest of the page instead of lining up under it.

A separate audit (also Aug 2026) found `app/assets/header-menu.css`
carrying a stale, divergent duplicate of the "On Sale" star-highlight
styles now owned by `highlight.css` — different class names
(`.menu-bar__link--highlight` vs. the live `.nav-item--highlight`),
never `import`ed anywhere, left behind by an earlier rename
(`66be44f`/`8a5babd`) that renamed the classes and moved the logic but
never deleted the old file. Confirmed dead via `git log --follow` and
removed. Not a token-drift case like the rows above, but the same root
cause: a value (here, a whole file) drifting out of sync with its
renamed/superseding counterpart because nothing forced the two to be
updated together.

### Rules for new and updated components

1. **Use the three breakpoint tiers, keyed off the same two pixel
   values.** Don't add a fourth boundary without updating Header first
   and reflecting the change here.
2. **Tablet is its own visual tier, not folded into mobile or desktop.**
   Give it deliberate values (spacing, type scale) rather than reusing
   mobile's compact numbers or desktop's hover-dependent ones wholesale.
3. **Hover-reveal interactions are desktop-only** (`≥ 1024px`). Mobile and
   tablet both get the always-visible/touch-first version — neither has
   reliable hover.
4. **Nav stays keyed to `lg` (1024px) only**, matching Header, unless
   Header itself grows a tablet-specific nav pattern.
5. **Any full-width section caps at `--content-max-width` (1200px)**,
   centered with `margin-inline: auto`, with horizontal padding using
   `--content-padding-mobile` / `--content-padding-tablet` /
   `--content-padding-desktop` (tokenized in `theme.css`, matching
   Header's `px-4 / sm:px-6 / lg:px-8` scale). Don't let a section
   render wider than Header's own content row, and don't hardcode a
   padding value that isn't one of these three.
6. **Tailwind components:** use the `sm:` / `lg:` prefixes and
   `max-w-[1200px]` directly.
7. **Plain CSS components:** hardcode the literal px values in `@media`
   queries and `max-width` declarations (CSS custom properties don't work
   inside media conditions), but reference `theme.css`'s `--bp-sm` /
   `--bp-lg` / `--content-max-width` in a comment above each rule, and
   name the tier it targets, e.g.:
   ```css
   /* Tablet tier (640–1023px) — see theme.css --bp-sm / --bp-lg */
   @media (min-width: 640px) and (max-width: 1023px) {
     ...
   }
   ```
8. **Legacy `app.css` rules using `45em`/`48em`** (720px/768px, e.g.
   `.header-menu-mobile-toggle`, `.recommended-products-grid`,
   `.products-grid`, `.product`, `.collection-description`,
   `.featured-collection-image`) are dead code from the pre-Tailwind
   Hydrogen starter markup. Do not copy these values into new work.
   Confirm each is unused before deleting.
9. **`Header.tsx` is the one-way source of truth.** Tokens in
   `theme.css` are copied from Header's live Tailwind classes, not the
   reverse — Header does not consume these tokens (it stays hardcoded
   `px-4 sm:px-6 lg:px-8`, `max-w-[1200px]`, etc. on purpose). That
   means the tokens can silently go stale: if Header's classes change,
   nothing breaks or warns — `theme.css` just becomes wrong until
   someone notices. This has already happened once with breakpoints
   (see the audit table above) and separately with a whole orphaned
   file (`header-menu.css`, also above). **Any PR touching Header's
   `px-*`, `max-w-[...]`, or `sm:`/`lg:` breakpoint classes must update
   `theme.css`'s matching values in the same PR.**

### Checklist for reviewing a new component's CSS

- [ ] No hardcoded breakpoint other than `640px` or `1024px`
- [ ] Three tiers are addressed deliberately (mobile, tablet, desktop) —
      tablet isn't silently inheriting mobile's or desktop's values by
      omission
- [ ] Hover-only interactions are gated to `≥ 1024px`; mobile and tablet
      show the always-visible equivalent
- [ ] Nav-level structural changes (drawer vs. inline, mega-menu) still
      happen only at `1024px`, matching Header
- [ ] If Tailwind, uses `sm:` / `lg:` — no arbitrary `min-width:[...]`
      values for breakpoints that duplicate these two numbers
- [ ] Horizontal padding on any capped section uses the three
      `--content-padding-*` tokens, not an invented value
- [ ] If this PR changes Header.tsx's padding/max-width/breakpoint
      classes, theme.css's tokens were updated to match in the same PR