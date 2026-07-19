import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
import { Supplier, PaginatedResponse } from '@/types';

export const suppliersApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    name?: string;
    business_name?: string;
    supplier_number?: string;
    first_name?: string;
    last_name?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    telephone?: string;
    mobile?: string;
    city?: string;
    state?: string;
    country?: string;
    trn?: string;
    tax_id?: string;
    currency?: string;
    is_active?: boolean;
    created_at_after?: string;
    created_at_before?: string;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<Supplier>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.SUPPLIERS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Supplier>>(endpoint, options);
    return unwrap(response, 'Failed to fetch suppliers');
  },

  getAllActive: async (): Promise<Supplier[]> => {
    const allSuppliers: Supplier[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await suppliersApi.getAll({
        page,
        page_size: 100,
        is_active: true
      });

      if (response.results && response.results.length > 0) {
        allSuppliers.push(...response.results);
        hasMore = !!response.next;
        page++;
      } else {
        hasMore = false;
      }
    }

    return allSuppliers;
  },

  getById: async (id: number | string): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>(API_ENDPOINTS.SUPPLIER_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch supplier');
  },

  create: async (data: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>(API_ENDPOINTS.SUPPLIERS, data);
    return unwrap(response, 'Failed to create supplier');
  },

  update: async (id: number | string, data: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.patch<Supplier>(API_ENDPOINTS.SUPPLIER_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update supplier');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.SUPPLIER_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete supplier');
    }
  },
};
