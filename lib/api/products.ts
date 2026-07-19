import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
import { Product, PaginatedResponse } from '@/types';

export const productsApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    name?: string;
    code?: string;
    sku?: string;
    barcode?: string;
    description?: string;
    brand?: string;
    category?: string;
    unit?: string;
    status?: string;
    is_active?: boolean;
    discount_type?: string;
    unit_price_min?: number;
    unit_price_max?: number;
    buy_price_min?: number;
    buy_price_max?: number;
    stock_balance_min?: number;
    stock_balance_max?: number;
    supplier?: number;
    track_stock?: boolean;
    created_at_after?: string;
    created_at_before?: string;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<Product>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.PRODUCTS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Product>>(endpoint, options);
    return unwrap(response, 'Failed to fetch products');
  },

  getById: async (id: number | string): Promise<Product> => {
    const response = await apiClient.get<Product>(API_ENDPOINTS.PRODUCT_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch product');
  },

  create: async (data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.post<Product>(API_ENDPOINTS.PRODUCTS, data);
    return unwrap(response, 'Failed to create product');
  },

  update: async (id: number | string, data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.patch<Product>(API_ENDPOINTS.PRODUCT_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update product');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PRODUCT_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete product');
    }
  },
};
