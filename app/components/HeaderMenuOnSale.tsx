import {NavLink} from 'react-router';

// className is actually used (previously accepted but never passed in),
// so the `.star` / `.star-1..3` classes from the highlight CSS can
// position and color each icon instead of it inheriting whatever color
// happens to be active on the parent.
function StarIcon({className}: {className?: string}) {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" className={className}>
      <path
        d="M6 0L7.854 4.146L12 6L7.854 7.854L6 12L4.146 7.854L0 6L4.146 4.146L6 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * "On Sale" entry in the desktop nav bar. This is the live version
 * wired into HeaderMenu, with the three-star highlight effect driven by
 * the `menu-bar__link--highlight` / `menu-item__star` classes in
 * app/styles/menu.css. Distinct from `OnSale.tsx`, which is a simpler
 * standalone reserve component kept on the side and currently unused —
 * this one is not a replacement for that, just the extracted version of
 * what was previously inline here.
 */
export function HeaderMenuOnSale() {
  return (
    <NavLink
      to="/collections"
      className="menu-bar__link--highlight flex items-center gap-1 text-red-600 hover:text-red-700"
    >
      On Sale
      <StarIcon className="menu-item__star menu-item__star--1" />
      <StarIcon className="menu-item__star menu-item__star--2" />
      <StarIcon className="menu-item__star menu-item__star--3" />
    </NavLink>
  );
}