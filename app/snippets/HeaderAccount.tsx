import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import {User} from 'lucide-react';

/**
 * "Sign in / Register" nav entry — pulled out of the header shell.
 * Icon-only for now; `isLoggedIn` still drives the destination and
 * aria-label ("Account" vs "Sign in/ Register") so the logged-in state
 * stays correct for assistive tech even though no text is visible.
 */
export function HeaderAccount({isLoggedIn}: {isLoggedIn: Promise<boolean>}) {
  return (
    <NavLink
      prefetch="intent"
      to="/account"
      className="flex items-center text-sm font-medium text-gray-800 hover:text-gray-950"
    >
      <Suspense fallback={<AccountIcon label="Sign in/ Register" />}>
        <Await
          resolve={isLoggedIn}
          errorElement={<AccountIcon label="Sign in/ Register" />}
        >
          {(loggedIn) => (
            <AccountIcon label={loggedIn ? 'Account' : 'Sign in/ Register'} />
          )}
        </Await>
      </Suspense>
    </NavLink>
  );
}

function AccountIcon({label}: {label: string}) {
  return <User size={18} aria-label={label} />;
}