// app/sections/CollectionFilters.tsx

import {useState} from 'react';
import type {FormEvent} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import type {Filter} from '@shopify/hydrogen/storefront-api-types';

const FILTER_URL_PARAM_NAME = 'filter';

interface CollectionFiltersProps {
  filters: Filter[];
}

export function CollectionFilters({filters}: CollectionFiltersProps) {
  if (!filters?.length) {
    return null;
  }

  return (
    <aside id="collection-filters" className="collection-filters" aria-label="Filters">
      <div className="collection-filters__scroll">
        <div className="collection-filters__header">
          <h2 className="collection-filters__title">Filters</h2>
          <ClearFiltersLink />
        </div>
        {filters.map((filter) =>
          filter.type === 'PRICE_RANGE' ? (
            <PriceRangeFilterGroup key={filter.id} filter={filter} />
          ) : (
            <FilterGroup key={filter.id} filter={filter} />
          ),
        )}
      </div>
    </aside>
  );
}

/**
 * A single facet group (Availability, Category, Brand, Type, etc.) rendered
 * as a collapsible list of rows, one per filter value. Selecting a row
 * inverts it to solid black/white rather than checking a box.
 */
function FilterGroup({filter}: {filter: Filter}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="collection-filters__group">
      <button
        type="button"
        className="collection-filters__group-header"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <h3 className="collection-filters__group-title">{filter.label}</h3>
        <span
          aria-hidden="true"
          className={
            isOpen
              ? 'collection-filters__toggle-icon collection-filters__toggle-icon--open'
              : 'collection-filters__toggle-icon'
          }
        />
      </button>
      {isOpen && (
        <ul className="collection-filters__values">
          {filter.values.map((value) => (
            <li key={value.id} className="collection-filters__value-item">
              <FilterRow
                filterInput={value.input as string}
                label={value.label}
                count={value.count}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterRow({
  filterInput,
  label,
  count,
}: {
  filterInput: string;
  label: string;
  count: number;
}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isActive = params.getAll(FILTER_URL_PARAM_NAME).includes(filterInput);
  const newParams = toggleFilterParam(filterInput, params);

  return (
    <Link
      prefetch="intent"
      preventScrollReset
      replace
      className={
        isActive
          ? 'collection-filters__value collection-filters__value--active'
          : 'collection-filters__value'
      }
      aria-current={isActive ? 'true' : undefined}
      to={`${location.pathname}?${newParams.toString()}`}
    >
      <span className="collection-filters__value-label">{label}</span>
      <span className="collection-filters__value-count">{count}</span>
    </Link>
  );
}

/**
 * PRICE_RANGE filters don't have a fixed set of values like other filter
 * types do — they need a min/max input instead of a row list.
 */
function PriceRangeFilterGroup({filter}: {filter: Filter}) {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const existingPriceFilter = getExistingPriceFilter(params);

  const [min, setMin] = useState(existingPriceFilter?.price?.min?.toString() ?? '');
  const [max, setMax] = useState(existingPriceFilter?.price?.max?.toString() ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newParams = new URLSearchParams(params);
    const nonPriceFilters = newParams
      .getAll(FILTER_URL_PARAM_NAME)
      .filter((rawFilter) => !isPriceFilter(rawFilter));
    newParams.delete(FILTER_URL_PARAM_NAME);
    nonPriceFilters.forEach((rawFilter) => newParams.append(FILTER_URL_PARAM_NAME, rawFilter));

    if (min || max) {
      const price: {min?: number; max?: number} = {};
      if (min) price.min = Number(min);
      if (max) price.max = Number(max);
      newParams.append(FILTER_URL_PARAM_NAME, JSON.stringify({price}));
    }

    navigate(`${location.pathname}?${newParams.toString()}`, {
      preventScrollReset: true,
      replace: true,
    });
  }

  return (
    <div className="collection-filters__group">
      <button
        type="button"
        className="collection-filters__group-header"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <h3 className="collection-filters__group-title">{filter.label}</h3>
        <span
          aria-hidden="true"
          className={
            isOpen
              ? 'collection-filters__toggle-icon collection-filters__toggle-icon--open'
              : 'collection-filters__toggle-icon'
          }
        />
      </button>
      {isOpen && (
        <form className="collection-filters__price-range" onSubmit={handleSubmit}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Min"
            aria-label={`Minimum ${filter.label}`}
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
            aria-label={`Maximum ${filter.label}`}
            className="collection-filters__price-input"
            value={max}
            onChange={(event) => setMax(event.target.value)}
          />
          <button type="submit" className="collection-filters__price-submit">
            Go
          </button>
        </form>
      )}
    </div>
  );
}

function ClearFiltersLink() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hasActiveFilters = params.getAll(FILTER_URL_PARAM_NAME).length > 0;

  if (!hasActiveFilters) {
    return null;
  }

  const newParams = new URLSearchParams(params);
  newParams.delete(FILTER_URL_PARAM_NAME);

  return (
    <Link
      prefetch="intent"
      preventScrollReset
      replace
      className="collection-filters__clear"
      to={`${location.pathname}?${newParams.toString()}`}
    >
      Clear all
    </Link>
  );
}

/**
 * Toggles a single filter input in/out of the existing `filter` params,
 * leaving all other params (pagination cursors, other filters, etc.)
 * untouched.
 */
function toggleFilterParam(filterInput: string, params: URLSearchParams) {
  const newParams = new URLSearchParams(params);
  const currentFilters = newParams.getAll(FILTER_URL_PARAM_NAME);

  newParams.delete(FILTER_URL_PARAM_NAME);

  if (currentFilters.includes(filterInput)) {
    currentFilters
      .filter((existing) => existing !== filterInput)
      .forEach((existing) => newParams.append(FILTER_URL_PARAM_NAME, existing));
  } else {
    currentFilters.forEach((existing) => newParams.append(FILTER_URL_PARAM_NAME, existing));
    newParams.append(FILTER_URL_PARAM_NAME, filterInput);
  }

  return newParams;
}

function isPriceFilter(rawFilter: string): boolean {
  try {
    return Boolean(JSON.parse(rawFilter)?.price);
  } catch {
    return false;
  }
}

function getExistingPriceFilter(
  params: URLSearchParams,
): {price?: {min?: number; max?: number}} | undefined {
  return params
    .getAll(FILTER_URL_PARAM_NAME)
    .map((rawFilter) => {
      try {
        return JSON.parse(rawFilter);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed?.price);
}