// app/sections/header-styles/HeaderLayoutBackMarket.tsx
//
// Row 1 (desktop, lg+): logo — flex-grow search — account/cart. Search
// grows to fill whatever space is left between logo and ctas (capped
// at max-w-xl so it doesn't stretch edge-to-edge on ultra-wide
// screens), instead of sitting at a fixed compact width with dead
// space around it.
// Row 2 (desktop, lg+): primary nav menu, full width, its own row
// underneath, separated by a hairline border. Tagged
// data-header-menu-row so HeaderMenu.tsx's updatePanelTop() can find
// this row via closest() and anchor the mega-menu backdrop to it.
//
// Mobile (<lg): unchanged — hamburger + logo + cart on top, full-width
// search on its own row below (mobileSearch, not the flex-grow one
// above). Nav menu lives in the mobile drawer.
//
// NOTE: this exact wrapper was tried once before and reverted because
// the search box visually didn't grow. That wasn't this file's fault —
// AiSearchBar.tsx's SIZE_CONFIG.compact had a hardcoded "w-[260px]
// shrink-0" that silently overrode any width this wrapper offered.
// That's fixed now (compact uses "w-full min-w-0"), so this wrapper
// approach actually works as intended.

import type {HeaderLayoutProps} from './types';

export function HeaderLayoutBackMarket({
  logo,
  menu,
  search,
  ctas,
  mobileToggle,
  mobileSearch,
}: HeaderLayoutProps) {
  return (
    <div data-header-row className="relative">
      <div className="mx-auto flex max-w-full items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
        {mobileToggle}
        {logo}

        {/* Mobile: plain spacer pushes ctas to the right, no inline
            search here (mobileSearch handles that in its own row
            below). Desktop: search replaces the spacer and grows to
            fill ALL remaining space between logo and ctas — no
            max-width cap. min-w-0 is required alongside flex-1 —
            without it, flex items default to min-width: auto and
            won't actually shrink/grow past their content's intrinsic
            width. */}
        <div className="flex-1 lg:hidden" />
        <div className="hidden min-w-0 flex-1 lg:block">{search}</div>

        {/* ml-auto is redundant now that search has no max-width cap
            (it already consumes 100% of the remaining space, which
            naturally pushes ctas to the edge) — left in as a safety
            net in case search's own content ever reintroduces an
            intrinsic width constraint. */}
        <div className="hidden items-center gap-4 lg:ml-auto lg:flex">{ctas}</div>

        <div className="lg:hidden">{ctas}</div>
      </div>

      <div data-header-menu-row className="hidden border-t border-gray-100 lg:block">
        <div className="mx-auto flex max-w-full items-center justify-center px-4 py-2.5 lg:px-8 [&>*]:!w-auto">
          {menu}
        </div>
      </div>

      {mobileSearch && <div className="w-full py-2 lg:hidden">{mobileSearch}</div>}
    </div>
  );
}