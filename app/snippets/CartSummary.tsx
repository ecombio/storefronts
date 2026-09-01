import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/sections/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useId, useState} from 'react';
import {useFetcher} from 'react-router';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

// TODO: replace with the real gift-wrapping product variant GID
// (Settings > Products, or `shopify product list` in the CLI).
// Until this is a real variant ID, the checkbox will submit but
// Shopify will reject the LinesAdd with a "variant not found" error.
const GIFT_WRAP_VARIANT_ID = 'gid://shopify/ProductVariant/REPLACE_ME';

export function CartSummary({cart, layout}: CartSummaryProps) {
  const isAside = layout === 'aside';
  const className = isAside ? 'cart-summary-aside' : 'cart-summary-page';
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const savings = getTotalSavings(cart);

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

      {savings && (
        <p className="cart-savings">
          You&rsquo;re saving <Money data={savings} />
        </p>
      )}

      {isAside && (
        <p className="cart-tax-note">
          Tax included. <a href="/policies/shipping">Shipping</a> calculated
          at checkout.
        </p>
      )}

      <p className="cart-shipping-time">Ships within 2-3 business days</p>

      <p className="cart-urgency-note">
        Items in your cart aren&rsquo;t reserved — complete checkout soon.
      </p>

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

      <CartGiftWrap cart={cart} />

      <CartNote note={cart?.note} isAside={isAside} />

      <CartTrustSignals />

      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} isAside={isAside} />
    </div>
  );
}

/**
 * Sums per-line savings from compareAtAmountPerQuantity vs amountPerQuantity.
 *
 * REQUIRES: your cart line GraphQL fragment (likely app/lib/fragments.ts)
 * to select these fields on each line's `cost`:
 *
 *   cost {
 *     amountPerQuantity { amount currencyCode }
 *     compareAtAmountPerQuantity { amount currencyCode }
 *     subtotalAmount { amount currencyCode }
 *     totalAmount { amount currencyCode }
 *   }
 *
 * If `compareAtAmountPerQuantity` isn't in the fragment yet, this
 * silently returns null and the savings line just won't render —
 * nothing will break, but add the field above to turn it on.
 */
function getTotalSavings(cart: OptimisticCart<CartApiQueryFragment | null>) {
  const lines = cart?.lines?.nodes ?? [];
  let total = 0;
  let currencyCode: string | null = null;

  for (const line of lines) {
    const cost = line?.cost as
      | {
          amountPerQuantity?: {amount: string; currencyCode: string};
          compareAtAmountPerQuantity?: {amount: string; currencyCode: string};
        }
      | undefined;
    const compareAt = cost?.compareAtAmountPerQuantity;
    const amount = cost?.amountPerQuantity;
    if (!compareAt?.amount || !amount?.amount) continue;

    const diff = (Number(compareAt.amount) - Number(amount.amount)) * line.quantity;
    if (diff > 0) {
      total += diff;
      currencyCode = compareAt.currencyCode;
    }
  }

  return total > 0 && currencyCode
    ? {amount: total.toFixed(2), currencyCode}
    : null;
}

/**
 * Gift wrapping toggle. Adds/removes a single line for a fixed
 * gift-wrap product variant. Needs GIFT_WRAP_VARIANT_ID above set to
 * a real variant GID before this will work end to end.
 */
function CartGiftWrap({
  cart,
}: {
  cart: OptimisticCart<CartApiQueryFragment | null>;
}) {
  const fetcher = useFetcher({key: 'cart-gift-wrap'});
  const giftWrapLine = cart?.lines?.nodes?.find(
    (line) => line.merchandise?.id === GIFT_WRAP_VARIANT_ID,
  );
  const checked = Boolean(giftWrapLine);
  const checkboxId = useId();

  return (
    <CartForm
      route="/cart"
      fetcherKey="cart-gift-wrap"
      action={checked ? CartForm.ACTIONS.LinesRemove : CartForm.ACTIONS.LinesAdd}
      inputs={
        checked
          ? {lineIds: [giftWrapLine!.id]}
          : {lines: [{merchandiseId: GIFT_WRAP_VARIANT_ID, quantity: 1}]}
      }
    >
      <div className="cart-gift-wrap">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={fetcher.state !== 'idle'}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        <label htmlFor={checkboxId}>Add gift wrapping</label>
      </div>
    </CartForm>
  );
}

/** Small reassurance row shown just above the checkout button. */
function CartTrustSignals() {
  return (
    <ul className="cart-trust-signals">
      <li>Secure checkout</li>
      <li>Free returns within 30 days</li>
    </ul>
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