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

/**
 * Lightens (positive percent) or darkens (negative percent) a 6-digit hex
 * color. Used to derive a gradient's second stop from a single dynamic brand
 * color (e.g. tenant branding.primary_color) without hardcoding a pair.
 */
export function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(Math.min(255, (num >> 16) + amt), 0);
  const g = Math.max(Math.min(255, ((num >> 8) & 0x00ff) + amt), 0);
  const b = Math.max(Math.min(255, (num & 0x0000ff) + amt), 0);
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}
