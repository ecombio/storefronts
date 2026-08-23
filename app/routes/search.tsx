import {Link} from 'react-router';
import type {Route} from './+types/search';
import {
  InstantSearch,
  SearchBox,
  Hits,
  RefinementList,
  Pagination,
  Configure,
  Stats,
} from 'react-instantsearch';
import {Image} from '@shopify/hydrogen';
import {searchClient, ALGOLIA_INDEX_NAME} from '~/lib/algolia';

export const meta: Route.MetaFunction = () => {
  return [{title: `Ecombio | Search`}];
};

export default function SearchPage() {
  return (
    <div className="search mx-auto max-w-[1400px] px-4 py-10">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Search</h1>
      <InstantSearch
        searchClient={searchClient}
        indexName={ALGOLIA_INDEX_NAME}
        routing
        future={{preserveSharedStateOnUnmount: true}}
      >
        <Configure hitsPerPage={24} />
        <SearchBox
          placeholder="Search products…"
          classNames={{root: 'mb-2', input: 'w-full border px-3 py-2 rounded'}}
        />
        <Stats classNames={{root: 'text-sm text-gray-500 mb-6'}} />
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          <aside>
            <h2 className="text-sm font-medium mb-2">Product type</h2>
            <RefinementList attribute="product_type" />
            <h2 className="text-sm font-medium mt-6 mb-2">Vendor</h2>
            <RefinementList attribute="vendor" />
          </aside>
          <div>
            <Hits
              hitComponent={ProductHit}
              classNames={{
                list: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6',
              }}
            />
            <Pagination classNames={{root: 'mt-10 flex justify-center'}} />
          </div>
        </div>
      </InstantSearch>
    </div>
  );
}

// NOTE: attribute names below (image, title, handle, price) are guesses
// based on the standard "Algolia for Shopify" app schema. Verify these
// against your actual index in the Algolia dashboard (Indices > Browse)
// and adjust if your field names differ.
function ProductHit({hit}: {hit: any}) {
  return (
    <Link to={`/products/${hit.handle}`} className="block group">
      {hit.image && (
        <Image
          data={{url: hit.image, altText: hit.title}}
          aspectRatio="1/1"
          sizes="300px"
          className="rounded"
        />
      )}
      <h3 className="mt-2 text-sm text-gray-900 group-hover:underline">
        {hit.title}
      </h3>
      {hit.price != null && (
        <p className="text-sm text-gray-600">${hit.price}</p>
      )}
    </Link>
  );
}