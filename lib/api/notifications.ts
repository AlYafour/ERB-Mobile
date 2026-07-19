import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
import { Notification, PaginatedResponse } from '@/types';

export const notificationsApi = {
  getAll: async (params?: {
    page?: number;
    is_read?: boolean;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<Notification>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Notification>>(endpoint, options);
    return unwrap(response, 'Failed to fetch notifications');
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<{ count: number }>(API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT);
    return unwrap(response, 'Failed to fetch unread count');
  },

  markAsRead: async (id: number | string): Promise<void> => {
    const response = await apiClient.patch(API_ENDPOINTS.MARK_NOTIFICATION_READ(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to mark notification as read');
    }
  },

  markAllAsRead: async (): Promise<void> => {
    const response = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ);
    if (response.error) {
      throw new Error(response.error || 'Failed to mark all notifications as read');
    }
  },

  clearAll: async (): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS_CLEAR_ALL);
    if (response.error) {
      throw new Error(response.error || 'Failed to clear all notifications');
    }
  },
};
