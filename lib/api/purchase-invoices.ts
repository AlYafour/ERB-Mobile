import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
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
  }): Promise<PaginatedResponse<PurchaseInvoice>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.PURCHASE_INVOICES}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PurchaseInvoice>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch purchase invoices');
    }
    return response.data;
  },

  getById: async (id: number | string): Promise<PurchaseInvoice> => {
    const response = await apiClient.get<PurchaseInvoice>(API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id)));
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch purchase invoice');
    }
    return response.data;
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
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create purchase invoice');
    }
    return response.data;
  },

  update: async (id: number | string, data: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> => {
    const response = await apiClient.patch<PurchaseInvoice>(API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id)), data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update purchase invoice');
    }
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete purchase invoice');
    }
  },

  approve: async (id: number | string): Promise<PurchaseInvoice> => {
    const response = await apiClient.post<PurchaseInvoice>(`${API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id))}approve/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to approve purchase invoice');
    }
    return response.data;
  },

  reject: async (id: number | string, rejection_reason: string): Promise<PurchaseInvoice> => {
    const response = await apiClient.post<PurchaseInvoice>(`${API_ENDPOINTS.PURCHASE_INVOICE_DETAIL(String(id))}reject/`, { rejection_reason });
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to reject purchase invoice');
    }
    return response.data;
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
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to mark invoice as paid');
    }
    return response.data;
  },
};

