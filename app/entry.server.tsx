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
      "'sha256-IT5WN+Mz4HQ26TqWL7rMQVzvTWYttkhDr6qOCX3eig='", // fallback for browsers without strict-dynamic support
    ],
    // Yotpo reviews now run through server-side API calls
    // (app/lib/yotpo.server.ts) rather than the client-side widget
    // script, which used to make its own fetch() calls for
    // ratings/reviews data and beacon analytics, plus load fonts/styles
    // from a separate Yotpo domain. The entries below are kept for now
    // pending a live DevTools check (client still renders reviewer
    // avatar <img> tags from Yotpo's social_image field) — see
    // TODO below before removing further.
    //
    // TODO: once confirmed via DevTools (Network/Console tab on the
    // PDP) that nothing is blocked or broken, trim connectSrc/styleSrc/
    // fontSrc down to just what imgSrc's avatar loading actually needs,
    // or remove entirely if avatars resolve to a non-Yotpo domain.
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
      'https://staticw2.yotpo.com',
      'https://fonts.googleapis.com',
    ],
    fontSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://staticw2.yotpo.com',
      'https://fonts.gstatic.com',
    ],
    // media-src governs <video>/<audio> src loading. Previously unset,
    // which meant it fell back to default-src ('self' + cdn.shopify.com
    // + shopify.com + localhost only) — silently blocking any video
    // whose data-src pointed elsewhere, including Shopify CDN-hosted
    // videos served from a different subdomain than cdn.shopify.com.
    // See app/components/blogs/Video.tsx / Video.md for the marker
    // this unblocks.
    mediaSrc: [
      "'self'",
      'https://cdn.shopify.com',
      // Temporary: commondatastorage.googleapis.com serves the public-
      // domain sample videos (Big Buck Bunny, Elephants Dream, etc.)
      // used as placeholder examples in Video.md while testing the
      // data-video-embed marker locally. Remove once real Shopify CDN
      // video assets replace these placeholders in published content.
      'https://commondatastorage.googleapis.com',
    ],
    // frame-src governs <iframe> src loading — required for the
    // YouTube/Vimeo facade embeds in Video.tsx. Previously unset, same
    // default-src fallback problem as mediaSrc above, so every
    // YouTube/Vimeo embed was silently blocked at the framing step.
    frameSrc: [
      "'self'",
      'https://www.youtube-nocookie.com',
      'https://player.vimeo.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https://cdn.shopify.com',
      'https://staticw2.yotpo.com',
      'https://api-cdn.yotpo.com',
      // Beacon tracking pixels (loaded as <img>, so governed by img-src,
      // not connect-src) for widget-loaded / analytics events. Yotpo's
      // script requests this over http:// even when the page is https,
      // so both schemes need whitelisting or the browser blocks it as
      // a scheme mismatch (not just a missing domain).
      'http://p.yotpoapi.com',
      'https://p.yotpoapi.com',
      // Temporary: picsum.photos placeholder images used in SlideShow,
      // CollectionCarousel, and ImageCarousel dev content. picsum.photos
      // redirects to fastly.picsum.photos to actually serve the image,
      // so both need whitelisting. Remove once real Shopify CDN images
      // replace these placeholders.
      'https://picsum.photos',
      'https://fastly.picsum.photos',
      // Temporary: placehold.co placeholder poster images used in
      // Video.md's data-video-embed examples while testing locally.
      // Remove once real Shopify CDN poster images replace these
      // placeholders in published content — same reasoning as
      // picsum.photos above.
      'https://placehold.co',
      // Mega-menu fallback collection images (Header.constants.ts
      // SUBMENU_IMAGES) served from ecombio.com's CDN.
      'http://ecombio.com',
      'https://ecombio.com',
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