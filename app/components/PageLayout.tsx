import {Await, Link} from 'react-router';
import {Suspense, useId, useState} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <SearchAside />
      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
      {header && (
        <Header
          header={header}
          cart={cart}
          isLoggedIn={isLoggedIn}
          publicStoreDomain={publicStoreDomain}
        />
      )}
      <main>{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="CART">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

/**
 * Curated trending-search chips shown before the shopper has typed anything.
 * The Storefront API doesn't expose a "trending searches" endpoint — this is
 * a manually maintained list. Swap these for whatever you want to promote.
 */
const TRENDING_SEARCHES = ['Hoodie', 'Joggers', 'T-Shirt', 'Sneakers'];

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function SearchAside() {
  const queriesDatalistId = useId();
  const [term, setTerm] = useState('');

  return (
    <Aside type="search" heading="SEARCH">
      <div className="flex flex-col gap-lg p-md bg-canvas">
        <SearchFormPredictive className="w-full">
          {({fetchResults, goToSearch, inputRef}) => (
            <div className="relative flex items-center">
              <span className="absolute left-sm text-ink-muted-48 pointer-events-none">
                <SearchIcon />
              </span>
              <input
                name="q"
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value);
                  fetchResults(event);
                }}
                onFocus={fetchResults}
                placeholder="What are you looking for?"
                ref={inputRef}
                type="search"
                list={queriesDatalistId}
                className="w-full rounded-pill bg-canvas-parchment text-ink text-body pl-[2.75rem] pr-[2.75rem] py-sm border-0 outline-none focus:ring-2 focus:ring-primary-focus"
              />
              {term && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setTerm('');
                    if (inputRef.current) {
                      inputRef.current.value = '';
                      inputRef.current.focus();
                    }
                  }}
                  className="absolute right-sm text-ink-muted-48 hover:text-ink"
                >
                  <ClearIcon />
                </button>
              )}
              {/* Kept for keyboard/no-JS submission; visually hidden since the
                  pill input + icon carries the affordance in this design. */}
              <button
                type="button"
                onClick={goToSearch}
                className="sr-only"
              >
                Search
              </button>
            </div>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({items, total, term: fetcherTerm, state, closeSearch}) => {
            const {articles, collections, pages, products, queries} = items;

            if (!fetcherTerm.current) {
              return (
                <div className="flex flex-col gap-sm">
                  <h5 className="text-caption-strong text-ink-muted-80 uppercase tracking-wide">
                    Trending Searches
                  </h5>
                  <div className="flex flex-wrap gap-xs">
                    {TRENDING_SEARCHES.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setTerm(suggestion)}
                        className="rounded-pill bg-surface-pearl text-ink-muted-80 text-caption px-sm py-xxs"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            if (state === 'loading') {
              return (
                <p className="text-caption text-ink-muted-48">Loading…</p>
              );
            }

            if (!total) {
              return <SearchResultsPredictive.Empty term={fetcherTerm} />;
            }

            return (
              <div className="flex flex-col gap-lg">
                <datalist id={queriesDatalistId}>
                  {queries.map((suggestion) =>
                    suggestion ? (
                      <option key={suggestion.text} value={suggestion.text} />
                    ) : null,
                  )}
                </datalist>

                {products.length > 0 && (
                  <div className="flex flex-col gap-sm">
                    <h5 className="text-caption-strong text-ink-muted-80 uppercase tracking-wide">
                      Products
                    </h5>
                    <div className="grid grid-cols-2 gap-sm">
                      {products.map((product) => {
                        const productUrl = `/products/${product.handle}`;
                        const price =
                          product?.selectedOrFirstAvailableVariant?.price;
                        const image =
                          product?.selectedOrFirstAvailableVariant?.image;

                        return (
                          <Link
                            key={product.id}
                            to={productUrl}
                            onClick={closeSearch}
                            className="relative flex flex-col gap-xxs"
                          >
                            <div className="relative rounded-lg overflow-hidden bg-canvas-parchment aspect-square">
                              {image && (
                                <Image
                                  alt={image.altText ?? ''}
                                  src={image.url}
                                  width={200}
                                  height={200}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <span
                                className="absolute top-xs right-xs rounded-full bg-canvas/90 p-xxs text-ink"
                                aria-hidden="true"
                              >
                                <HeartIcon />
                              </span>
                            </div>
                            <p className="text-caption text-ink line-clamp-2">
                              {product.title}
                            </p>
                            {price && (
                              <p className="text-caption-strong text-ink">
                                <Money data={price} />
                              </p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {collections.length > 0 && (
                  <SearchResultsPredictive.Collections
                    collections={collections}
                    closeSearch={closeSearch}
                    term={fetcherTerm}
                  />
                )}

                {pages.length > 0 && (
                  <SearchResultsPredictive.Pages
                    pages={pages}
                    closeSearch={closeSearch}
                    term={fetcherTerm}
                  />
                )}

                {articles.length > 0 && (
                  <SearchResultsPredictive.Articles
                    articles={articles}
                    closeSearch={closeSearch}
                    term={fetcherTerm}
                  />
                )}

                {fetcherTerm.current && total ? (
                  <Link
                    onClick={closeSearch}
                    to={`${SEARCH_ENDPOINT}?q=${fetcherTerm.current}`}
                    className="text-body text-primary"
                  >
                    View all results for <q>{fetcherTerm.current}</q> →
                  </Link>
                ) : null}
              </div>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
}

function MobileMenuAside({
  header,
  publicStoreDomain,
}: {
  header: PageLayoutProps['header'];
  publicStoreDomain: PageLayoutProps['publicStoreDomain'];
}) {
  return (
    header.menu &&
    header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading="MENU">
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          primaryDomainUrl={header.shop.primaryDomain.url}
          publicStoreDomain={publicStoreDomain}
        />
      </Aside>
    )
  );
}
