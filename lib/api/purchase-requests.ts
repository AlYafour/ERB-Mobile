import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
import { PurchaseRequest, PurchaseRequestItem, PaginatedResponse } from '@/types';

export const purchaseRequestsApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    code?: string;
    title?: string;
    notes?: string;
    status?: string;
    created_by?: number;
    approved_by?: number;
    project?: number;
    project_code?: string;
    request_date_after?: string;
    request_date_before?: string;
    required_by_after?: string;
    required_by_before?: string;
    created_at_after?: string;
    created_at_before?: string;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<PurchaseRequest>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.PURCHASE_REQUESTS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PurchaseRequest>>(endpoint, options);
    return unwrap(response, 'Failed to fetch purchase requests');
  },

  getById: async (id: number | string): Promise<PurchaseRequest> => {
    const response = await apiClient.get<PurchaseRequest>(API_ENDPOINTS.PURCHASE_REQUEST_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch purchase request');
  },

  create: async (data: {
    project_id?: number | null;
    title: string;
    request_date: string;
    required_by: string;
    notes?: string;
    items: Omit<PurchaseRequestItem, 'product' | 'created_at'>[];
  }): Promise<PurchaseRequest> => {
    const response = await apiClient.post<PurchaseRequest>(API_ENDPOINTS.PURCHASE_REQUESTS, data);
    return unwrap(response, 'Failed to create purchase request');
  },

  update: async (id: number | string, data: Partial<PurchaseRequest>): Promise<PurchaseRequest> => {
    const response = await apiClient.patch<PurchaseRequest>(API_ENDPOINTS.PURCHASE_REQUEST_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update purchase request');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PURCHASE_REQUEST_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete purchase request');
    }
  },

  approve: async (id: number | string): Promise<PurchaseRequest> => {
    const response = await apiClient.post<PurchaseRequest>(`${API_ENDPOINTS.PURCHASE_REQUEST_DETAIL(String(id))}approve/`);
    return unwrap(response, 'Failed to approve purchase request');
  },

  reject: async (id: number | string, rejection_reason: string): Promise<PurchaseRequest> => {
    const response = await apiClient.post<PurchaseRequest>(`${API_ENDPOINTS.PURCHASE_REQUEST_DETAIL(String(id))}reject/`, {
      rejection_reason,
    });
    return unwrap(response, 'Failed to reject purchase request');
  },

  undoApproval: async (id: number | string): Promise<PurchaseRequest> => {
    const response = await apiClient.post<PurchaseRequest>(`${API_ENDPOINTS.PURCHASE_REQUEST_DETAIL(String(id))}undo_approval/`);
    return unwrap(response, 'Failed to undo approval');
  },

  resubmit: async (id: number | string, comment?: string): Promise<PurchaseRequest> => {
    const response = await apiClient.post<PurchaseRequest>(
      `${API_ENDPOINTS.PURCHASE_REQUEST_DETAIL(String(id))}resubmit/`,
      comment ? { resubmit_comment: comment } : undefined,
    );
    return unwrap(response, 'Failed to resubmit purchase request');
  },

  getTrackingTimeline: async (id: number | string): Promise<{
    purchase_request: {
      id: number;
      code: string;
      title: string;
      status: string;
    };
    timeline: Array<{
      stage: string;
      stage_name: string;
      status: 'completed' | 'in_progress' | 'pending' | 'rejected';
      user: string | null;
      user_role: string | null;
      timestamp: string | null;
      duration: string | null;
      notes: string | null;
      documents: Array<{
        type: string;
        url: string;
        name: string;
      }>;
      related_id: number;
      related_type: string;
    }>;
    current_stage: string;
    total_duration: string | null;
  }> => {
    const response = await apiClient.get<any>(`${API_ENDPOINTS.PURCHASE_REQUEST_DETAIL(String(id))}tracking_timeline/`);
    return unwrap(response, 'Failed to fetch tracking timeline');
  },
};
