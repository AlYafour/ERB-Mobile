import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
import { PurchaseInvoice, PurchaseInvoiceItem, PaginatedResponse } from '@/types';

export const purchaseInvoicesApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    purchase_order?: number;
    status?: string;
    created_by?: number;
    invoice_date_after?: string;
    invoice_date_before?: string;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<PurchaseInvoice>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.PURCHASE_INVOICES}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PurchaseInvoice>>(endpoint, options);
    return unwrap(response, 'Failed to fetch purchase invoices');
  },

  getById: async (id: number | string): Promise<PurchaseInvoice> => {
    const response = await apiClient.get<PurchaseInvoice>(API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch purchase invoice');
  },

  create: async (data: {
    purchase_order_id: number;
    grn_id?: number;
    invoice_date: string;
    due_date?: string;
    status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
    tax_rate?: number;
    discount?: number;
    notes?: string;
    items: Omit<PurchaseInvoiceItem, 'id' | 'created_at' | 'product'>[];
  }): Promise<PurchaseInvoice> => {
    const response = await apiClient.post<PurchaseInvoice>(API_ENDPOINTS.PURCHASE_INVOICES, data);
    return unwrap(response, 'Failed to create purchase invoice');
  },

  update: async (id: number | string, data: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> => {
    const response = await apiClient.patch<PurchaseInvoice>(API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update purchase invoice');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete purchase invoice');
    }
  },

  approve: async (id: number | string): Promise<PurchaseInvoice> => {
    const response = await apiClient.post<PurchaseInvoice>(`${API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id))}approve/`);
    return unwrap(response, 'Failed to approve purchase invoice');
  },

  reject: async (id: number | string, rejection_reason: string): Promise<PurchaseInvoice> => {
    const response = await apiClient.post<PurchaseInvoice>(`${API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id))}reject/`, { rejection_reason });
    return unwrap(response, 'Failed to reject purchase invoice');
  },

  markPaid: async (
    id: number | string,
    data: {
      paid_amount?: number;
      payment_date?: string;
      payment_method?: string;
      payment_reference?: string;
    }
  ): Promise<PurchaseInvoice> => {
    const response = await apiClient.post<PurchaseInvoice>(`${API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id))}mark_paid/`, data);
    return unwrap(response, 'Failed to mark invoice as paid');
  },
};
