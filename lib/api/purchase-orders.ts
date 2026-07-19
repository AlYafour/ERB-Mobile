import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
import { PurchaseOrder, PurchaseOrderItem, PaginatedResponse } from '@/types';

export const purchaseOrdersApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    order_number?: string;
    notes?: string;
    payment_terms?: string;
    delivery_terms?: string;
    supplier?: number;
    purchase_request?: number;
    purchase_quotation?: number;
    created_by?: number;
    status?: string;
    total_min?: number;
    total_max?: number;
    subtotal_min?: number;
    subtotal_max?: number;
    order_date_after?: string;
    order_date_before?: string;
    delivery_date_after?: string;
    delivery_date_before?: string;
    created_at_after?: string;
    created_at_before?: string;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<PurchaseOrder>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.PURCHASE_ORDERS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PurchaseOrder>>(endpoint, options);
    return unwrap(response, 'Failed to fetch purchase orders');
  },

  getById: async (id: number | string): Promise<PurchaseOrder> => {
    const response = await apiClient.get<PurchaseOrder>(API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch purchase order');
  },

  create: async (data: {
    purchase_request_id?: number | null;
    purchase_quotation_id?: number | null;
    supplier_id: number;
    order_date: string;
    delivery_date?: string;
    payment_terms?: string;
    delivery_terms?: string;
    notes?: string;
    tax_rate?: number;
    discount?: number;
    status?: string;
    items: Omit<PurchaseOrderItem, 'product' | 'total' | 'created_at'>[];
  }): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(API_ENDPOINTS.PURCHASE_ORDERS, data);
    return unwrap(response, 'Failed to create purchase order');
  },

  update: async (id: number | string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const response = await apiClient.patch<PurchaseOrder>(API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update purchase order');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete purchase order');
    }
  },

  approve: async (id: number | string): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(`${API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id))}approve/`);
    return unwrap(response, 'Failed to approve purchase order');
  },

  reject: async (id: number | string, rejection_reason: string): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(`${API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id))}reject/`, { rejection_reason });
    return unwrap(response, 'Failed to reject purchase order');
  },

  cancel: async (id: number | string, reason?: string): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(
      `${API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id))}cancel/`,
      reason ? { reason } : undefined,
    );
    return unwrap(response, 'Failed to cancel purchase order');
  },

  reopen: async (id: number | string): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(`${API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id))}reopen/`);
    return unwrap(response, 'Failed to reopen purchase order');
  },
};
