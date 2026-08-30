import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Search, X} from 'lucide-react';
import {COUNTRIES, CURRENT_COUNTRY, CURRENT_LANGUAGE} from '~/config/Header.constants';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function flagUrl(isoCode: string) {
  return `https://cdn.shopify.com/shopifycloud/preview-bar/assets/${isoCode.toLowerCase()}.svg`;
}

// Maps 1:1 to snippets/region-picker.liquid + its slice of utility-bar.js:
// a trigger button plus a dropdown teleported out of the header's stacking
// context (there: appendChild to <body>; here: a React portal) so it never
// gets clipped by header overflow/z-index.
//
// Country/language data comes from Header.constants.ts as a stand-in for
// `localization.available_countries`. selectCountry is a stub — see the
// note in HeaderUtility.tsx on why the real localization POST-and-redirect
// flow needs its own Hydrogen-specific wiring rather than a port of the
// theme's form.submit() calls.
export function RegionPicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<{top: number; left: number} | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 320;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    setPosition({top: rect.bottom + 6, left});
  }

  function openPicker() {
    updatePosition();
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    setQuery('');
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    function onScroll() {
      updatePosition();
    }
    function onResize() {
      updatePosition();
    }
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        closePicker();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closePicker();
        triggerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && dropdownRef.current) {
        const focusable = Array.from(dropdownRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onResize, {passive: true});
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = COUNTRIES.find((c) => c.isoCode === CURRENT_COUNTRY) ?? COUNTRIES[0];
  const results = COUNTRIES.filter(
    (c) => c.isoCode !== current.isoCode && c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function selectCountry(isoCode: string) {
    // TODO: wire to Hydrogen localization — fetcher POST to a resource
    // route that sets the locale cookie and redirects, matching the
    // Liquid theme's country-select form.
    console.log('select country', isoCode);
    closePicker();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-label={`Choose location: ${current.name}`}
        onClick={() => (open ? closePicker() : openPicker())}
        className="flex h-8 items-center gap-1.5 pl-2.5 text-gray-700 hover:text-gray-950"
      >
        <img src={flagUrl(current.isoCode)} alt="" width={16} height={11} className="rounded-[2px]" />
        <span className="whitespace-nowrap">
          {CURRENT_LANGUAGE} ({current.isoCode})
        </span>
        <ChevronDown open={open} />
      </button>

      {mounted &&
        open &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose location"
            style={{top: position.top, left: position.left}}
            className="fixed z-[2147483647] w-80 rounded-lg border border-gray-200 bg-white p-5 pb-2 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-gray-900">Choose location</p>
              <button
                aria-label="Close location picker"
                onClick={() => {
                  closePicker();
                  triggerRef.current?.focus();
                }}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={14} />
              </button>
            </div>

            <p className="mb-3.5 text-xs leading-relaxed text-gray-500">
              Changing your location might affect your delivery address options, price, product
              availability, and currency.
            </p>

            <div className="relative mb-4">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your country"
                aria-label="Search countries"
                autoComplete="off"
                className="h-[38px] w-full rounded-md border border-gray-200 bg-gray-50 pl-3 pr-9 text-sm text-gray-900 outline-none focus:border-gray-900 focus:bg-white"
              />
              <Search
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
              Current country &amp; language
            </p>

            <div className="mb-3 flex items-center gap-2.5">
              <img src={flagUrl(current.isoCode)} alt="" width={20} height={14} className="rounded-[2px]" />
              <span className="flex-1 text-sm font-semibold text-gray-900">{current.name}</span>
              <span className="text-[11.5px] text-gray-500">
                {CURRENT_LANGUAGE} ({current.isoCode})
              </span>
            </div>

            <div className="mb-3 h-px bg-gray-100" />

            <ul role="list" className="max-h-60 space-y-0.5 overflow-y-auto">
              {results.map((country) => (
                <li key={country.isoCode}>
                  <button
                    type="button"
                    onClick={() => selectCountry(country.isoCode)}
                    className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-2 text-left hover:bg-gray-100"
                  >
                    <img
                      src={flagUrl(country.isoCode)}
                      alt=""
                      width={20}
                      height={14}
                      className="rounded-[2px]"
                    />
                    <span className="flex-1 text-sm text-gray-900">{country.name}</span>
                    <span className="whitespace-nowrap text-[11.5px] text-gray-500">
                      {CURRENT_LANGUAGE} ({country.isoCode})
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="py-3 text-center text-sm text-gray-500">No countries found.</li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

function ChevronDown({open}: {open: boolean}) {
  return (
    <svg
      width={9}
      height={9}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}
