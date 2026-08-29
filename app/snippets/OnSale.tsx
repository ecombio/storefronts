import {Link, NavLink} from 'react-router';
import {Sparkles} from 'lucide-react';

// Temporary: On Sale nav entry is hidden for now. Flip back to `true`
// (or just remove this flag) to bring it back — no other changes needed.
const SHOW_ON_SALE = false;

/**
 * "On Sale" nav entry — pulled out of the header shell into its own
 * component so it can be repositioned, hidden, or A/B tested
 * independently of the rest of the primary nav.
 */
export function OnSale() {
  if (!SHOW_ON_SALE) return null;

  return (
    <Link
      to="/collections/sale"
      className="group flex items-center gap-1 text-sm font-semibold text-red-600 transition hover:text-red-700"
    >
      On Sale
      <Sparkles size={13} className="shrink-0" aria-hidden="true" />
    </Link>
  );
}

// --- Reserved alternative: star-highlight version -------------------
//
// This mirrors the "On Sale" treatment that's actually live in
// HeaderMenu.tsx (see HeaderMenuOnSale.tsx) — a NavLink to /collections
// with three small stars driven by the `menu-bar__link--highlight` /
// `menu-item__star` classes in app/styles/menu.css, instead of a single
// lucide Sparkles icon. Kept here as a second reserved option in case
// this component (rather than the Sparkles version above) is ever
// wanted somewhere outside HeaderMenu. Also gated by SHOW_ON_SALE, and
// also not currently used anywhere.

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

export function OnSaleWithStars() {
  if (!SHOW_ON_SALE) return null;

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