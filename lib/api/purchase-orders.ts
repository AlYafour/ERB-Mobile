import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
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
  }): Promise<PaginatedResponse<PurchaseOrder>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.PURCHASE_ORDERS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PurchaseOrder>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch purchase orders');
    }
    return response.data;
  },

  getById: async (id: number | string): Promise<PurchaseOrder> => {
    const response = await apiClient.get<PurchaseOrder>(API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id)));
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch purchase order');
    }
    return response.data;
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
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create purchase order');
    }
    return response.data;
  },

  update: async (id: number | string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const response = await apiClient.patch<PurchaseOrder>(API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id)), data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update purchase order');
    }
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete purchase order');
    }
  },

  approve: async (id: number | string): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(`${API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id))}approve/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to approve purchase order');
    }
    return response.data;
  },

  reject: async (id: number | string, rejection_reason: string): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(`${API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id))}reject/`, { rejection_reason });
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to reject purchase order');
    }
    return response.data;
  },

  cancel: async (id: number | string, reason?: string): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(
      `${API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id))}cancel/`,
      reason ? { reason } : undefined,
    );
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to cancel purchase order');
    }
    return response.data;
  },

  reopen: async (id: number | string): Promise<PurchaseOrder> => {
    const response = await apiClient.post<PurchaseOrder>(`${API_ENDPOINTS.PURCHASE_ORDER_DETAIL(String(id))}reopen/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to reopen purchase order');
    }
    return response.data;
  },
};

