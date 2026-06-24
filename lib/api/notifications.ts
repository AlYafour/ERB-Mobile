import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { Notification, PaginatedResponse } from '@/types';

export const notificationsApi = {
  getAll: async (params?: {
    page?: number;
    is_read?: boolean;
  }): Promise<PaginatedResponse<Notification>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.NOTIFICATIONS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Notification>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch notifications');
    }
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get<{ count: number }>('/api/notifications/unread_count/');
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch unread count');
    }
    return response.data;
  },

  markAsRead: async (id: number | string): Promise<void> => {
    const response = await apiClient.patch(`${API_ENDPOINTS.NOTIFICATION_DETAIL(String(id))}mark_read/`);
    if (response.error) {
      throw new Error(response.error || 'Failed to mark notification as read');
    }
  },

  markAllAsRead: async (): Promise<void> => {
    const response = await apiClient.post('/api/notifications/mark_all_read/');
    if (response.error) {
      throw new Error(response.error || 'Failed to mark all notifications as read');
    }
  },

  clearAll: async (): Promise<void> => {
    const response = await apiClient.delete('/api/notifications/clear_all/');
    if (response.error) {
      throw new Error(response.error || 'Failed to clear all notifications');
    }
  },
};

