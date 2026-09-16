# Shopify Hydrogen Predictive Search Guide

## Purpose

Predictive search in a Shopify Hydrogen storefront exists to give buyers **type‑ahead, same‑origin search suggestions** that feel identical in behavior and quality to Shopify’s built‑in storefront search.[cite:1][cite:7]  
Its role is to surface relevant products, collections, content, and suggested queries **before** a customer submits their search, reducing friction and helping them get to the right page faster.[cite:1][cite:17]

## Core Concepts

### Regular search vs predictive search

Shopify storefronts expose two complementary search types:[cite:10]

- **Regular search**: Full search results shown on a dedicated search results page after the customer presses Enter or taps a search button.[cite:10][cite:7]
- **Predictive search**: Autocomplete suggestions shown in a dropdown as the customer types, including products, collections, pages, articles, and suggested queries.[cite:1][cite:10]

Hydrogen predictive search is implemented by calling the Storefront API `predictiveSearch` query on the server, while regular search typically uses the Storefront API `search` query or a dedicated search route.[cite:2][cite:7]

### Same-origin autocomplete in Hydrogen

In Hydrogen 2026 developer previews, predictive search is implemented as **same-origin autocomplete**:[cite:8][cite:16]

- The browser calls your Hydrogen origin at a path like `/api/predictive-search`.
- Your Hydrogen server handlers execute the Storefront API `predictiveSearch` query using the store’s private Storefront API token.
- The response is returned to the browser and rendered into a dropdown UI.

This pattern keeps the public Storefront token server‑side, centralizes search logic, and prevents exposing sensitive configuration directly to the client.[cite:8]

## Functionalities

### Data returned by predictiveSearch

The Storefront API’s `predictiveSearch` query returns a `PredictiveSearchResult` object that powers type‑ahead experiences.[cite:2][cite:4]

It can include:

- **Products**: Matching `Product` objects for sale in the store.[cite:2]
- **Collections**: Matching `Collection` objects representing groups of products.[cite:2][cite:3]
- **Pages**: Matching `Page` objects for static content like About or Shipping policy.[cite:2]
- **Articles**: Matching `Article` objects from blogs, useful for guides and editorial content.[cite:2][cite:3]
- **Query suggestions**: `SearchQuerySuggestion` items that are refined search terms based on the current input, often more specific or corrected versions of what the buyer typed.[cite:2][cite:15]

Each query suggestion can include styled text for highlighting, plus tracking parameters that should be included in URLs to help Shopify attribute search interactions and improve relevance.[cite:2][cite:15]

### Query arguments

Key arguments for the `predictiveSearch` query include:[cite:2][cite:4]

- `query` *(String!, required)*: The text the buyer has typed so far.
- `types` *([PredictiveSearchType!])*: Which resource types to include: `PRODUCT`, `COLLECTION`, `PAGE`, `ARTICLE`, `QUERY`.[cite:3]
- `limit` *(Int)*: Maximum number of results, from 1 to 10, either overall or per type depending on `limitScope`.
- `limitScope` *(PredictiveSearchLimitScope)*: Controls whether limits are applied across all resource types combined or per type.[cite:2]
- `searchableFields` *([SearchableField!])*: Which fields are searched; by default, Shopify indexes title, product type, variant title, and vendor, and recommends leaving this default set for best results.[cite:2]
- `unavailableProducts` *(SearchUnavailableProductsType)*: How out‑of‑stock products appear in results (displayed normally, hidden, or shown last).[cite:2][cite:20]

These arguments allow Hydrogen storefronts to tailor predictive search behavior precisely to their UX and merchandising needs.[cite:2][cite:20]

### Hydrogen server handlers and client store

Hydrogen provides primitives for predictive search:[cite:8][cite:16]

- `createPredictiveSearchServerHandlers()`: Registers server handlers (by default, GET `/api/predictive-search`) that call the Storefront API `predictiveSearch` query.
- `createPredictiveSearchStore()`: Manages client‑side state, including debouncing typing, aborting stale requests, and handling concurrency.
- `usePredictiveSearch` and `usePredictiveSearchForm`: React hooks that connect the search input and UI to the predictive-search store.
- `getPredictiveSearchItemUrl()`: Generates URLs for results while preserving Shopify’s search attribution parameters.

