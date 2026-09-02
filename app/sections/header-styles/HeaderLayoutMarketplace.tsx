// app/sections/header-styles/HeaderLayoutMarketplace.tsx
//
// Single row (desktop, lg+): logo + nav menu inline together on the
// left, search + account/cart cluster pinned right — denser, more
// left-weighted than the Nike layout's centered menu.
//
// Mobile (<lg): unchanged — hamburger + logo + cart on top, full-width
// search on its own row below. Nav menu lives in the mobile drawer.
//
// No data-header-menu-row here, same reasoning as the Nike layout —
// menu and logo share row 1, there's no second row to anchor to.
//
// NOTE: this is a structural starting point (left-aligned logo+menu,
// right-aligned search+ctas). It hasn't been checked against a real
// Gymshark screenshot — swap in their actual spacing/typography once
// you've got a reference to match against.

import type {HeaderLayoutProps} from './types';

export function HeaderLayoutMarketplace({
  logo,
  menu,
  search,
  ctas,
  mobileToggle,
  mobileSearch,
}: HeaderLayoutProps) {
  return (
    <div data-header-row className="relative">
      <div className="mx-auto flex max-w-[var(--content-max-width)] items-center gap-6 px-4 py-3 sm:gap-4 sm:px-6 lg:gap-8 lg:px-8">
        {mobileToggle}
        {logo}

        <div className="hidden lg:flex [&>*]:!w-auto">{menu}</div>

        <div className="flex-1" />

        <div className="hidden items-center gap-4 lg:flex">
          {search}
          {ctas}
        </div>

        <div className="lg:hidden">{ctas}</div>
      </div>

      {mobileSearch && <div className="w-full py-2 lg:hidden">{mobileSearch}</div>}
    </div>
  );
}
