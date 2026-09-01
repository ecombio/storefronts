// app/sections/header-styles/types.ts
//
// Every HeaderLayout* component implements this exact same prop
// contract. They only ever change ARRANGEMENT (flex direction, row
// breaks, spacing, borders) — never re-implement what's inside each
// slot. That's what lets you add a new style without risking the
// kind of prop-mismatch bugs (algolia vs collectionImages, etc.)
// that come from re-wiring search/menu/cart logic per-style.

import type {ReactNode} from 'react';

export interface HeaderLayoutProps {
  /** Store wordmark/logo, already wrapped in its NavLink to "/". */
  logo: ReactNode;
  /** Desktop primary nav (<HeaderMenu viewport="desktop" .../>). */
  menu: ReactNode;
  /** Search input — layouts choose whether to render it at all. */
  search: ReactNode;
  /** Account / wishlist / compare / cart cluster (<HeaderCtas .../>). */
  ctas: ReactNode;
  /** Hamburger button that opens the mobile drawer. */
  mobileToggle: ReactNode;
  /** Full-width mobile search row — most layouts render this below
   *  everything else, hidden at lg+. Optional since a layout could
   *  choose to fold search into the mobile toggle row instead. */
  mobileSearch?: ReactNode;
}