These tools let Hydrogen apps implement predictive search with minimal boilerplate while keeping search logic and tokens in predictable places.[cite:8]

### Search behavior: typo tolerance and partial matches

Shopify’s storefront search infrastructure, which powers both regular search and predictive search, includes built-in behaviors:[cite:7][cite:10]

- **Typo tolerance**: After the first four correctly typed letters, one-character differences and some transposed characters are automatically matched to close words, reducing “no results” experiences.[cite:10][cite:17]
- **Partial word matching**: Predictive search can match on partial words, especially the last term in a query, enabling responsive suggestions as buyers continue typing.[cite:1][cite:10]
- **Semantic understanding (regular search)**: Regular search can use semantic understanding and related concepts; predictive search focuses on direct, fast suggestions but benefits indirectly from Search & Discovery configuration.[cite:7][cite:20]

Predictive search and regular search are separate types: predictive search results do not automatically inherit all behaviors used on the full results page, and each has its own configured result types.[cite:10][cite:7]

### Integration with Shopify Search & Discovery

The Shopify Search & Discovery app controls and enhances search for both theme storefronts and custom storefronts built with Hydrogen:[cite:7][cite:20]

You can:

- **Adjust result types**: Choose which resource types (products, pages, blog posts, collections, queries) appear in predictive search versus the full search results page.[cite:20]
- **Configure unavailable products**: Decide whether out‑of‑stock products are hidden, shown, or pushed to the end of results for both search and predictive search.[cite:20]
- **Boost products**: Assign search terms to specific products so they appear higher in search results when those terms are used.[cite:20]
- **Create synonym groups**: Map different words and phrases with similar meanings so they return the same results, improving recall across both regular and predictive search.[cite:20]

For Hydrogen storefronts, this means predictive search respects the same boosts, synonyms, and result-type settings used in your Shopify Online Store.[cite:7]

## Features

### Multi-resource suggestions

Predictive search can suggest multiple resource types in a single dropdown:[cite:2][cite:18]

- Products with images, titles, prices, and availability labels.
- Collections with titles for category shortcuts.
- Pages and articles by title for content discovery.
- Query suggestions for refined or corrected search terms.

This multi‑resource capability allows Hydrogen storefronts to treat search as a navigation hub, not just a list of product matches.[cite:18]

### Query suggestion highlighting

Shopify’s UX guidelines recommend highlighting the **suggested portion** of a query, not what the buyer has already typed.[cite:18]

For example, if a buyer types `card` and the suggested query is `cardigan`, display `card**igan**` rather than `**card**igan` to make scanning easier.[cite:18]

Hydrogen predictive search can use `SearchQuerySuggestion` styled text to implement this highlighting consistently.[cite:2][cite:15]

### Configurable limits and distribution

Because the predictive search API caps results to ten items per request, Hydrogen storefronts should:

- Limit visible items per resource type.
- Consider `limitScope` to balance products versus content.
- Provide a “More results” link that leads to a full search results page.[cite:2][cite:18]

These controls help maintain a compact, useful dropdown that doesn’t overwhelm users.[cite:18]

### UX guidelines for dropdown behavior

Shopify’s predictive search UX guidelines recommend:[cite:18]

- Including clear **search actions** (button/icon and Enter/go key) that take users to the full results page.
- Keeping the query in the field until the user clears it or navigates away, and repeating the query on the search results page.
- Hiding the dropdown when there are no suggestions (empty state) to encourage continued search via the full results page.
- Ensuring the dropdown’s height adapts to content rather than forcing scroll, especially on desktop.
- Disabling browser autocomplete and mobile OS autocorrect/autocomplete to avoid conflicting overlays and duplicated suggestions.

Implementing these practices in Hydrogen aligns custom storefront UX with Shopify’s recommended search behavior.[cite:18]

### Mobile and desktop interactions

For mobile, guidelines emphasize:[cite:18]

- Focusing the search field when a search icon is tapped.
- Ensuring predictive search doesn’t interfere with page scrolling.

For desktop, they recommend:

- Avoid fixed-height dropdowns that hide suggestions behind scroll.
- Darken the rest of the page while autocomplete is active to help buyers focus on search.[cite:18]

Hydrogen components can implement these behaviors via CSS, focus management, and overlay patterns.

## Benefits

### Faster discovery and fewer “no results” pages

