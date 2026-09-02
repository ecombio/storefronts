// app/sections/header-styles/HeaderLayoutStorefront.tsx
//
// Single row (desktop, lg+): logo — centered nav menu — search +
// account/cart cluster on the right. Merged from the previous two-row
// layout (nav menu used to sit on its own row below, separated by a
// hairline border) into one row, with the menu centered between logo
// and the search/ctas cluster — mirrors HeaderLayoutLaunchpad's
// arrangement.
//
// Mobile (<lg): unchanged — hamburger + logo + cart on top, full-width
// search on its own row below. Nav menu lives in the mobile drawer.
//
// No data-header-menu-row here anymore — there's no second row to
// anchor a mega-menu backdrop to, so HeaderMenu's updatePanelTop()
// will just fall back to its default top offset, same as Launchpad.

import type {HeaderLayoutProps} from './types';

export function HeaderLayoutStorefront({
  logo,
  menu,
  search,
  ctas,
  mobileToggle,
  mobileSearch,
}: HeaderLayoutProps) {
  return (
    <div data-header-row className="relative">
      <div className="mx-auto flex max-w-[var(--content-max-width)] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
        {mobileToggle}
        {logo}

        {/* [&>*]:!w-auto forces the menu's root element to shrink to
            its content instead of stretching to fill this flex-1
            wrapper, so justify-center has room to actually center it. */}
        <div className="hidden flex-1 justify-center lg:flex [&>*]:!w-auto">
          {menu}
        </div>

        {/* Mobile has no centered menu (it lives in the drawer) — this
            spacer keeps the same logo-left / ctas-right split. */}
        <div className="flex-1 lg:hidden" />

        <div className="hidden items-center gap-4 lg:flex">
          <div className="w-[160px] shrink-0">{search}</div>
          {ctas}
        </div>

        <div className="lg:hidden">{ctas}</div>
      </div>

      {mobileSearch && <div className="w-full py-2 lg:hidden">{mobileSearch}</div>}
    </div>
  );
}
