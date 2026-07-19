import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
import { QuotationRequest, PaginatedResponse } from '@/types';

export const quotationRequestsApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    supplier?: number;
    purchase_request?: number;
    created_by?: number;
    notes?: string;
    status?: string;
    created_at_after?: string;
    created_at_before?: string;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<QuotationRequest>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.QUOTATION_REQUESTS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<QuotationRequest>>(endpoint, options);
    return unwrap(response, 'Failed to fetch quotation requests');
  },

  getById: async (id: number | string): Promise<QuotationRequest> => {
    const response = await apiClient.get<QuotationRequest>(API_ENDPOINTS.QUOTATION_REQUEST_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch quotation request');
  },

  create: async (data: {
    purchase_request_id: number;
    supplier_id: number;
    notes?: string;
    items: Array<{
      product_id: number;
      quantity: number;
      unit?: string;
      notes?: string;
    }>;
  }): Promise<QuotationRequest> => {
    const response = await apiClient.post<QuotationRequest>(API_ENDPOINTS.QUOTATION_REQUESTS, data);
    return unwrap(response, 'Failed to create quotation request');
  },

  update: async (id: number | string, data: Partial<QuotationRequest>): Promise<QuotationRequest> => {
    const response = await apiClient.patch<QuotationRequest>(API_ENDPOINTS.QUOTATION_REQUEST_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update quotation request');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.QUOTATION_REQUEST_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete quotation request');
    }
  },
};
