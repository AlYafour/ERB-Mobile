import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
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
  }): Promise<PaginatedResponse<Product>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.PRODUCTS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Product>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch products');
    }
    return response.data;
  },

  getById: async (id: number | string): Promise<Product> => {
    const response = await apiClient.get<Product>(API_ENDPOINTS.PRODUCT_DETAIL(String(id)));
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch product');
    }
    return response.data;
  },

  create: async (data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.post<Product>(API_ENDPOINTS.PRODUCTS, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create product');
    }
    return response.data;
  },

  update: async (id: number | string, data: Partial<Product>): Promise<Product> => {
    const response = await apiClient.patch<Product>(API_ENDPOINTS.PRODUCT_DETAIL(String(id)), data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update product');
    }
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PRODUCT_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete product');
    }
  },
};

