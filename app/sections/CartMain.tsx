import {useOptimisticCart} from '@shopify/hydrogen';
import {Money} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/snippets/CartLineItem';
import {CartSummary} from '~/snippets/CartSummary';
import {CartRecommendations} from '~/snippets/CartRecommendations';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

const FREE_SHIPPING_THRESHOLD = 250;

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};
/** Returns a map of all line items and their children. */
function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const lineChildren = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(lineChildren)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}

/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog. The
 * aside's heading (with live item count) is rendered by CartDrawer via
 * Aside's own header — not duplicated here.
 */
export function CartMain({layout, cart: originalCart}: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const withDiscount =
    cart &&
    Boolean(cart?.discountCodes?.filter((code) => code.applicable)?.length);
  const className = `cart-main ${withDiscount ? 'with-discount' : ''}`;
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  // Most-recently-added top-level line drives "You may like" — cart
  // lines are appended in order, so the last one is a reasonable proxy
  // for "what did they just add."
  const topLevelLines = (cart?.lines?.nodes ?? []).filter(
    (line) =>
      !('parentRelationship' in line && line.parentRelationship?.parent),
  );
  const mostRecentProductId =
    topLevelLines[topLevelLines.length - 1]?.merchandise?.product?.id ?? null;

  return (
    <section
      className={className}
      aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'}
    >
      <CartEmpty hidden={linesCount} layout={layout} />

      <div className="cart-details">
        {layout === 'aside' && cartHasItems && (
          <ShippingProgress cart={cart} />
        )}

        <p id="cart-lines" className="sr-only">
          Line items
        </p>
        <div className="cart-lines-scroll">
          <ul aria-labelledby="cart-lines">
            {(cart?.lines?.nodes ?? []).map((line) => {
              // we do not render non-parent lines at the root of the cart
              if (
                'parentRelationship' in line &&
                line.parentRelationship?.parent
              ) {
                return null;
              }
              return (
                <CartLineItem
                  key={line.id}
                  line={line}
                  layout={layout}
                  childrenMap={childrenMap}
                />
              );
            })}
          </ul>

          {layout === 'aside' && cartHasItems && (
            <CartRecommendations productId={mostRecentProductId} />
          )}
        </div>

        {cartHasItems && <CartSummary cart={cart} layout={layout} />}
      </div>
    </section>
  );
}

function ShippingProgress({
  cart,
}: {
  cart: ReturnType<typeof useOptimisticCart>;
}) {
  const subtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const currencyCode = cart?.cost?.subtotalAmount?.currencyCode ?? 'USD';
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  const percent = Math.min(
    100,
    Math.max(0, (subtotal / FREE_SHIPPING_THRESHOLD) * 100),
  );
  const qualifies = remaining <= 0;

  return (
    <div className="cart-shipping-progress">
      <div className="cart-shipping-track">
        <div className="cart-shipping-fill" style={{width: `${percent}%`}} />
      </div>
      <p className="cart-shipping-text">
        {qualifies ? (
          "You've unlocked free shipping!"
        ) : (
          <>
            You&rsquo;re{' '}
            <Money data={{amount: remaining.toFixed(2), currencyCode}} /> away
            from free shipping
          </>
        )}
      </p>
    </div>
  );
}

function CartEmpty({
  hidden = false,
}: {
  hidden: boolean;
  layout?: CartMainProps['layout'];
}) {
  const {close} = useAside();
  return (
    <div className="cart-empty" hidden={hidden}>
      <br />
      <p>
        Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
        started!
      </p>
      <br />
      <Link to="/collections" onClick={close} prefetch="viewport">
        Continue shopping →
      </Link>
    </div>
  );
}