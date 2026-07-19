/**
 * Formats a numeric value as an AED currency string.
 * Drop-in replacement for the repeated `'AED ' + Number(x).toFixed(2)` /
 * `` `AED ${Number(x).toFixed(2)}` `` inline patterns.
 */
export function formatMoney(value: number | string, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? 2;
  return `AED ${Number(value).toFixed(decimals)}`;
}

/**
 * Builds a URL query string from a params object, skipping undefined/null/''
 * values. Mirrors the URLSearchParams-building block duplicated across
 * lib/api/*.ts (e.g. productsApi.getAll()). Returns the string WITHOUT a
 * leading '?' — callers keep their existing
 * `${queryString ? `?${queryString}` : ''}` composition.
 */
export function buildQueryString(params: Record<string, any>): string {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  return queryParams.toString();
}
