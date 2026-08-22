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
      'https://cdn.shopify.com',
      'https://cdn-widgetsrepository.yotpo.com',
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
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://cdn-widgetsrepository.yotpo.com',
      'https://staticw2.yotpo.com',
    ],
    fontSrc: [
      "'self'",
      'https://staticw2.yotpo.com',
    ],
    imgSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://staticw2.yotpo.com',
      'https://api-cdn.yotpo.com',
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