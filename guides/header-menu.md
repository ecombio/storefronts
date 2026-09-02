# Header Mega-Menu — Collection Images Debug Log

## Summary

The mega-menu's collection images (Electric Cargo Bikes, City Bikes, Fat
Bikes, Folding Bikes, Mountain Bikes, etc.) were rendering as broken-image
icons in the browser. Investigation surfaced **three separate, real bugs**
stacked on top of each other. Two are confirmed fixed. The third —
whether the browser is actually picking up the fix — is still being
verified.

---

## Key finding

The live Shopify data pipeline is correct and returns real, working CDN
URLs. Confirmed directly:

**[fiido-t3-two-people-riding_1.webp (920×480)](https://cdn.shopify.com/s/files/1/0726/0641/7110/collections/fiido-t3-two-people-riding_1.webp?v=1784397522)**

This is the live `image.url` field returned by Shopify for the
**Electric Cargo Bikes** collection (`gid://shopify/Collection/478932304086`),
fetched via `MENU_COLLECTION_IMAGES_QUERY` in `app/root.tsx`. It loads
successfully when opened directly, proving:

- The collection has a real image set in Shopify Admin.
- `loadMenuCollectionImages()` correctly queries and maps it.
- The `resourceId` on the corresponding menu item
  (`gid://shopify/MenuItem/635251163350`) correctly matches the
  collection's GID.
- `cdn.shopify.com` images are not blocked by CSP (unlike the
  `ecombio.com` fallback host).

This is the "should be" state for every collection image in the mega-menu.

---

## Bugs found (in the order uncovered)

### 1. CSP blocked the `ecombio.com` fallback host — **fixed**

`app/entry.server.tsx`'s `createContentSecurityPolicy()` call had an
`imgSrc` allow-list that included `cdn.shopify.com` and various
third-party domains (Yotpo, picsum.photos) but never included
`ecombio.com` — the domain used by the hardcoded fallback image URLs in
`SUBMENU_IMAGES` (`app/config/Header.constants.ts`). Any `<img>` pointing
at `ecombio.com` was silently blocked by the browser, appearing as a
broken-image icon.

**Fix applied:** added `'http://ecombio.com'` and `'https://ecombio.com'`
to the `imgSrc` array in `app/entry.server.tsx`.

**Result after fix:** CSP block cleared. Images still didn't load —
because the underlying `SUBMENU_IMAGES` URLs point at stale/moved assets
(see #2).

### 2. `.env` line merge — **fixed**

```
PUBLIC_YOTPO_ENABLED=truePUBLIC_CHECKOUT_DOMAIN=ecombio.myshopify.com
```

Two env vars were merged onto a single line with no line break, so
`.env` parsing swallowed `PUBLIC_CHECKOUT_DOMAIN` entirely into the value
of `PUBLIC_YOTPO_ENABLED`. This left `PUBLIC_CHECKOUT_DOMAIN` undefined,
breaking `Analytics.Provider`'s consent setup
(`consent.checkoutDomain is required` console error) and was suspected
(not fully confirmed) to be linked to a separate bug where a Shopify
customer-account OAuth login URL was being rendered as an `<img src>`,
flooding the console with CSP violations on every re-render.

**Fix applied:** split into two lines:
```
PUBLIC_YOTPO_ENABLED=true
PUBLIC_CHECKOUT_DOMAIN=ecombio.myshopify.com
```

### 3. `SUBMENU_IMAGES` fallback URLs are dead assets

Via DevTools Network tab, requests to the `ecombio.com` fallback URLs
(e.g. `Off-Road_E-Scooters.png?v=1780540359`) were confirmed to return a
redirect chain (307 → 302) that terminates in a **404**:

```
ecombio.com/cdn/shop/collections/Off-Road_E-Scooters.png?v=...
  → 307 → 302 →
ecombio.com/cdn/shop/collections/electric-mountain-bikes_s.jpg → 404 Not Found
```

These are old, hardcoded CDN URLs in `SUBMENU_IMAGES`
(`app/config/Header.constants.ts`) that no longer point at valid assets.
This confirmed the original suspicion from the very start of the
investigation.

**Not directly fixed** — instead, investigation shifted to why the app
was relying on this stale fallback at all when live data should be
available (see below).

---

## Why the fallback was firing instead of live data

Initial theory: `FALLBACK_HEADER_MENU` (a hardcoded mock menu in
`Header.constants.ts` with `resourceId: null` on every item) was being
used in place of the live Shopify menu, e.g. because `HEADER_QUERY` was
failing. This was disproven — see below.

### Confirmed via temporary debug logging in `app/root.tsx`

Two `console.log` statements were temporarily added to `loadCriticalData()`:

```javascript
console.log('HEADER MENU DEBUG:', JSON.stringify(header.menu, null, 2));
// ...
console.log('COLLECTION IMAGES DEBUG:', JSON.stringify(collectionImages, null, 2));
```

**Result:** Both are correct.

- `header.menu` is the **real, live** Shopify menu
  (`gid://shopify/Menu/227397566678`), with every collection sub-item
  carrying a valid `resourceId` (e.g.
  `gid://shopify/Collection/478932304086` for Electric Cargo Bikes),
  correctly typed `"type": "COLLECTION"`.
- `collectionImages` correctly resolves to a map of
  `{ [collectionGID]: { url, altText } }`, with real
  `cdn.shopify.com` URLs — this is where the key finding URL above came
  from.

So `FALLBACK_HEADER_MENU` was never the problem. The live data path
works correctly end-to-end on the server.

---

## Full prop chain — confirmed intact

Every link between the loader and the rendering component was checked
individually and confirmed correct:

```
root.tsx (loadCriticalData)
  → collectionImages: Record<string, CollectionImage>   ✅ confirmed via debug log
Header.tsx
  → <HeaderMenu collectionImages={collectionImages} ... />   ✅ confirmed in source
HeaderMenu.tsx
  → <MenuDrawer collectionImages={collectionImages} ... />   ✅ confirmed in source
MenuDrawer.tsx
  → const liveImage = sub.resourceId ? collectionImages?.[sub.resourceId] : undefined;
  → const imageSrc = liveImage?.url ?? SUBMENU_IMAGES[sub.title];   ✅ logic confirmed sound
```

`HeaderLayoutStorefront.tsx` (the active layout, per
`ACTIVE_HEADER_STYLE = 'storefront'`) was also checked — it receives
`menu` as an already-constructed React element from `Header.tsx` and
just renders `{menu}` inline, so it does not need to (and does not)
handle `collectionImages` directly. Not a break point.

---

## Open question — not yet resolved

Despite the server-side data and full prop chain being confirmed
correct, the browser was still observed rendering the broken
`ecombio.com` fallback images after the CSP and `.env` fixes.

**Leading hypothesis:** stale browser/client state rather than a code
bug — e.g. viewing a different/stale tab, cached JS bundles, or a
lazy-load/paint quirk on an otherwise-correct `<img src>`.

**Next diagnostic step (not yet completed):** inspect the actual
rendered `<img>` element via DevTools → Elements tab (right-click the
broken image → Inspect) and check its live `src` attribute value:

- If `src` shows `cdn.shopify.com/...` → the fix has landed; any
  remaining visual issue is a separate, smaller problem (e.g.
  lazy-loading/paint), not a data or CSP issue.
- If `src` still shows `ecombio.com/...` → the client is not picking up
  the updated data despite the server confirmed correct — worth checking
  for a hard-reload/cache issue, wrong tab, or (less likely at this
  point) a caching header on the loader response.

---

## Files touched this session

| File | Change |
|---|---|
| `app/entry.server.tsx` | Added `ecombio.com` (http + https) to CSP `imgSrc` |
| `.env` | Split merged `PUBLIC_YOTPO_ENABLED` / `PUBLIC_CHECKOUT_DOMAIN` line |
| `app/root.tsx` | Added temporary debug `console.log`s (should be removed once fully resolved) |

## Suggested follow-up cleanup (not yet done)

1. Remove the two temporary debug `console.log` lines from
   `app/root.tsx` once the browser-side render is confirmed fixed.
2. Consider replacing the `SUBMENU_IMAGES` static-URL fallback in
   `MenuDrawer.tsx` with the existing generic `<Bike>` icon fallback,
   since live collection images are now confirmed working for every
   collection currently in the menu — removing the second, independently
   stale set of hardcoded URLs.
