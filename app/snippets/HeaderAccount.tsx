import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import {User} from 'lucide-react';

/**
 * "Sign in / Register" nav entry — pulled out of the header shell.
 *
 * Now renders VISIBLE text next to the icon (not just an aria-label on
 * an icon-only button), and personalizes that text with the customer's
 * first name once they're logged in — e.g. "Hi, Jordan" instead of a
 * bare "Account".
 *
 * `customer` is optional. If the caller doesn't pass it, this falls
 * back to a generic "Account" label when logged in rather than
 * breaking or showing nothing.
 *
 * WIRING NOTE (needs one more step to fully personalize): `customer`
 * has to come from wherever this app already fetches customer data —
 * e.g. Shopify's Customer Account API (`customer.firstName`) queried
 * alongside the existing `isLoggedIn` check in whatever loader
 * produces it (commonly root.tsx). If nothing currently fetches the
 * customer's name, add a deferred query there returning at least
 * `{firstName: string | null}`, and pass it down through HeaderProps
 * the same way `isLoggedIn` and `cart` are already threaded through
 * Header → HeaderCtas → HeaderAccount. Until that's wired up, this
 * component still works — it just shows "Account" instead of a name.
 */
export function HeaderAccount({
  isLoggedIn,
  customer,
}: {
  isLoggedIn: Promise<boolean>;
  /**
   * Resolves to the logged-in customer's display-name info, or `null`
   * if signed out. Leave unset until a name source is wired up
   * upstream — see WIRING NOTE above.
   */
  customer?: Promise<{firstName: string | null} | null>;
}) {
  return (
    <NavLink
      prefetch="intent"
      to="/account"
      className="flex items-center gap-1.5 text-sm font-medium text-gray-800 hover:text-gray-950"
    >
      <Suspense fallback={<AccountContent label="Sign in/ Register" />}>
        <Await
          resolve={isLoggedIn}
          errorElement={<AccountContent label="Sign in/ Register" />}
        >
          {(loggedIn) => {
            if (!loggedIn) {
              return <AccountContent label="Sign in/ Register" />;
            }
            if (!customer) {
              return <AccountContent label="Account" />;
            }
            return (
              <Suspense fallback={<AccountContent label="Account" />}>
                <Await
                  resolve={customer}
                  errorElement={<AccountContent label="Account" />}
                >
                  {(customerData) => (
                    <AccountContent
                      label={
                        customerData?.firstName
                          ? `Hi, ${customerData.firstName}`
                          : 'Account'
                      }
                    />
                  )}
                </Await>
              </Suspense>
            );
          }}
        </Await>
      </Suspense>
    </NavLink>
  );
}

function AccountContent({label}: {label: string}) {
  return (
    <>
      <User size={18} aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
    </>
  );
}