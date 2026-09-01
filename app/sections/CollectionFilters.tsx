// app/sections/CollectionFilters.tsx
//
// ⚠️ RECONSTRUCTED STOPGAP — this is NOT the recovered original file.
// The real CollectionFilters.tsx (with its actual search-query syntax,
// sort key mappings, and UI) was deleted and is not in git history.
// This exists only so `collections.all.tsx` compiles and the dev server
// boots. Treat every value below as a guess to be verified/replaced:
//   - SORT_OPTIONS sortKey/reverse values (relevance/price/best-selling/etc.)
//   - the exact Shopify search-query syntax buildSearchQuery emits
//   - the availability semantics ("available_for_sale:true")
// Check VS Code Local History or an editor/OS backup before trusting this.

import {Link, useLocation, useNavigate} from 'react-router';
import type {FormEvent} from 'react';
import {useState} from 'react';

export interface CollectionAllFilters {
  q?: string;
  price_min?: string;
  price_max?: string;
  availability?: string; // 'in_stock' | undefined
  sort?: string;
}

export interface SortOption {
  value: string;
  label: string;
  sortKey: string; // GUESS — verify against ProductSortKeys enum usage intended
  reverse: boolean;
}

export const SORT_OPTIONS: SortOption[] = [
  {value: 'relevance', label: 'Relevance', sortKey: 'RELEVANCE', reverse: false},
  {value: 'best-selling', label: 'Best selling', sortKey: 'BEST_SELLING', reverse: false},
  {value: 'price-asc', label: 'Price: Low to High', sortKey: 'PRICE', reverse: false},
  {value: 'price-desc', label: 'Price: High to Low', sortKey: 'PRICE', reverse: true},
  {value: 'newest', label: 'Newest', sortKey: 'CREATED', reverse: true},
];

export const DEFAULT_SORT = 'relevance';

/**
 * GUESS — parses the flat URL params this route is known to keep
 * (see collections.all.tsx's canonicalUrl keepParams list).
 */
export function parseFilters(url: URL): CollectionAllFilters {
  const params = url.searchParams;
  return {
    q: params.get('q') ?? undefined,
    price_min: params.get('price_min') ?? undefined,
    price_max: params.get('price_max') ?? undefined,
    availability: params.get('availability') ?? undefined,
    sort: params.get('sort') ?? undefined,
  };
}

/**
 * GUESS — builds a Shopify product search-query string from the parsed
 * filters. Verify this against whatever the real implementation did;
 * this is a plausible-but-unverified reconstruction.
 */
export function buildSearchQuery(filters: CollectionAllFilters): string {
  const clauses: string[] = [];

  if (filters.q) {
    clauses.push(filters.q);
  }
  if (filters.price_min) {
    clauses.push(`variants.price:>=${filters.price_min}`);
  }
  if (filters.price_max) {
    clauses.push(`variants.price:<=${filters.price_max}`);
  }
  if (filters.availability === 'in_stock') {
    clauses.push('available_for_sale:true');
  }

  return clauses.join(' AND ');
}

export function CollectionFilters({filters}: {filters: CollectionAllFilters}) {
  return (
    <aside className="collection-filters" aria-label="Filters">
      <div className="collection-filters__scroll">
        <div className="collection-filters__header">
          <h2 className="collection-filters__title">Filters</h2>
        </div>
        <PriceRangeGroup filters={filters} />
        <AvailabilityGroup filters={filters} />
      </div>
    </aside>
  );
}

function PriceRangeGroup({filters}: {filters: CollectionAllFilters}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [min, setMin] = useState(filters.price_min ?? '');
  const [max, setMax] = useState(filters.price_max ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(location.search);
    params.delete('cursor');
    params.delete('direction');
    params.delete('p');
    if (min) params.set('price_min', min); else params.delete('price_min');
    if (max) params.set('price_max', max); else params.delete('price_max');
    navigate(`${location.pathname}?${params.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  }

  return (
    <div className="collection-filters__group">
      <h3 className="collection-filters__group-title">Price</h3>
      <form className="collection-filters__price-range" onSubmit={handleSubmit}>
        <input
          type="number"
          inputMode="decimal"
          placeholder="Min"
          aria-label="Minimum price"
          className="collection-filters__price-input"
          value={min}
          onChange={(event) => setMin(event.target.value)}
        />
        <span aria-hidden="true" className="collection-filters__price-separator">
          &ndash;
        </span>
        <input
          type="number"
          inputMode="decimal"
          placeholder="Max"
          aria-label="Maximum price"
          className="collection-filters__price-input"
          value={max}
          onChange={(event) => setMax(event.target.value)}
        />
        <button type="submit" className="collection-filters__price-submit">
          Go
        </button>
      </form>
    </div>
  );
}

function AvailabilityGroup({filters}: {filters: CollectionAllFilters}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isActive = filters.availability === 'in_stock';

  const newParams = new URLSearchParams(params);
  newParams.delete('cursor');
  newParams.delete('direction');
  newParams.delete('p');
  if (isActive) {
    newParams.delete('availability');
  } else {
    newParams.set('availability', 'in_stock');
  }

  return (
    <div className="collection-filters__group">
      <h3 className="collection-filters__group-title">Availability</h3>
      <ul className="collection-filters__values">
        <li className="collection-filters__value-item">
          <Link
            prefetch="intent"
            preventScrollReset
            replace
            aria-current={isActive ? 'true' : undefined}
            className={
              isActive
                ? 'collection-filters__value collection-filters__value--active'
                : 'collection-filters__value'
            }
            to={`${location.pathname}?${newParams.toString()}`}
          >
            <span className="collection-filters__value-label">In stock</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
