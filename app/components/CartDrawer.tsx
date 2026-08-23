import {useEffect, useRef} from 'react';
import {useOptimisticCart, Money, CartForm} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLine} from '~/components/CartLineItem';

/**
 * CartDrawer
 * ----------
 * Accessible slide-out cart drawer: dialog semantics + focus trap,
 * free-shipping progress bar, line items (bundle-aware), and a
 * sticky checkout footer.
 *
 * This is self-contained (doesn't depend on Aside.tsx / CartLineItem.tsx /
 * CartSummary.tsx, since I don't have those files) — swap the bodies of
 * <CartLine /> and the footer for your existing components if you'd
 * rather reuse them; the dialog shell, focus handling, and progress bar
 * are the parts most worth keeping as-is.
 *
 * Usage:
 *   <CartDrawer cart={cart} open={open} onClose={() => setOpen(false)} />
 */

const FREE_SHIPPING_THRESHOLD = 75; // TODO: pull from a config/metafield instead of hardcoding

export type CartDrawerProps = {
  cart: CartApiQueryFragment | null;
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({cart: originalCart, open, onClose}: CartDrawerProps) {
  const cart = useOptimisticCart(originalCart);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const lines = (cart?.lines?.nodes ?? []) as CartLine[];
  const topLevelLines = lines.filter(
    (line) => !('parentRelationship' in line && line.parentRelationship?.parent),
  );
  const hasItems = Boolean(cart?.totalQuantity && cart.totalQuantity > 0);

  const subtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  // Remember what had focus before opening, so we can restore it on close.
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'Tab') {
        trapFocus(event, panelRef.current);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="cart-drawer-backdrop" onMouseDown={onClose} aria-hidden={false}>
      <div
        ref={panelRef}
        className="cart-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="cart-drawer-header">
          <h2>Cart {hasItems ? `(${cart?.totalQuantity})` : ''}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close cart"
            onClick={onClose}
            className="cart-drawer-close"
          >
            ×
          </button>
        </header>

        {hasItems && (
          <div className="cart-drawer-shipping-progress" aria-live="polite">
            <div className="cart-drawer-shipping-row">
              <span>
                {remaining > 0 ? (
                  <>
                    <Money data={{amount: String(remaining), currencyCode: cart?.cost?.subtotalAmount?.currencyCode ?? 'USD'}} /> away from free shipping
                  </>
                ) : (
                  "You've unlocked free shipping"
                )}
              </span>
              <span className="cart-drawer-shipping-pct">{progressPct}%</span>
            </div>
            <div className="cart-drawer-progress-track">
              <div
                className="cart-drawer-progress-fill"
                style={{width: `${progressPct}%`}}
              />
            </div>
          </div>
        )}

        <div className="cart-drawer-body">
          {!hasItems ? (
            <CartDrawerEmpty onClose={onClose} />
          ) : (
            <ul className="cart-drawer-lines" aria-label="Cart line items">
              {topLevelLines.map((line) => (
                <CartDrawerLine key={line.id} line={line} lines={lines} />
              ))}
            </ul>
          )}
        </div>

        {hasItems && cart && (
          <footer className="cart-drawer-footer">
            <div className="cart-drawer-subtotal-row">
              <span>Subtotal</span>
              <Money data={cart.cost.subtotalAmount} />
            </div>
            <a
              href={cart.checkoutUrl ?? '#'}
              className="cart-drawer-checkout-btn"
              aria-disabled={!cart.checkoutUrl}
            >
              Check out
            </a>
          </footer>
        )}
      </div>
    </div>
  );
}

function CartDrawerLine({line, lines}: {line: CartLine; lines: CartLine[]}) {
  const children = lines.filter(
    (l) =>
      'parentRelationship' in l &&
      l.parentRelationship?.parent?.id === line.id,
  );
  const merchandise = line.merchandise;

  return (
    <li className="cart-drawer-line">
      <div className="cart-drawer-line-image">
        {merchandise?.image && (
          <img
            src={merchandise.image.url}
            alt={merchandise.image.altText ?? merchandise.title}
            width={64}
            height={64}
          />
        )}
      </div>
      <div className="cart-drawer-line-details">
        <div className="cart-drawer-line-top">
          <span className="cart-drawer-line-title">{merchandise?.product?.title}</span>
          {line.cost?.totalAmount && <Money data={line.cost.totalAmount} />}
        </div>
        {merchandise?.title && merchandise.title !== 'Default Title' && (
          <span className="cart-drawer-line-variant">{merchandise.title}</span>
        )}

        {children.length > 0 && (
          <ul className="cart-drawer-line-children">
            {children.map((child) => (
              <li key={child.id}>
                <span>{child.merchandise?.product?.title}</span>
                <span>{child.quantity}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="cart-drawer-line-controls">
          <CartForm
            route="/cart"
            action={CartForm.ACTIONS.LinesUpdate}
            inputs={{lines: [{id: line.id, quantity: Math.max(0, line.quantity - 1)}]}}
          >
            <button type="submit" aria-label={`Decrease quantity of ${merchandise?.product?.title}`}>
              −
            </button>
          </CartForm>
          <span aria-live="polite">{line.quantity}</span>
          <CartForm
            route="/cart"
            action={CartForm.ACTIONS.LinesUpdate}
            inputs={{lines: [{id: line.id, quantity: line.quantity + 1}]}}
          >
            <button type="submit" aria-label={`Increase quantity of ${merchandise?.product?.title}`}>
              +
            </button>
          </CartForm>
          <CartForm
            route="/cart"
            action={CartForm.ACTIONS.LinesRemove}
            inputs={{lineIds: [line.id]}}
          >
            <button type="submit" aria-label={`Remove ${merchandise?.product?.title}`}>
              Remove
            </button>
          </CartForm>
        </div>
      </div>
    </li>
  );
}

function CartDrawerEmpty({onClose}: {onClose: () => void}) {
  return (
    <div className="cart-drawer-empty">
      <p>Looks like you haven&rsquo;t added anything yet.</p>
      <a href="/collections" onClick={onClose}>
        Continue shopping →
      </a>
    </div>
  );
}

/** Keeps Tab/Shift+Tab cycling within the panel while the drawer is open. */
function trapFocus(event: KeyboardEvent, panel: HTMLElement | null) {
  if (!panel) return;
  const focusable = panel.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
