import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), hydrogen(), oxygen(), reactRouter()],
  resolve: {
    alias: {
      // Vite's native tsconfig path resolver does not cover JavaScript
      // projects that use jsconfig.json, so define Hydrogen's app alias here.
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      // Force algoliasearch/lite to resolve to its browser build. The
      // default conditions resolution picks the Node build
      // (dist/lite/builds/node.js), which imports Node built-ins like
      // `zlib` — unavailable in the Workers/MiniOxygen runtime.
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
    // Allow a strict Content-Security-Policy
    // without inlining assets as base64:
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      /**
       * Include dependencies here if they throw CJS<>ESM errors.
       * For example, for the following error:
       *
       * > ReferenceError: module is not defined
       * >   at /Users/.../node_modules/example-dep/index.js:1:1
       *
       * Include 'example-dep' in the array below.
       * @see https://vitejs.dev/config/dep-optimization-options
       */
      include: [
        'react-router > set-cookie-parser',
        'react-router > cookie',
        'react-router',
        'algoliasearch/lite',
        '@algolia/requester-fetch',
      ],
    },
    // By default Vite/Hydrogen externalizes everything in node_modules for
    // SSR — meaning it's loaded via raw require()/CJS instead of being run
    // through Vite's transform pipeline. That's fine in Node, but MiniOxygen
    // (Workers-style runtime) has no `require`/`module` globals, so any
    // externalized CJS package throws "require/module is not defined".
    // `noExternal` forces Vite to bundle + transform these packages (and
    // everything they in turn require) instead of externalizing them, which
    // is what optimizeDeps.include alone does NOT guarantee for deep
    // transitive chains. This covers the whole Algolia + InstantSearch CJS
    // dependency family in one shot instead of adding leaf packages
    // (algoliasearch-helper, @algolia/events, qs, use-sync-external-store, ...)
    // one crash at a time.
    noExternal: [
      /^algoliasearch/,
      /^@algolia\//,
      /^instantsearch\.js/,
      /^react-instantsearch/,
      'qs',
      'use-sync-external-store',
    ],
  },
  server: {
    allowedHosts: ['.tryhydrogen.dev'],
  },
});