import { purchaseRequestsApi } from './purchase-requests';
import { purchaseOrdersApi } from './purchase-orders';
import { goodsReceivingApi } from './goods-receiving';
import { purchaseInvoicesApi } from './purchase-invoices';
import { suppliersApi } from './suppliers';
import { productsApi } from './products';
import { quotationRequestsApi } from './quotation-requests';

// Suppress non-actionable errors from dashboard console output.
// ApiError (thrown by unwrap() in lib/api/*.ts) carries the response status,
// so branch on the numeric code first and fall back to string-matching the
// message only for errors that didn't carry one.
function isSilentError(error: any): boolean {
  const status = error?.status;
  if (status === 401 || status === 403 || status === 404 || status === 0) return true;

  const msg = (error?.message || String(error)).toLowerCase();
  return (
    msg.includes('session expired') ||
    msg.includes('authentication credentials') ||
    msg.includes('unauthorized') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('not found') ||
    msg.includes('permission') ||
    msg.includes('403') ||
    msg.includes('404')
  );
}

/** Runs `apiCall`, returning `defaultValue` (and swallowing non-actionable errors) on failure. */
async function safeGet<T>(apiCall: () => Promise<T>, defaultValue: T): Promise<T> {
  try {
    return await apiCall();
  } catch (error: any) {
    if (__DEV__ && !isSilentError(error)) console.warn('Dashboard API error:', error);
    return defaultValue;
  }
}

/**
 * Pages through every record of a list endpoint (mirrors suppliersApi.getAllActive's
 * page/hasMore/next loop) instead of assuming a single page_size: 1000 request
 * captures everything — datasets past 1000 rows were silently truncated before.
 */
async function fetchAllPages<T>(
  fetchPage: (page: number, page_size: number) => Promise<{ results?: T[]; next?: string | null }>,
  page_size = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchPage(page, page_size);
    if (response.results && response.results.length > 0) {
      all.push(...response.results);
      hasMore = !!response.next;
      page++;
    } else {
      hasMore = false;
    }
  }

  return all;
}

export interface DashboardStats {
  purchaseRequests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  quotationRequests: {
    total: number;
    pending: number;
    completed: number;
  };
  suppliers: {
    total: number;
  };
  products: {
    total: number;
  };
  purchaseOrders: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  };
  goodsReceiving: {
    total: number;
  };
  invoices: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
  };
}

export interface ProcurementCycleMetrics {
  avgPRToPO: number;
  avgPOToGRN: number;
  avgGRNToInvoice: number;
  bottlenecks: Array<{
    stage: string;
    avgDays: number;
    count: number;
  }>;
}

