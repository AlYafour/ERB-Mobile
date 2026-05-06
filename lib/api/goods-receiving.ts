import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { PaginatedResponse, Product, PurchaseOrder } from '@/types';

export interface GRNItem {
  id?: number;
  purchase_order_item_id: number;
  product_id: number;
  product?: Product;
  ordered_quantity: number;
  received_quantity: number;
  rejected_quantity: number;
  quality_status: 'good' | 'damaged' | 'defective' | 'missing';
  notes?: string;
  created_at?: string;
}

export interface GoodsReceivedNote {
  id: number;
  purchase_order?: number | PurchaseOrder;
  purchase_order_id: number;
  grn_number: string;
  receipt_date: string;
  status: 'draft' | 'partial' | 'completed' | 'cancelled';
  notes?: string;
  items: GRNItem[];
  received_by: number;
  received_by_name?: string;
  total_items?: number;
  total_received_quantity?: number;
  invoices?: Array<{ id: number; invoice_number: string; [key: string]: any }>;
  material_images?: Array<{ id: number; image: string; image_url: string; created_at: string }>;
  supplier_invoice_file?: string | null;
  supplier_invoice_file_url?: string | null;
  invoice_delivery_status?: 'not_delivered' | 'delivered';
  created_at: string;
  updated_at: string;
}

export const goodsReceivingApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    purchase_order?: number;
    status?: string;
    receipt_date_after?: string;
    receipt_date_before?: string;
  }): Promise<PaginatedResponse<GoodsReceivedNote>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.GOODS_RECEIVING}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<GoodsReceivedNote>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch goods receiving notes');
    }
    return response.data;
  },

  getById: async (id: number | string): Promise<GoodsReceivedNote> => {
    const response = await apiClient.get<GoodsReceivedNote>(API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id)));
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch goods receiving note');
    }
    return response.data;
  },

  create: async (data: {
    purchase_order_id: number;
    receipt_date: string;
    status?: 'draft' | 'partial' | 'completed' | 'cancelled';
    notes?: string;
    items: Omit<GRNItem, 'id' | 'created_at' | 'product'>[];
    material_images?: any[];
    supplier_invoice_file?: any | null;
    invoice_delivery_status?: 'not_delivered' | 'delivered';
  }): Promise<GoodsReceivedNote> => {
    // For mobile, we'll send as JSON (images will be handled separately if needed)
    const response = await apiClient.post<GoodsReceivedNote>(API_ENDPOINTS.GOODS_RECEIVING, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create goods receiving note');
    }
    return response.data;
  },

  update: async (id: number | string, data: Partial<GoodsReceivedNote>): Promise<GoodsReceivedNote> => {
    const response = await apiClient.patch<GoodsReceivedNote>(API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id)), data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update goods receiving note');
    }
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete goods receiving note');
    }
  },

  markInvoiceDelivered: async (id: number | string): Promise<GoodsReceivedNote> => {
    const response = await apiClient.post<GoodsReceivedNote>(`${API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id))}mark_invoice_delivered/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to mark invoice as delivered');
    }
    return response.data;
  },
};

