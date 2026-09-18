// app/components/FilterSort.tsx
import {useState} from 'react';
// If your project predates Hydrogen's React Router migration, change this
// import to: import {Link, useLocation, useSearchParams} from '@remix-run/react';
import {Link, useLocation, useSearchParams} from 'react-router';
import type {Filter} from '~/lib/filters';
import {
  SORT_OPTIONS,
  clearAllFilters,
  getAppliedFilterInputs,
  toggleFilterParams,
  type SortParam,
} from '~/lib/filters';

export function FilterSort({filters}: {filters: Filter[]}) {
  const [open, setOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const appliedFilterInputs = getAppliedFilterInputs(searchParams);
  const hasPriceFilter = Boolean(
    searchParams.get('price.min') || searchParams.get('price.max'),
  );
  const activeSort = (searchParams.get('sort') as SortParam) || 'relevance';
  const activeCount =
    appliedFilterInputs.length + (hasPriceFilter ? 1 : 0) +
    (activeSort !== 'relevance' ? 1 : 0);

  function linkTo(params: URLSearchParams) {
    const qs = params.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-xs font-bold tracking-wide text-neutral-900"
      >
        Filter &amp; Sort
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <span className="w-12" aria-hidden="true" />
              <h2 className="text-xs font-extrabold tracking-widest text-neutral-900">
                FILTER &amp; SORT
              </h2>
              <Link
                to={linkTo(clearAllFilters(searchParams))}
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-neutral-500"
              >
                Clear All
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* SORT */}
              <details className="border-b border-neutral-200 px-5 py-4" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-extrabold tracking-widest text-neutral-900">
                  <span className="flex items-baseline gap-2">
                    SORT BY
                    {activeSort !== 'relevance' && (
                      <span className="text-xs font-medium tracking-normal text-neutral-500">
                        {SORT_OPTIONS.find((o) => o.value === activeSort)?.label}
                      </span>
                    )}
                  </span>
                </summary>
                <div className="mt-3 space-y-1">
                  {SORT_OPTIONS.map((option) => {
                    const next = new URLSearchParams(searchParams);
                    next.set('sort', option.value);
                    next.delete('cursor');
                    next.delete('direction');
                    const isActive = activeSort === option.value;
                    return (
                      <Link
                        key={option.value}
                        to={linkTo(next)}
                        preventScrollReset
                        replace
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 py-2 text-sm text-neutral-900"
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                            isActive ? 'border-black' : 'border-neutral-300'
                          }`}
                        >
                          {isActive && (
                            <span className="h-2.5 w-2.5 rounded-full bg-black" />
                          )}
                        </span>
                        {option.label}
                      </Link>
                    );
                  })}
                </div>
              </details>

              {/* DYNAMIC FILTER GROUPS FROM SHOPIFY */}
              {filters.map((filter) => (
                <details
                  key={filter.id}
                  className="border-b border-neutral-200 px-5 py-4"
                >
                  <summary className="cursor-pointer list-none text-xs font-extrabold tracking-widest text-neutral-900">
                    {filter.label.toUpperCase()}
                  </summary>
                  <div className="mt-3 space-y-1">
                    {filter.type === 'PRICE_RANGE' ? (
                      <PriceFilterFields
                        filter={filter}
                        searchParams={searchParams}
                      />
                    ) : (
                      filter.values.map((value) => {
                        const checked = appliedFilterInputs.includes(
                          value.input,
                        );
                        const next = toggleFilterParams(
                          searchParams,
                          value.input,
                        );
                        return (
                          <Link
                            key={value.id}
                            to={linkTo(next)}
                            preventScrollReset
                            replace
                            className="flex items-center justify-between gap-3 py-2 text-sm text-neutral-900"
                          >
                            <span className="flex items-center gap-3">
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold text-white ${
                                  checked
                                    ? 'border-black bg-black'
                                    : 'border-neutral-300'
                                }`}
                              >
                                {checked && '✓'}
                              </span>
                              {value.label}
                            </span>
                            <span className="text-xs text-neutral-400">
                              {value.count}
                            </span>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </details>
              ))}
            </div>

            <div className="border-t border-neutral-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-full bg-black py-3 text-sm font-bold tracking-wide text-white"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Price is a free-typed numeric range, not a fixed value from a list,
 * so unlike every other filter above it submits as a real GET form
 * rather than a single toggled Link. Works with JS disabled too.
 */
function PriceFilterFields({
  filter,
  searchParams,
}: {
  filter: Filter;
  searchParams: URLSearchParams;
}) {
  let suggestedMin = 0;
  let suggestedMax = 0;
  try {
    const parsed = JSON.parse(filter.values[0]?.input ?? '{}');
    suggestedMin = parsed?.price?.min ?? 0;
    suggestedMax = parsed?.price?.max ?? 0;
  } catch {
    // ignore
  }

  const otherParams = Array.from(searchParams.entries()).filter(
    ([key]) => key !== 'price.min' && key !== 'price.max',
  );

  return (
    <form method="get" className="flex items-center gap-2">
      {otherParams.map(([key, value]) => (
        <input key={`${key}=${value}`} type="hidden" name={key} value={value} />
      ))}
      <input
        type="number"
        name="price.min"
        defaultValue={searchParams.get('price.min') ?? ''}
        placeholder={`$${suggestedMin}`}
        className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
      />
      <span className="text-neutral-400">to</span>
      <input
        type="number"
        name="price.max"
        defaultValue={searchParams.get('price.max') ?? ''}
        placeholder={`$${suggestedMax}`}
        className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-neutral-900 px-3 py-2 text-xs font-bold text-white"
      >
        Go
      </button>
    </form>
  );
}
