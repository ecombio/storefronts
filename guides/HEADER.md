
# Header

Documentation for the storefront header: structure, responsive behavior, and the components involved.

## Components

| Component | Path | Role |
|---|---|---|
| `Header` | `app/sections/Header.tsx` | Top-level shell. Renders `AnnouncementBar`, `HeaderUtility`, the logo/search/CTA row, and the desktop nav row. Owns sticky/hide-on-scroll behavior. Also inlines `HeaderAccount` and the cart badge (no longer separate snippets). |
| `HeaderUtility` | `app/snippets/HeaderUtility.tsx` | Top utility row (Track Order, Store Locator, etc.) plus `RegionPicker`. Hidden below `sm:`. |
| `HeaderSearch` | `app/snippets/HeaderSearch.tsx` | Owns search input state and renders `SearchBar` + `SearchPanel`. Full-width (`w-full`), no `max-w` cap — sizing is controlled entirely by whatever parent slot it's placed in. |
| `HeaderMenu` | `app/snippets/HeaderMenu.tsx` | Desktop nav links row plus the mega menu (`MenuDrawer`) trigger logic. Hidden below `lg:`; mobile uses a simple stacked link list instead. |
| `MenuDrawer` | `app/snippets/MenuDrawer.tsx` | The mega-menu panel content (tips + category grid) shown under a hovered/focused nav item. |
| `RegionPicker` | `app/snippets/RegionPicker.tsx` | Country/language picker dropdown, portaled to `document.body`. |
| `AnnouncementBar` | `app/sections/AnnouncementBar.tsx` | Top banner (e.g. shipping promo). Untouched by the work below. |

`HeaderCart` and `HeaderAccount` were removed as standalone snippets — both are now inlined directly inside `Header.tsx`.

## Responsive breakpoints

Uses Tailwind's default scale: `sm` 640px, `lg` 1024px.

| Tier | Width | Layout |
|---|---|---|
| Mobile | `< 640px` | Hamburger + logo + icon-only account/cart on top row (pushed right via `ml-auto`). Search bar stacks on its own row underneath. Utility bar and desktop nav row hidden. |
| Tablet | `640px – 1023px` | Same stacked layout as mobile, but account/cart show their text labels (`hidden sm:inline`). Utility bar becomes visible. |
| Desktop | `≥ 1024px` | Hamburger hides; search bar rejoins the top row; full horizontal nav menu row (with mega menu) appears. Content caps at `max-w-[1200px]` with `px-8` / `pt-2.5 pb-2.5`. |

## Behaviors

- **Sticky + hide-on-scroll** (`Header.tsx`): the header is `sticky top-0`. Scrolling down past 80px hides it (`-translate-y-full`); scrolling up reveals it again. Implemented via a `scroll` listener comparing consecutive `window.scrollY` values.
- **Mega menu stays open when hovered** (`HeaderMenu.tsx`): the close-delay hover handlers (`onMouseEnter`/`onMouseLeave` → `cancelClose`/`scheduleClose`) live on a wrapper containing *both* the nav links and `MenuDrawer`, so moving the cursor from a nav item into the drawer doesn't count as leaving.
- **Mega menu closes on scroll**: existing behavior in `HeaderMenu.tsx`, unchanged.
- **Region picker closes on scroll** (`RegionPicker.tsx`): its scroll listener now calls `closePicker()` instead of just repositioning the dropdown, so it never stays floating on-screen while the page scrolls.
- **No borders**: the header no longer uses Tailwind's `border-b`/`border-t` utilities (or manual border styles) anywhere in `Header.tsx` / `HeaderUtility.tsx`. Visual separation comes from spacing and the header's outer `shadow-[0_4px_20px_rgba(0,0,0,0.10)]` only.

## Known follow-ups

- `MenuDrawer.tsx` still has `border-t border-gray-100` on its panel — not yet removed for consistency with the no-borders rule above.
- The active nav-link hover color (`text-gray-400` in `HeaderMenu.tsx`) is low-contrast against the white background and may still read as "disappearing" depending on background/contrast preferences.
- `RegionPicker`'s `selectCountry` is a stub (`console.log`) — real localization (cookie + redirect) isn't wired up yet.
