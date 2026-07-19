import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
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
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<GoodsReceivedNote>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.GOODS_RECEIVING}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<GoodsReceivedNote>>(endpoint, options);
    return unwrap(response, 'Failed to fetch goods receiving notes');
  },

  getById: async (id: number | string): Promise<GoodsReceivedNote> => {
    const response = await apiClient.get<GoodsReceivedNote>(API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch goods receiving note');
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
    return unwrap(response, 'Failed to create goods receiving note');
  },

  update: async (id: number | string, data: Partial<GoodsReceivedNote>): Promise<GoodsReceivedNote> => {
    const response = await apiClient.patch<GoodsReceivedNote>(API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update goods receiving note');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete goods receiving note');
    }
  },

  markInvoiceDelivered: async (id: number | string): Promise<GoodsReceivedNote> => {
    const response = await apiClient.post<GoodsReceivedNote>(`${API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id))}mark_invoice_delivered/`);
    return unwrap(response, 'Failed to mark invoice as delivered');
  },

  cancel: async (id: number | string): Promise<GoodsReceivedNote> => {
    const response = await apiClient.post<GoodsReceivedNote>(`${API_ENDPOINTS.GOODS_RECEIVING_DETAIL(String(id))}cancel/`);
    return unwrap(response, 'Failed to cancel goods receiving note');
  },
};
