// app/sections/CartDrawer.tsx

import {Await} from 'react-router';
import {Suspense} from 'react';
import {Aside} from '~/components/Aside';
import {CartMain} from '~/sections/CartMain';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

/**
 * The cart drawer (slide-out mini-cart). A thin wrapper around the
 * existing `Aside` panel and `CartMain` section — no new cart logic,
 * no new state management. `Aside` already owns open/close state via
 * `AsideProvider`; `CartMain` already owns optimistic cart rendering
 * via `useOptimisticCart`.
 *
 * `cart` is typically a deferred promise from the root loader
 * (standard Hydrogen skeleton pattern) — adjust the `Await`/`Suspense`
 * wrapper below if your root loader resolves it eagerly instead.
 */
export function CartDrawer({
  cart,
}: {
  cart: Promise<CartApiQueryFragment | null> | CartApiQueryFragment | null;
}) {
  return (
    <Aside type="cart" heading="Cart">
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