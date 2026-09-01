// app/sections/CartDrawer.tsx

import {Await} from 'react-router';
import {Suspense} from 'react';
import {Aside} from '~/components/Aside';
import {CartMain} from '~/sections/CartMain';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

type CartLike =
  | Promise<CartApiQueryFragment | null>
  | CartApiQueryFragment
  | null;

/**
 * The cart drawer (slide-out mini-cart). A thin wrapper around the
 * existing `Aside` panel and `CartMain` section — no new cart logic,
 * no new state management. `Aside` already owns open/close state via
 * `AsideProvider`; `CartMain` already owns optimistic cart rendering
 * via `useOptimisticCart`.
 *
 * The live "Shopping cart (N)" heading is passed straight into
 * `Aside`'s existing `heading` prop rather than rendered as a second
 * header inside `CartMain`. `Aside` only renders one `<h3>` + one
 * close button, and that `<h3>` is what the dialog's
 * `aria-labelledby` points to — duplicating it would either show two
 * close buttons or require hiding the original via CSS, which strips
 * the dialog's accessible name for screen readers.
 */
export function CartDrawer({cart}: {cart: CartLike}) {
  return (
    <Aside type="cart" heading={<CartAsideHeading cart={cart} />}>
      {isPromise(cart) ? (
        <Suspense fallback={<CartLoading />}>
          <Await resolve={cart}>
            {(resolvedCart) => (
              <CartMain layout="aside" cart={resolvedCart} />
            )}
          </Await>
        </Suspense>
      ) : (
        <CartMain layout="aside" cart={cart} />
      )}
    </Aside>
  );
}

/** Renders inside Aside's own <h3> — swaps text once the cart resolves. */
function CartAsideHeading({cart}: {cart: CartLike}) {
  if (!isPromise(cart)) {
    return <>Shopping cart ({cart?.totalQuantity ?? 0})</>;
  }
  return (
    <Suspense fallback={<>Cart</>}>
      <Await resolve={cart}>
        {(resolvedCart) => (
          <>Shopping cart ({resolvedCart?.totalQuantity ?? 0})</>
        )}
      </Await>
    </Suspense>
  );
}

function CartLoading() {
  return <p aria-live="polite">Loading cart…</p>;
}

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Promise<T>).then === 'function'
  );
}