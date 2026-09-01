// app/lib/canonical.ts

/**
 * Builds a self-referencing canonical URL for the current request, keeping
 * only an explicit allow-list of "content-changing" params and dropping
 * everything else.
 *
 * Why an allow-list instead of a deny-list: new URL params get added to
 * routes over time (tracking params, UI state, experiments). A deny-list
 * silently starts including any new param in the canonical unless someone
 * remembers to add it to the list. An allow-list fails safe — a forgotten
 * new param is simply left out of the canonical, which is the safer
 * default for avoiding duplicate-content issues.
 *
 * Each page in a paginated or tabbed sequence should canonicalize to
 * itself (not collapse to a single root URL) when the params represent
 * materially different content — otherwise search engines may only index
 * one variant and miss the rest.
 */
export function buildSelfCanonicalUrl(
  request: Request,
  options: {
    /** Param names to preserve in the canonical URL, in order. */
    keepParams?: string[];
    /**
     * For a given param name, a value that should be treated as the
     * "default" and omitted from the canonical entirely (e.g. a `tab`
     * param whose default value shouldn't appear in the URL at all).
     */
    dropDefaultValues?: Record<string, string>;
  } = {},
): string {
  const {keepParams = [], dropDefaultValues = {}} = options;
  const requestUrl = new URL(request.url);
  const canonical = new URL(requestUrl.pathname, requestUrl.origin);

  for (const name of keepParams) {
    const values = requestUrl.searchParams.getAll(name);
    for (const value of values) {
      if (dropDefaultValues[name] === value) {
        continue;
      }
      canonical.searchParams.append(name, value);
    }
  }

  return canonical.toString();
}