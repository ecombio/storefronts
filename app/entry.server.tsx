import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    scriptSrc: [
      "'self'",
      "'strict-dynamic'",
      'https://cdn.shopify.com',
      'https://cdn-widgetsrepository.yotpo.com',
      "'sha256-IT5WN+Mz4HQ26TqWL7rMQVzvTWYttkhDr6qOCX3eig='", // fallback for browsers without strict-dynamic support
    ],
    // The Yotpo widget script loads via scriptSrc above, but it then
    // makes its own fetch() calls for ratings/reviews data and beacon
    // analytics, plus loads fonts/styles from a separate Yotpo domain.
    // Those are governed by these directives, not scriptSrc.
    connectSrc: [
      "'self'",
      'https://api-cdn.yotpo.com',
      'https://api.yotpo.com',
      'https://staticw2.yotpo.com',
      // Beacon endpoint used by the Yotpo loader for review-submission
      // and analytics beacons. Not documented, not overridable on
      // Yotpo's side (confirmed via their support chat) — must be
      // explicitly whitelisted here or beacons silently fail under
      // HTTPS-only CSP.
      'https://p.yotpoapi.com',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://cdn-widgetsrepository.yotpo.com',
      'https://staticw2.yotpo.com',
      'https://fonts.googleapis.com',
    ],
    fontSrc: [
      "'self'",
      'https://staticw2.yotpo.com',
      'https://cdn-widgetsrepository.yotpo.com',
      'https://fonts.gstatic.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https://cdn.shopify.com',
      'https://staticw2.yotpo.com',
      'https://cdn-widgetsrepository.yotpo.com',
      'https://api-cdn.yotpo.com',
      // Beacon tracking pixels (loaded as <img>, so governed by img-src,
      // not connect-src) for widget-loaded / analytics events. Yotpo's
      // script requests this over http:// even when the page is https,
      // so both schemes need whitelisting or the browser blocks it as
      // a scheme mismatch (not just a missing domain).
      'http://p.yotpoapi.com',
      'https://p.yotpoapi.com',
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}