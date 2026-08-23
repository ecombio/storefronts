import {useEffect, useRef} from 'react';
import {useNavigate} from 'react-router';
import {searchClient, ALGOLIA_INDEX_NAME} from '~/lib/algolia';

type ProductHit = {
  objectID: string;
  handle: string;
  title: string;
  image?: string;
  price?: number;
};

export function HeaderSearch() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;

    let searchInstance: {destroy: () => void} | undefined;
    let cancelled = false;

    (async () => {
      const [{autocomplete}] = await Promise.all([
        import('@algolia/autocomplete-js'),
        import('@algolia/autocomplete-theme-classic'),
      ]);

      if (cancelled || !containerRef.current) return;

      searchInstance = autocomplete<ProductHit>({
        container: containerRef.current,
        placeholder: 'Search products...',
        openOnFocus: true,
        detachedMediaQuery: '',
        getSources({query}) {
          if (!query) return [];
          return [
            {
              sourceId: 'products',
              getItems() {
                return searchClient
                  .search({
                    requests: [
                      {
                        indexName: ALGOLIA_INDEX_NAME,
                        query,
                        hitsPerPage: 6,
                      },
                    ],
                  })
                  .then((response: any) => response.results[0].hits as ProductHit[]);
              },
              templates: {
                item({item, html}) {
                  return html`
                    href="/products/${item.handle}"
                    class="aa-ItemLink flex items-center gap-3 p-2"
                  >
                    ${item.image
                      ? html`<img
                          src="${item.image}"
                          alt=""
                          width="40"
                          height="40"
                          class="rounded object-cover"
                        />`
                      : null}
                    <span class="text-sm">${item.title}</span>
                  </a>`;
                },
                noResults() {
                  return 'No products found.';
                },
              },
              onSelect({item}) {
                navigate(`/products/${item.handle}`);
              },
            },
          ];
        },
        onSubmit({state}) {
          navigate(`/search?q=${encodeURIComponent(state.query)}`);
        },
      });
    })();

    return () => {
      cancelled = true;
      searchInstance?.destroy();
    };
  }, [navigate]);

  return <div ref={containerRef} className="header-search" />;
}
