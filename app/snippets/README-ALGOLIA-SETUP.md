# Algolia Search — Updated Files & What to Check Next

## Files in this bundle (all fixes so far, consolidated)

```
vite.config.ts                              — REPLACES your current one
app/lib/algolia.ts                          — REPLACES (v5 named-export fix)
app/templates/search.tsx                    — REPLACES (client-only InstantSearch)
app/snippets/AlgoliaInstantSearch.client.tsx — REPLACES (same content as before, unchanged)
app/assets/search-algolia.css               — NEW FILE
```

`AlgoliaProductHit.tsx` is unchanged from what you already have — no new
version included, keep your existing one.

## One step you're missing: the CSS isn't wired up anywhere

`search-algolia.css` styles the classes used by `search.tsx` and
`AlgoliaInstantSearch.client.tsx` (`.search-page`, `.search-layout`,
`.search-facets`, `.product-hit`, etc.) — but no file in your project
imports it yet. That's very likely why your screenshot showed unstyled,
stacked content with no visible grid or facet headings.

Open `app/root.tsx` and find where your other CSS files are imported —
you'll see a pattern like this near the top:

```ts
import searchBarStyles from '~/assets/search-bar.css?url';
```

and a `links` (or `Links`) export further down that returns an array of
`{rel: 'stylesheet', href: searchBarStyles}` entries. Add the same for
this new file:

```ts
import searchAlgoliaStyles from '~/assets/search-algolia.css?url';
```

...and add `{rel: 'stylesheet', href: searchAlgoliaStyles}` to that same
array. (I don't have your actual `root.tsx` content, so I can't hand you
an exact diff — but every other CSS file in `app/assets/` is wired up the
same way, so copy that exact pattern.)

## Now, the more important open question: is data actually coming back?

Styling won't matter if Algolia isn't returning results. Before assuming
the CSS fix solves everything, check this:

1. Run the dev server, go to `/search?q=electric`
2. Open browser DevTools → **Network** tab, reload
3. Find the request to Algolia (URL contains `algolia.net` or
   `algolianet.com`, method is usually `POST`)
4. Click it → **Response** tab

**If you see `"hits": []`** (empty array) — the request works, but your
index has no matching (or no) records. Go to the Algolia dashboard →
your `shopify_products` index → **Browse** tab and confirm records
actually exist and have a `title` field containing words like "electric".

**If you see `"hits": [...]`** with actual product objects — data is
fine, and it was purely the missing CSS making results invisible/
unstyled. The bundle above should fully resolve it.

**If the request never fires, or fails (4xx/5xx)** — check:
- `PUBLIC_ALGOLIA_APP_ID`, `PUBLIC_ALGOLIA_SEARCH_KEY`,
  `PUBLIC_ALGOLIA_INDEX_NAME` in `.env` are correct (typos in app ID are
  an easy miss)
- `PUBLIC_ALGOLIA_SEARCH_KEY` is a **search-only API key** from the
  Algolia dashboard, not your admin/write key (using the wrong key type
  causes 4xx errors)
- `PUBLIC_ALGOLIA_INDEX_NAME` exactly matches the index name in the
  dashboard (case-sensitive)

## Also worth re-confirming from the original README

The original setup notes said the hierarchical category facet
(`category.lvl0`–`lvl5`) **must be saved in the Algolia dashboard's
index Configuration before `HierarchicalMenu` will render it correctly.**
If that step got skipped, the category filter sidebar may silently fail
to render even though the rest of the page works — worth re-checking
that dashboard setting while you're in there confirming the index has
data.

## Quick summary of everything fixed across this whole session, for your own record

1. `algoliasearch-helper` (CJS) crashing MiniOxygen's SSR — fixed by
   moving `react-instantsearch` into a `.client.tsx`-suffixed file so it
   never loads server-side, **plus** targeting
   `environments.ssr.resolve.noExternal` in `vite.config.ts` (the
   generic top-level `ssr.noExternal` doesn't reach the custom SSR
   environment your Oxygen Vite plugin version creates).
2. `algoliasearch/lite` "does not provide an export named 'default'" —
   fixed by switching to the v5 named export (`liteClient as
   algoliasearch`) in `algolia.ts`.
3. (This step) — CSS never wired up, so far unconfirmed whether Algolia
   is actually returning data.
