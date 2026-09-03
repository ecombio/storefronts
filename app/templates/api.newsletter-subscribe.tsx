// app/templates/api.newsletter-subscribe.tsx
//
// Resource route backing the newsletter form in
// app/components/blogs/NewsletterForm.tsx. POST /api/newsletter-subscribe,
// following the same api.<name>.tsx convention as the other resource
// routes in this app (api.cart-recommendations.tsx,
// api.predictive-search.tsx, api.reviews.tsx).
//
// SETUP: none — this uses context.storefront, which the loader
// already has wired up (same client ARTICLE_QUERY runs through). No
// new Admin API token, app, or scope needed.
//
// KNOWN LIMITATION — read before relying on this for list growth:
// Storefront API's customerCreate has no "just record marketing
// consent" mode for an anonymous visitor. It always creates a full
// customer record, and `password` is a required field on that
// mutation. We generate a random one server-side and never surface
// it anywhere — this visitor gets acceptsMarketing recorded, not a
// usable login (they can always use "forgot password" later if they
// want to log in with this email).
//
// The real gap: if someone ALREADY has a Shopify customer record for
// this email (returning customer, or they bought something before)
// and submits this form, customerCreate returns a TAKEN error. We
// treat that as a success from the visitor's point of view (no
// confusing "email already in use" error on a newsletter form) — but
// the Storefront API has no anonymous mutation that can flip
// acceptsMarketing to true on an EXISTING customer who wasn't
// already opted in. That specific case (existing, non-subscribed
// customer using this form to opt in) silently doesn't update their
// consent.
//
// Fixing that gap requires the Admin API's
// customerEmailMarketingConsentUpdate mutation, called server-side
// with a private app token (write_customers scope) — a separate
// piece of infrastructure this route deliberately doesn't set up.
// Flag it if closing that gap matters for your list-growth numbers
// and this can be added.

import type {Route} from './+types/api.newsletter-subscribe';

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation NewsletterCustomerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function action({request, context}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ok: false, error: 'Method not allowed'}, {status: 405});
  }

  const formData = await request.formData();

  // Honeypot check — see the `company` field comment in
  // NewsletterForm.tsx. A filled-in value means a bot, not a visitor.
  // Report success without actually subscribing, so bots get no
  // signal their submission was detected.
  if (formData.get('company')) {
    return Response.json({ok: true});
  }

  const email = String(formData.get('email') ?? '').trim();

  if (!email || !EMAIL_REGEX.test(email)) {
    return Response.json(
      {ok: false, error: 'Enter a valid email address.'},
      {status: 400},
    );
  }

  // Required by customerCreate but never used for login — see the
  // KNOWN LIMITATION comment above for why this exists at all.
  const password = crypto.randomUUID();

  try {
    const {customerCreate} = await context.storefront.mutate(
      CUSTOMER_CREATE_MUTATION,
      {
        variables: {
          input: {
            email,
            password,
            acceptsMarketing: true,
          },
        },
      },
    );

    const errors = customerCreate?.customerUserErrors ?? [];
    const isTakenError = errors.some((e) => e.code === 'TAKEN');

    // TAKEN means a customer record already exists for this email.
    // That's not a failure from the visitor's perspective on a
    // newsletter form — surface success rather than an account-
    // creation error. (See KNOWN LIMITATION above: this path does
    // NOT flip acceptsMarketing on that existing record.)
    if (errors.length > 0 && !isTakenError) {
      return Response.json(
        {ok: false, error: errors[0]?.message ?? 'Something went wrong.'},
        {status: 400},
      );
    }

    return Response.json({ok: true});
  } catch (error) {
    console.error('Newsletter subscribe failed', error);
    return Response.json(
      {ok: false, error: 'Something went wrong. Please try again.'},
      {status: 500},
    );
  }
}