export interface RecentActivity {
  id: number;
  type: 'purchase_request' | 'quotation' | 'purchase_order' | 'grn' | 'invoice';
  action: 'created' | 'approved' | 'rejected' | 'paid';
  title: string;
  user: string;
  timestamp: string;
  link: string;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const [
      purchaseRequests,
      quotationRequests,
      suppliers,
      products,
      purchaseOrders,
      goodsReceiving,
      invoices,
    ] = await Promise.all([
      safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1 }), { results: [], count: 0 } as any),
      safeGet(() => quotationRequestsApi.getAll({ page: 1, page_size: 1 }), { results: [], count: 0 } as any),
      safeGet(() => suppliersApi.getAll({ page: 1, page_size: 1 }), { results: [], count: 0 } as any),
      safeGet(() => productsApi.getAll({ page: 1, page_size: 1 }), { results: [], count: 0 } as any),
      safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1 }), { results: [], count: 0 } as any),
      safeGet(() => goodsReceivingApi.getAll({ page: 1, page_size: 1 }), { results: [], count: 0 } as any),
      safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1 }), { results: [], count: 0 } as any),
    ]);

    const [
      prPending, prApproved, prRejected,
      qrPending, qrCompleted,
      poPending, poApproved, poRejected, poCompleted,
      invPending, invApproved, invPaid,
    ] = await Promise.all([
      safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'pending' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'approved' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseRequestsApi.getAll({ page: 1, page_size: 1, status: 'rejected' }), { results: [], count: 0 } as any),
      safeGet(() => quotationRequestsApi.getAll({ page: 1, page_size: 1, status: 'pending' }), { results: [], count: 0 } as any),
      safeGet(() => quotationRequestsApi.getAll({ page: 1, page_size: 1, status: 'completed' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'pending' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'approved' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'rejected' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseOrdersApi.getAll({ page: 1, page_size: 1, status: 'completed' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'pending' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'approved' }), { results: [], count: 0 } as any),
      safeGet(() => purchaseInvoicesApi.getAll({ page: 1, page_size: 1, status: 'paid' }), { results: [], count: 0 } as any),
    ]);

    return {
      purchaseRequests: {
        total: purchaseRequests.count || 0,
        pending: prPending.count || 0,
        approved: prApproved.count || 0,
        rejected: prRejected.count || 0,
      },
      quotationRequests: {
        total: quotationRequests.count || 0,
        pending: qrPending.count || 0,
        completed: qrCompleted.count || 0,
      },
      suppliers: {
        total: suppliers.count || 0,
      },
      products: {
        total: products.count || 0,
      },
      purchaseOrders: {
        total: purchaseOrders.count || 0,
        pending: poPending.count || 0,
        approved: poApproved.count || 0,
        rejected: poRejected.count || 0,
        completed: poCompleted.count || 0,
      },
      goodsReceiving: {
        total: goodsReceiving.count || 0,
      },
      invoices: {
        total: invoices.count || 0,
        pending: invPending.count || 0,
        approved: invApproved.count || 0,
        paid: invPaid.count || 0,
      },
    };
  },

  getRecentActivity: async (): Promise<RecentActivity[]> => {
    try {
      const activities: RecentActivity[] = [];

      try {
        const prs = await purchaseRequestsApi.getAll({ page: 1, page_size: 10 });
        for (const pr of prs.results || []) {
          activities.push({
            id: Number(pr.id),
            type: 'purchase_request',
            action: pr.status === 'approved' ? 'approved' : pr.status === 'rejected' ? 'rejected' : 'created',
            title: (pr as any).title || (pr as any).code || '',
            user: (pr as any).created_by_name || 'Unknown',
            timestamp: (pr as any).created_at || '',
            link: `/purchase-requests/${pr.id}`,
          });
        }
      } catch (error: any) {
        if (__DEV__ && !isSilentError(error)) console.warn('Error fetching purchase requests for activity:', error);
      }

      try {
        const pos = await purchaseOrdersApi.getAll({ page: 1, page_size: 10 });
        for (const po of pos.results || []) {
          activities.push({
            id: Number(po.id),
            type: 'purchase_order',
            action: (po as any).status === 'approved' ? 'approved' : (po as any).status === 'rejected' ? 'rejected' : 'created',
            title: (po as any).order_number || `PO #${po.id}`,
            user: (po as any).created_by_name || 'Unknown',
            timestamp: (po as any).created_at || '',
            link: `/purchase-orders/${po.id}`,
          });
        }
      } catch (error: any) {
        if (__DEV__ && !isSilentError(error)) console.warn('Error fetching purchase orders for activity:', error);
      }

      try {
        const invoices = await purchaseInvoicesApi.getAll({ page: 1, page_size: 10 });
        for (const inv of invoices.results || []) {
          activities.push({
            id: Number(inv.id),
            type: 'invoice',
            action: inv.status === 'paid' ? 'paid' : inv.status === 'approved' ? 'approved' : 'created',
            title: (inv as any).invoice_number || '',
            user: (inv as any).created_by_name || 'Unknown',
            timestamp: (inv as any).invoice_date || '',
            link: `/purchase-invoices/${inv.id}`,
          });
        }
      } catch (error: any) {
        if (__DEV__ && !isSilentError(error)) console.warn('Error fetching invoices for activity:', error);
      }

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (__DEV__ && !isSilentError(error)) console.warn('Error fetching recent activity:', error);
      return [];
    }
  },

  getProcurementCycleMetrics: async (): Promise<ProcurementCycleMetrics> => {
    try {
      const [allPOs, allPRs, allGRNs, allInvoices] = await Promise.all([
        safeGet(() => fetchAllPages((page, page_size) => purchaseOrdersApi.getAll({ page, page_size })), [] as any[]),
        safeGet(() => fetchAllPages((page, page_size) => purchaseRequestsApi.getAll({ page, page_size })), [] as any[]),
        safeGet(() => fetchAllPages((page, page_size) => goodsReceivingApi.getAll({ page, page_size })), [] as any[]),
        safeGet(() => fetchAllPages((page, page_size) => purchaseInvoicesApi.getAll({ page, page_size })), [] as any[]),
      ]);

    let totalPRToPODays = 0;
    let prToPOCount = 0;
    let totalPOToGRNDays = 0;
    let poToGRNCount = 0;
    let totalGRNToInvoiceDays = 0;
    let grnToInvoiceCount = 0;

    for (const po of allPOs) {
      if ((po as any).purchase_request) {
        const pr = allPRs.find((p: any) => Number(p.id) === Number((po as any).purchase_request));
        if (pr && (pr as any).created_at && (po as any).created_at) {
          const prDate = new Date((pr as any).created_at);
          const poDate = new Date((po as any).created_at);
          const days = Math.floor((poDate.getTime() - prDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalPRToPODays += days;
            prToPOCount++;
          }
        }
      }
    }

    for (const grn of allGRNs) {
      if ((grn as any).purchase_order_id) {
        const po = allPOs.find((p: any) => Number(p.id) === Number((grn as any).purchase_order_id));
        if (po && (po as any).created_at && (grn as any).receipt_date) {
          const poDate = new Date((po as any).created_at);
          const grnDate = new Date((grn as any).receipt_date);
          const days = Math.floor((grnDate.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalPOToGRNDays += days;
            poToGRNCount++;
          }
        }
      }
    }

    for (const invoice of allInvoices) {
      if ((invoice as any).grn_id) {
        const grn = allGRNs.find((g: any) => Number(g.id) === Number((invoice as any).grn_id));
        if (grn && (grn as any).receipt_date && (invoice as any).invoice_date) {
          const grnDate = new Date((grn as any).receipt_date);
          const invDate = new Date((invoice as any).invoice_date);
          const days = Math.floor((invDate.getTime() - grnDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalGRNToInvoiceDays += days;
            grnToInvoiceCount++;
          }
        }
      }
    }

    const bottlenecks = [
      {
        stage: 'PR → PO',
        avgDays: prToPOCount > 0 ? Math.round(totalPRToPODays / prToPOCount) : 0,
        count: prToPOCount,
      },
      {
        stage: 'PO → GRN',
        avgDays: poToGRNCount > 0 ? Math.round(totalPOToGRNDays / poToGRNCount) : 0,
        count: poToGRNCount,
      },
      {
        stage: 'GRN → Invoice',
        avgDays: grnToInvoiceCount > 0 ? Math.round(totalGRNToInvoiceDays / grnToInvoiceCount) : 0,
        count: grnToInvoiceCount,
      },
    ];

      return {
        avgPRToPO: prToPOCount > 0 ? Math.round(totalPRToPODays / prToPOCount) : 0,
        avgPOToGRN: poToGRNCount > 0 ? Math.round(totalPOToGRNDays / poToGRNCount) : 0,
        avgGRNToInvoice: grnToInvoiceCount > 0 ? Math.round(totalGRNToInvoiceDays / grnToInvoiceCount) : 0,
        bottlenecks: bottlenecks.sort((a, b) => b.avgDays - a.avgDays),
      };
    } catch (error: any) {
      if (__DEV__ && !isSilentError(error)) console.warn('Error fetching procurement cycle metrics:', error);
      return { avgPRToPO: 0, avgPOToGRN: 0, avgGRNToInvoice: 0, bottlenecks: [] };
    }
  },
};
