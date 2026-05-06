import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { PurchaseQuotation, PurchaseQuotationItem, PaginatedResponse } from '@/types';

export const purchaseQuotationsApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    quotation_number?: string;
    notes?: string;
    payment_terms?: string;
    delivery_terms?: string;
    supplier?: number;
    quotation_request?: number;
    created_by?: number;
    total_min?: number;
    total_max?: number;
    subtotal_min?: number;
    subtotal_max?: number;
    quotation_date_after?: string;
    quotation_date_before?: string;
    valid_until_after?: string;
    valid_until_before?: string;
    created_at_after?: string;
    created_at_before?: string;
  }): Promise<PaginatedResponse<PurchaseQuotation>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.PURCHASE_QUOTATIONS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PurchaseQuotation>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch purchase quotations');
    }
    return response.data;
  },

  getById: async (id: number | string): Promise<PurchaseQuotation> => {
    const response = await apiClient.get<PurchaseQuotation>(API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id)));
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch purchase quotation');
    }
    return response.data;
  },

  create: async (data: {
    quotation_request?: number | null;
    purchase_request_id?: number | null;
    supplier_id: number;
    quotation_number: string;
    quotation_date: string;
    valid_until: string;
    payment_terms?: string;
    delivery_terms?: string;
    notes?: string;
    tax_rate?: number;
    discount?: number;
    items: Omit<PurchaseQuotationItem, 'product' | 'total' | 'created_at'>[];
  }): Promise<PurchaseQuotation> => {
    const response = await apiClient.post<PurchaseQuotation>(API_ENDPOINTS.PURCHASE_QUOTATIONS, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create purchase quotation');
    }
    return response.data;
  },

  update: async (id: number | string, data: Partial<PurchaseQuotation>): Promise<PurchaseQuotation> => {
    const response = await apiClient.patch<PurchaseQuotation>(API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id)), data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update purchase quotation');
    }
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete purchase quotation');
    }
  },

  award: async (id: number | string): Promise<PurchaseQuotation> => {
    const response = await apiClient.post<PurchaseQuotation>(`${API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id))}award/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to award purchase quotation');
    }
    return response.data;
  },

  reject: async (id: number | string): Promise<PurchaseQuotation> => {
    const response = await apiClient.post<PurchaseQuotation>(`${API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id))}reject/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to reject purchase quotation');
    }
    return response.data;
  },
};

