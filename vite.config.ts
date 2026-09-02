import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

const algoliaNoExternal = [
  /^algoliasearch/,
  /^@algolia\//,
  /^instantsearch\.js/,
  /^react-instantsearch/,
  'qs',
  'use-sync-external-store',
];

export default defineConfig({
  plugins: [tailwindcss(), hydrogen(), oxygen(), reactRouter()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      'algoliasearch/lite': fileURLToPath(
        new URL(
          './node_modules/algoliasearch/dist/lite/builds/browser.js',
          import.meta.url,
        ),
      ),
    },
    tsconfigPaths: true,
  },
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    // Kept for backwards compatibility / the built-in Vite `ssr` environment,
    // but per Hydrogen's own changelog, this is NOT reliably forwarded to
    // the custom SSR environment that the Oxygen Vite plugin creates via
    // configEnvironment(). Left here as a harmless belt-and-suspenders,
    // NOT relied upon as the actual fix.
    noExternal: algoliaNoExternal,
    optimizeDeps: {
      include: [
        'react-router > set-cookie-parser',
        'react-router > cookie',
        'react-router',
        'algoliasearch/lite',
        '@algolia/requester-fetch',
      ],
    },
  },
  // THE ACTUAL FIX: explicitly configure the named `ssr` environment that
  // MiniOxygen/the Oxygen Vite plugin actually runs your server code in.
  // Per Hydrogen's changelog: "Because Vite environments are isolated, the
  // top-level resolve config does not automatically apply to custom
  // environments created by plugins" — the Oxygen plugin had to specifically
  // special-case forwarding `resolve.tsconfigPaths` for this exact reason.
  // Nothing else is auto-forwarded, so noExternal must be set here directly.
  environments: {
    ssr: {
      resolve: {
        noExternal: algoliaNoExternal,
      },
    },
  },
  server: {
    allowedHosts: ['.tryhydrogen.dev'],
  },
});