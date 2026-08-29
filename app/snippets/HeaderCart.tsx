import {Link} from 'react-router';
import {ShoppingBag} from 'lucide-react';

/**
 * "Cart" nav entry — pulled out of the header shell. Icon-only for now.
 * Takes `count` and an optional `onClick` as props rather than owning
 * cart state or aside/analytics behavior itself: the parent header
 * (which already has useAside/useAnalytics in scope) decides whether
 * a click opens the cart aside or just navigates to /cart.
 */
export function HeaderCart({
  count = 0,
  onClick,
}: {
  count?: number;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      to="/cart"
      onClick={onClick}
      className="group relative flex items-center text-sm font-medium text-gray-900 transition hover:text-gray-600"
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <span className="relative">
        <ShoppingBag size={17} className="shrink-0" aria-hidden="true" />
        <span
          className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-semibold leading-none text-white"
          aria-hidden="true"
        >
          {count}
        </span>
      </span>
    </Link>
  );
}