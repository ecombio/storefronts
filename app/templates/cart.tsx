// app/templates/cart.tsx

import {useLoaderData} from 'react-router';
import {CartForm, type CartQueryDataReturn} from '@shopify/hydrogen';
import {data} from 'react-router';
import type {Route} from './+types/cart';
import {CartMain} from '~/sections/CartMain';

export const meta: Route.MetaFunction = () => {
  return [{title: `Cart`}];
};

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];
      discountCodes.push(...inputs.discountCodes);
      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;
      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];
      giftCardCodes.push(...inputs.giftCardCodes);
      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    // KNOWN LIMITATION: cart.updateGiftCardCodes() REPLACES the full
    // set of applied gift cards and requires their plaintext codes.
    // Once a code is applied, Shopify only ever returns a masked
    // `lastCharacters` back — never the original code — so there is
    // no way from this route alone to "add one more while keeping
    // the others" correctly. This case applies ONLY the newly
    // submitted code, which will drop any other gift card that was
    // already applied. A correct multi-gift-card flow requires
    // persisting the plaintext codes as they're applied (session or
    // cookie) so they can be resubmitted here — not implemented.
    case CartForm.ACTIONS.GiftCardCodesAdd: {
      const formGiftCardCode = inputs.giftCardCode as string | undefined;
      const giftCardCodes = formGiftCardCode ? [formGiftCardCode] : [];
      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    // Same limitation as above, in reverse: this clears ALL applied
    // gift cards rather than removing only the targeted one, since
    // the remaining codes aren't recoverable here to resubmit.
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      result = await cart.updateGiftCardCodes([]);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result.cart.id;
  const headers = cart.setCartId(result.cart.id);
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  headers.append('Set-Cookie', await context.session.commit());

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  return await cart.get();
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();
  return (
    <div className="cart">
      <CartMain layout="page" cart={cart} />
    </div>
  );
}
