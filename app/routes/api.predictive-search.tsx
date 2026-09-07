import type {LoaderFunctionArgs} from 'react-router';

// Requests every predictiveSearch type we use in the panel:
// - QUERY: text suggestions ("adidas trainers", "adidas gazelle"...)
// - PRODUCT: product cards in the results grid (vendor + productType +
//   tags included so the panel can render a "BRAND / TYPE" line and
//   derive brand suggestions and an "ECO" badge from real merchant
//   data, not fabricated fields)
// - COLLECTION: category suggestions (e.g. "Sneakers")
// - ARTICLE: blog posts for the Articles row
// - PAGE: static pages (e.g. shipping policy) for the Suggestions rail
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearchInstant(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $query: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit
      limitScope: $limitScope
      query: $query
      types: $types
    ) {
      queries {
        text
      }
      products {
        id
        title
        handle
        vendor
        productType
        tags
        selectedOrFirstAvailableVariant(
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          image {
            url
            altText
          }
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
        }
      }
      collections {
        id
        title
        handle
        image {
          url
          altText
        }
      }
      articles {
        id
        title
        handle
        publishedAt
        image {
          url
          altText
        }
        blog {
          handle
        }
      }
      pages {
        id
        title
        handle
      }
    }
  }
`;

export type PredictiveSearchHit = {
  objectID: string;
  title: string;
  handle: string;
  image_url: string | null;
  price: number | null;
  compare_at_price: number | null;
  is_eco: boolean;
  /** Shown as the small "BRAND" label above the title in SearchPanel.tsx. */
  vendor: string | null;
  /** Shown as the small "/ TYPE" label above the title in SearchPanel.tsx. */
  product_type: string | null;
};

export type PredictiveCollection = {
  id: string;
  title: string;
  handle: string;
  image_url: string | null;
};

export type PredictiveArticle = {
  id: string;
  title: string;
  handle: string;
  blog_handle: string;
  image_url: string | null;
  published_at: string;
};

export type PredictivePage = {
  id: string;
  title: string;
  handle: string;
};

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get('q')?.trim() ?? '';

  if (!searchTerm) {
    return Response.json({
      hits: [],
      querySuggestions: [],
      vendors: [],
      collections: [],
      articles: [],
      pages: [],
    });
  }

  try {
    const {predictiveSearch} = await context.storefront.query(
      PREDICTIVE_SEARCH_QUERY,
      {
        variables: {
          query: searchTerm,
          limit: 6,
          limitScope: 'EACH',
          types: ['QUERY', 'PRODUCT', 'COLLECTION', 'ARTICLE', 'PAGE'],
        },
      },
    );

    const hits: PredictiveSearchHit[] = (
      predictiveSearch?.products ?? []
    ).map((product: any) => {
      const variant = product.selectedOrFirstAvailableVariant;
      return {
        objectID: product.id,
        title: product.title,
        handle: product.handle,
        image_url: variant?.image?.url ?? null,
        price: variant?.price?.amount
          ? Number(variant.price.amount)
          : null,
        compare_at_price: variant?.compareAtPrice?.amount
          ? Number(variant.compareAtPrice.amount)
          : null,
        // Real merchant data: true only if the product is actually
        // tagged "eco" in Shopify admin — never inferred/guessed.
        is_eco: (product.tags ?? []).some(
          (tag: string) => tag.toLowerCase() === 'eco',
        ),
        vendor: product.vendor ?? null,
        product_type: product.productType || null,
      };
    });

    // Deduped, real vendor names pulled from the matched products —
    // this is how "Adidas" shows up as a brand-style suggestion without
    // a separate vendor/brand API call.
    const vendors = Array.from(
      new Set(
        (predictiveSearch?.products ?? [])
          .map((product: any) => product.vendor)
          .filter(Boolean),
      ),
    ).slice(0, 4) as string[];

    const querySuggestions: string[] = (predictiveSearch?.queries ?? [])
      .map((q: any) => q.text)
      .filter(Boolean);

    const collections: PredictiveCollection[] = (
      predictiveSearch?.collections ?? []
    ).map((collection: any) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      image_url: collection.image?.url ?? null,
    }));

    const articles: PredictiveArticle[] = (
      predictiveSearch?.articles ?? []
    ).map((article: any) => ({
      id: article.id,
      title: article.title,
      handle: article.handle,
      blog_handle: article.blog?.handle ?? '',
      image_url: article.image?.url ?? null,
      published_at: article.publishedAt,
    }));

    const pages: PredictivePage[] = (predictiveSearch?.pages ?? []).map(
      (page: any) => ({
        id: page.id,
        title: page.title,
        handle: page.handle,
      }),
    );

    return Response.json({
      hits,
      querySuggestions,
      vendors,
      collections,
      articles,
      pages,
    });
  } catch (error) {
    console.error('predictive-search loader error:', error);
    return Response.json(
      {
        hits: [],
        querySuggestions: [],
        vendors: [],
        collections: [],
        articles: [],
        pages: [],
        error: 'Search is temporarily unavailable.',
      },
      {status: 500},
    );
  }
}