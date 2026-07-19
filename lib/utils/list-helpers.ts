/**
 * Computes overdue/urgent accent flags for a date-driven list row.
 * Generalizes the overdue/urgent-window logic duplicated across
 * app/purchase-requests.tsx, app/purchase-orders.tsx and
 * app/purchase-invoices.tsx. Callers combine the result with any
 * status-based gating they already have (e.g. `isActive && ...overdue`).
 */
export function getDateAccent(
  date: string | null | undefined,
  opts?: { urgentDays?: number },
): { overdue: boolean; urgent: boolean } {
  if (!date) return { overdue: false, urgent: false };
  const target = new Date(date);
  if (isNaN(target.getTime())) return { overdue: false, urgent: false };

  const now = new Date();
  const urgentDays = opts?.urgentDays ?? 2;
  const urgentThreshold = new Date(now.getTime() + urgentDays * 24 * 60 * 60 * 1000);

  return {
    overdue: target < now,
    urgent: target < urgentThreshold,
  };
}

/**
 * Normalizes a line item's `product` reference to a numeric id, whether the
 * item carries a populated product object or a raw id. Generalizes
 * `typeof it.product === 'object' ? it.product.id : it.product`, duplicated
 * across app/goods-receiving/new.tsx, app/purchase-invoices/new.tsx,
 * app/purchase-orders/new.tsx and app/quotation-requests/new.tsx.
 */
export function normalizeProductRef(it: any): number | undefined {
  return typeof it.product === 'object' ? it.product.id : it.product;
}

/**
 * Computes subtotal/tax/total for a list of line items carrying `quantity`
 * and `unit_price`. Generalizes the identical getTotal() in
 * app/purchase-invoices/new.tsx and app/purchase-orders/new.tsx.
 */
export function computeInvoiceTotals(
  items: any[],
  taxRatePercent: number,
): { sub: number; tax: number; total: number } {
  const sub = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0,
  );
  const tax = sub * ((Number(taxRatePercent) || 0) / 100);
  return { sub, tax, total: sub + tax };
}

/**
 * Navigates to the newly created record's detail screen, falling back to
 * the list screen if the create response is ever missing an id. Generalizes
 * the identical defense-in-depth block copy-pasted in
 * app/goods-receiving/new.tsx, app/purchase-invoices/new.tsx,
 * app/purchase-orders/new.tsx, app/purchase-requests/new.tsx and
 * app/quotation-requests/new.tsx.
 */
export function navigateAfterCreate(
  router: any,
  result: { id?: number | null },
  listPath: string,
  detailPathFn: (id: number) => string,
): void {
  if (result.id == null) {
    // Defense-in-depth: the backend create response is now guaranteed
    // to include 'id' (fixed server-side), but if it's ever missing again
    // (bad response, network shim, etc.) fall back to the list instead of
    // a broken "Not found" detail screen.
    router.replace(listPath as any);
    return;
  }
  router.replace(detailPathFn(result.id) as any);
}
