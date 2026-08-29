// app/snippets/Highlight.tsx
import {NavLink} from 'react-router';

export function isOnSaleItem(title: string) {
  return title.trim().toLowerCase() === 'on sale';
}

function StarIcon({className}: {className?: string}) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={className}>
      <path
        d="M6 0L7.854 4.146L12 6L7.854 7.854L6 12L4.146 7.854L0 6L4.146 4.146L6 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HighlightLink({
  to,
  title,
  isActive,
  onMouseEnter,
  onFocus,
}: {
  to: string;
  title: string;
  isActive: boolean;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}) {
  return (
    <NavLink
      end
      prefetch="intent"
      to={to}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      aria-expanded={isActive}
      className="nav-item nav-item--highlight shrink-0 transition"
    >
      {title}
      <StarIcon className="nav-item__star nav-item__star--1" />
      <StarIcon className="nav-item__star nav-item__star--2" />
      <StarIcon className="nav-item__star nav-item__star--3" />
    </NavLink>
  );
}