import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), hydrogen(), oxygen(), reactRouter()],
  envPrefix: ['VITE_', 'PUBLIC_'],
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
    noExternal: [
      'algoliasearch-helper',
      'react-instantsearch',
      'instantsearch.js',
      'instantsearch-ui-components',
    ],
    optimizeDeps: {
      include: [
        'react-router > set-cookie-parser',
        'react-router > cookie',
        'react-router',
        'algoliasearch-helper',
        'react-instantsearch',
        'instantsearch.js',
      ],
    },
  },
  server: {
    allowedHosts: ['.tryhydrogen.dev'],
  },
});