Predictive search reduces friction by showing relevant suggestions as buyers type, letting them correct or refine searches before committing to a results page.[cite:1][cite:17]

Typeahead query suggestions function as auto‑correction, guiding buyers toward more specific and successful queries and reducing the frequency of empty or irrelevant search results.[cite:17]

### Higher conversion and better merchandising

By featuring boosted products, curated collections, and key content directly in predictive search, merchants can highlight priority items and campaigns at the moment of search intent.[cite:7][cite:20]

When combined with search tracking and AI-powered relevance in Shopify’s search infrastructure, this leads to better matches, smoother buyer journeys, and more effective merchandising in Hydrogen storefronts.[cite:7][cite:17]

### Parity with Shopify Online Store search

Hydrogen predictive search uses the same search infrastructure as the Shopify Online Store and can honor Search & Discovery app settings for result types, synonyms, boosts, and unavailable product handling.[cite:7][cite:20]

This means a Hydrogen storefront can achieve functional parity with theme-based predictive search while still customizing the UI, routing, and analytics to its specific needs.[cite:7][cite:13]

### Centralized configuration and analytics

Because Shopify search is AI-powered and centrally configured, merchants don’t need to build or tune their own search engine:[cite:7]

- Core behaviors like typo tolerance are on by default.
- Search & Discovery provides a single panel for tuning both search and predictive search.
- Search tracking data from storefronts helps Shopify improve results automatically over time.[cite:7][cite:17]

Hydrogen predictive search benefits from all of these improvements without custom infrastructure work.

## Results and outcomes in a Hydrogen storefront

### Buyer experience outcomes

In a Hydrogen storefront that fully implements predictive search:

- Buyers see immediate product, collection, page, article, and query suggestions as they type in the search bar.[cite:1][cite:2]
- Suggestions reflect boosts, synonyms, and result-type configurations set in Search & Discovery, so the most relevant and strategic content appears first.[cite:7][cite:20]
- Typo tolerance and partial matches help buyers find items even with misspellings or incomplete queries.[cite:10][cite:17]

Together, these features create a search experience that feels as capable and forgiving as Shopify’s built-in Online Store search.[cite:7]

### Merchant outcomes

For merchants, adopting predictive search in Hydrogen yields:

- More engaged search usage, since buyers receive immediate feedback and guidance.[cite:17]
- Reduced support overhead for “can’t find X” issues, as synonyms and boosts steer buyers correctly.[cite:20]
- Better performance from campaigns and featured products placed centrally within the search flow.[cite:7]

These outcomes align Hydrogen storefront search performance with what merchants expect from Shopify’s native themes.

## Implementation checklist for your Hydrogen storefront

To implement predictive search with parity to Shopify search:

1. **Configure Search & Discovery settings**:
   - Set desired result types for predictive search (products, pages, blog posts, collections, queries).
   - Decide how unavailable products should be displayed.
   - Create synonym groups and product boosts for important terms.[cite:7][cite:20]

2. **Add Hydrogen predictive-search server handlers**:
   - Register `createPredictiveSearchServerHandlers()` to expose `/api/predictive-search`.
   - Ensure the handler calls the Storefront API `predictiveSearch` query with appropriate `types`, `limit`, `limitScope`, and `searchableFields`.[cite:2][cite:8]

3. **Wire up client-side predictive search**:
   - Initialize a predictive-search store with `createPredictiveSearchStore()`.
   - Use `usePredictiveSearch` / `usePredictiveSearchForm` hooks in your search bar component.
   - Render a dropdown grouping suggestions by type with highlighting for suggested portions.[cite:8][cite:18]

4. **Implement UX best practices**:
   - Provide a “View all results” or “Search for [query]” link at the bottom of suggestions.
   - Keep queries visible until cleared and repeat them on the full results page.
   - Handle empty states gracefully and ensure mobile/desktop interactions follow Shopify’s UX guidelines.[cite:10][cite:18]

5. **Monitor and refine**:
   - Use Shopify’s analytics and search tracking to see how buyers interact with search.
   - Adjust synonyms, boosts, and result-type settings in Search & Discovery over time.[cite:7][cite:17]

Following this guide will let your Shopify Hydrogen storefront implement site search features and capabilities that match the intent and quality of Shopify’s native search, while giving you full control over the design and flow of the predictive search experience.[cite:7][cite:8]
