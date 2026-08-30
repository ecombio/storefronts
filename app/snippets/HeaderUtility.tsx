import {NavLink} from 'react-router';
import {UTILITY_LINKS} from '~/config/Header.constants';
import {RegionPicker} from '~/snippets/RegionPicker';

// Maps 1:1 to sections/utility-bar.liquid + snippets/utility-links.liquid.
//
// Currency and language <select> switchers from the Liquid version are
// intentionally omitted here: they work by submitting a {% form %} that
// POSTs and reloads the page against Shopify's classic localization
// endpoint, which doesn't map onto Hydrogen's SPA routing. Wiring the
// real equivalent (a fetcher POST to a resource route that sets the
// locale cookie and redirects) is a separate pass, not a copy of the
// theme's vanilla JS. RegionPicker below is UI-complete but its
// selection callback is a stub for the same reason — see RegionPicker.tsx.
export function HeaderUtility() {
  const links = UTILITY_LINKS.filter((link) => link.label && link.url);

  return (
    <div className="hidden border-b border-gray-100 sm:block">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-8 pt-2.5 pb-2.5 text-sm text-gray-700">
        <nav className="flex items-center" role="list">
          {links.map((link, i) => (
            <NavLink
              key={`${link.label}-${i}`}
              to={link.url}
              className={`flex h-8 items-center px-3.5 hover:text-gray-950 ${i === 0 ? 'pl-0' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <RegionPicker />
      </div>
    </div>
  );
}
