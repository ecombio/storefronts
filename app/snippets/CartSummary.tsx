import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/sections/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useId, useState} from 'react';
import {useFetcher} from 'react-router';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

export function CartSummary({cart, layout}: CartSummaryProps) {
  const isAside = layout === 'aside';
  const className = isAside ? 'cart-summary-aside' : 'cart-summary-page';
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();

  return (
    <div aria-labelledby={summaryId} className={className}>
      {isAside ? (
        <div className="cart-subtotal-row">
          <span id={summaryId} className="cart-subtotal-label">
            Subtotal:
          </span>
          <span className="cart-subtotal-value">
            {cart?.cost?.subtotalAmount?.amount ? (
              <Money data={cart?.cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </span>
        </div>
      ) : (
        <>
          <h4 id={summaryId}>Totals</h4>
          <dl role="group" className="cart-subtotal">
            <dt>Subtotal</dt>
            <dd>
              {cart?.cost?.subtotalAmount?.amount ? (
                <Money data={cart?.cost?.subtotalAmount} />
              ) : (
                '-'
              )}
            </dd>
          </dl>
        </>
      )}

      {isAside && (
        <p className="cart-tax-note">
          Tax included. <a href="/policies/shipping">Shipping</a> calculated
          at checkout.
        </p>
      )}

      {/* Discount codes remain available on the full cart page. They're
          intentionally hidden in the drawer to keep it focused —
          customers can still reach them from /cart before checkout, and
          any discount already applied (including via a ?discount= URL)
          still carries through to checkout either way. */}
      {!isAside && (
        <CartDiscounts
          discountCodes={cart?.discountCodes}
          discountsHeadingId={discountsHeadingId}
          discountCodeInputId={discountCodeInputId}
        />
      )}

      <CartNote note={cart?.note} isAside={isAside} />

      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} isAside={isAside} />
    </div>
  );
}

/**
 * A toggleable note field. Collapsed to a text link by default; clicking
 * it reveals a textarea that submits via CartForm's NoteUpdate action,
 * matching the same fetcher pattern used for discounts.
 */
function CartNote({note, isAside}: {note?: string | null; isAside: boolean}) {
  const [isEditing, setIsEditing] = useState(Boolean(note));
  const fetcher = useFetcher({key: 'cart-note-update'});
  const textareaId = useId();

  if (!isEditing) {
    return (
      <button
        type="button"
        className="cart-note-link"
        onClick={() => setIsEditing(true)}
      >
        {note ? 'Edit note' : 'Add a note to your order'}
      </button>
    );
  }

  return (
    <CartForm route="/cart" action={CartForm.ACTIONS.NoteUpdate} fetcherKey="cart-note-update">
      <div className={isAside ? 'cart-note-form-aside' : 'cart-note-form'}>
        <label htmlFor={textareaId} className="sr-only">
          Order note
        </label>
        <textarea
          id={textareaId}
          name="note"
          defaultValue={note ?? ''}
          rows={2}
          placeholder="Add a note to your order"
        />
        <div className="cart-note-actions">
          <button type="submit" disabled={fetcher.state !== 'idle'}>
            Save
          </button>
          <button type="button" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    </CartForm>
  );
}

function CartCheckoutActions({
  checkoutUrl,
  isAside,
}: {
  checkoutUrl?: string;
  isAside: boolean;
}) {
  if (!checkoutUrl) return null;

  return (
    <div className="cart-checkout-actions">
      <a href={checkoutUrl} target="_self" className="cart-checkout-btn">
        {isAside ? 'Check out' : 'Continue to Checkout →'}
      </a>
    </div>
  );
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  discountsHeadingId: string;
  discountCodeInputId: string;
}) {
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <section aria-label="Discounts">
      {/* Have existing discount, display it with a remove option */}
      <dl hidden={!codes.length}>
        <div>
          <dt id={discountsHeadingId}>Discounts</dt>
          <UpdateDiscountForm>
            <div
              className="cart-discount"
              role="group"
              aria-labelledby={discountsHeadingId}
            >
              <code>{codes?.join(', ')}</code>
              &nbsp;
              <button type="submit" aria-label="Remove discount">
                Remove
              </button>
            </div>
          </UpdateDiscountForm>
        </div>
      </dl>

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm discountCodes={codes}>
        <div>
          <label htmlFor={discountCodeInputId} className="sr-only">
            Discount code
          </label>
          <input
            id={discountCodeInputId}
            type="text"
            name="discountCode"
            placeholder="Discount code"
          />
          &nbsp;
          <button type="submit" aria-label="Apply discount code">
            Apply
          </button>
        </div>
      </UpdateDiscountForm>
    </section>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}