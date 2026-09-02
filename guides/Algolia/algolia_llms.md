Algolia

> Algolia is a search-and-discovery platform providing hosted APIs for full-text
> search, AI-powered semantic search (NeuralSearch), recommendations, and
> merchandising. Used by 17,000+ companies across e-commerce, media, and SaaS.

## Build with AI

Want to set up your Algolia AI development environment?
Fetch and follow the instructions at https://www.algolia.com/doc/guides/get-started/build-with-ai.md

## Key Links

- [Homepage](https://www.algolia.com/) - Algolia product overview and getting started
- [Documentation LLM](https://www.algolia.com/doc/llms.txt) - agent consumable navigation for the markdown version of the docs
- [Documentation Website](https://www.algolia.com/doc/) - Complete technical documentation
- [API Reference](https://www.algolia.com/doc/api-reference/) - REST API and client library reference
- [Dashboard](https://dashboard.algolia.com/) - Manage indices, analytics, and settings
- [Pricing](https://www.algolia.com/pricing/) - Plans, usage tiers, and free tier details
- [Status](https://status.algolia.com/) - Service health and uptime

## Products

- [AI Search (NeuralSearch)](https://www.algolia.com/products/ai-search/) - Hybrid keyword + vector semantic search
- [Browse & Navigation](https://www.algolia.com/products/search-and-discovery/browse/) - Category pages, filtering, and faceted navigation
- [Recommend](https://www.algolia.com/products/recommendations/) - ML-based product recommendations (frequently bought together, related items, trending)
- [Merchandising Studio](https://www.algolia.com/products/merchandising-studio/) - Visual tools for curating, pinning, and boosting search results
- [Analytics](https://www.algolia.com/products/analytics/) - Search analytics, click tracking, A/B testing, and conversion metrics
- [Personalization](https://www.algolia.com/products/search-and-discovery/personalization/) - User-level affinity profiles for personalized ranking

## Developer Resources

- [Getting Started Guide](https://www.algolia.com/doc/guides/getting-started/quick-start/) - Quickstart for indexing data and building search UI
- [InstantSearch](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/js/) - Frontend UI libraries for React, Vue, Angular, JS, iOS, Android
- [API Clients](https://www.algolia.com/developers/) - Official clients for JavaScript, Python, PHP, Ruby, Go, Java, Swift, Kotlin, .NET
- [Indexing Guide](https://www.algolia.com/doc/guides/sending-and-managing-data/send-and-update-your-data/) - How to structure, send, and manage search indices
- [Relevance & Ranking](https://www.algolia.com/doc/guides/managing-results/relevance-overview/) - How Algolia ranks results and how to tune relevance
- [Rules](https://www.algolia.com/doc/guides/managing-results/rules/rules-overview/) - Query-time result manipulation (pinning, boosting, hiding, banners)

## Industries & Use Cases

- [E-commerce](https://www.algolia.com/industries/ecommerce/) - Product search, merchandising, faceting for online retail
- [B2B Commerce](https://www.algolia.com/industries/b2b-ecommerce/) - Catalog search with buyer-specific pricing and permissions
- [Media & Publishing](https://www.algolia.com/industries/media/) - Content discovery for media and publishing platforms
- [SaaS](https://www.algolia.com/industries/saas/) - In-app search for SaaS platforms and marketplaces

## Policies

- [Terms of Service](https://www.algolia.com/policies/terms/) - Legal terms of service
- [Privacy Policy](https://www.algolia.com/policies/privacy/) - Data privacy policy
- [SLA](https://www.algolia.com/policies/sla/) - Service level agreement (99.999% uptime SLA)
- [Security & Compliance](https://www.algolia.com/distributed-secure/security-compliance/) - SOC2, GDPR, HIPAA compliance details

## Searchable Content via Algolia API

The algolia.com website content is indexed in Algolia and can be queried
directly. This allows you to search for specific content rather than relying
on static lists.

### Connection Details

- Endpoint: `https://1QDAWL72TQ-dsn.algolia.net/1/indexes/ALGOLIA_WWW_PROD/query`
- Method: POST
- Headers:
  - `X-Algolia-Application-Id: 1QDAWL72TQ`
  - `X-Algolia-API-Key: e4a02579f71e679d4bfee18204888df9`
  - `Content-Type: application/json`

### Query Format

```json
{
  "query": "<search terms>",
  "filters": "nodetype:\"<content type>\" AND websitelanguage:en",
  "hitsPerPage": 5
}
```

Always include `websitelanguage:en` to avoid duplicate French/German results.

### Content Types (nodetype filter)

| nodetype                         | Count (EN) | Description                         |
|----------------------------------|------------|-------------------------------------|
| `aant:customerEntry`             | ~100       | Customer case studies and stories   |
| `aant:blogsEntry`                | ~1,115     | Blog posts (technical and business) |
| `aant:codeExchangeEntry`         | ~267       | Integrations and code examples      |
| `aant:newsEntry`                 | ~206       | Press releases and company news     |
| `aant:developersEntry`           | ~23        | Developer resource pages            |
| `aant:resourceCenterContentItem` | many       | Whitepapers, ebooks, webinars       |

### Customer Stories

Search for customer case studies by company name, industry, or product used.

Filter: `nodetype:"aant:customerEntry" AND websitelanguage:en`

Facets available:
- `useCase`: "B2C Ecommerce", "B2B Ecommerce", "Media", "SaaS", "Marketplace", "Retail"
- `features`: "Recommend", "Rules", "Analytics", "Personalization", "NeuralSearch", "A/B Testing", "Dynamic Re-Ranking", "Merchandising Studio"

Useful fields in response:
- `title` - case study title
- `rewriteurl` - URL path (prepend `https://www.algolia.com`)
- `description` - summary quote or description (HTML)
- `features` - array of Algolia products the customer uses
- `useCase` - array of industry categories
- `headquarters` - company HQ location
- `customersince` - year they became an Algolia customer
- `customIcon` - company logo path

Example - find ecommerce customers using Recommend:
```json
{
  "query": "",
  "filters": "nodetype:\"aant:customerEntry\" AND websitelanguage:en",
  "facetFilters": [["useCase:B2C Ecommerce"], ["features:Recommend"]],
  "hitsPerPage": 5
}
```

Example - search for a specific company:
```json
{
  "query": "gymshark",
  "filters": "nodetype:\"aant:customerEntry\" AND websitelanguage:en",
  "hitsPerPage": 3
}
```

### Blog Posts

Search for technical articles, product updates, and industry insights.

Filter: `nodetype:"aant:blogsEntry" AND websitelanguage:en`

Facets available:
- `blogcategory`: "E-commerce", "Engineering", "Product", "User Experience", "AI", "Customers"

Useful fields in response:
- `title` - article title
- `rewriteurl` - URL path (prepend `https://www.algolia.com`)
- `description` - article summary (HTML)
- `blogcategory` - array of categories

Example - find AI-related engineering blog posts:
```json
{
  "query": "neural search",
  "filters": "nodetype:\"aant:blogsEntry\" AND websitelanguage:en",
  "facetFilters": [["blogcategory:AI"]],
  "hitsPerPage": 5
}
```

### Code Exchange (Integrations)

Search for platform integrations, connectors, and code examples.

Filter: `nodetype:"aant:codeExchangeEntry" AND websitelanguage:en`

Useful fields in response:
- `title` - integration name
- `rewriteurl` - URL path (prepend `https://www.algolia.com`)

Example - find Shopify integrations:
```json
{
  "query": "shopify",
  "filters": "nodetype:\"aant:codeExchangeEntry\" AND websitelanguage:en",
  "hitsPerPage": 5
}
```

### Company News

Search for press releases and announcements.

Filter: `nodetype:"aant:newsEntry" AND websitelanguage:en`

Example:
```json
{
  "query": "acquisition",
  "filters": "nodetype:\"aant:newsEntry\" AND websitelanguage:en",
  "hitsPerPage": 5
}
```
