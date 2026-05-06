import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
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
  }): Promise<PaginatedResponse<QuotationRequest>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.QUOTATION_REQUESTS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<QuotationRequest>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch quotation requests');
    }
    return response.data;
  },

  getById: async (id: number | string): Promise<QuotationRequest> => {
    const response = await apiClient.get<QuotationRequest>(API_ENDPOINTS.QUOTATION_REQUEST_DETAIL(String(id)));
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch quotation request');
    }
    return response.data;
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
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create quotation request');
    }
    return response.data;
  },

  update: async (id: number | string, data: Partial<QuotationRequest>): Promise<QuotationRequest> => {
    const response = await apiClient.patch<QuotationRequest>(API_ENDPOINTS.QUOTATION_REQUEST_DETAIL(String(id)), data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update quotation request');
    }
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.QUOTATION_REQUEST_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete quotation request');
    }
  },
};

