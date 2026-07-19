import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
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
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<PurchaseQuotation>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.PURCHASE_QUOTATIONS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PurchaseQuotation>>(endpoint, options);
    return unwrap(response, 'Failed to fetch purchase quotations');
  },

  getById: async (id: number | string): Promise<PurchaseQuotation> => {
    const response = await apiClient.get<PurchaseQuotation>(API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch purchase quotation');
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
    return unwrap(response, 'Failed to create purchase quotation');
  },

  update: async (id: number | string, data: Partial<PurchaseQuotation>): Promise<PurchaseQuotation> => {
    const response = await apiClient.patch<PurchaseQuotation>(API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update purchase quotation');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete purchase quotation');
    }
  },

  award: async (id: number | string): Promise<PurchaseQuotation> => {
    const response = await apiClient.post<PurchaseQuotation>(`${API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id))}award/`);
    return unwrap(response, 'Failed to award purchase quotation');
  },

  reject: async (id: number | string, reason?: string): Promise<PurchaseQuotation> => {
    const response = await apiClient.post<PurchaseQuotation>(
      `${API_ENDPOINTS.PURCHASE_QUOTATION_DETAIL(String(id))}reject/`,
      reason ? { rejection_reason: reason } : undefined,
    );
    return unwrap(response, 'Failed to reject purchase quotation');
  },
};
