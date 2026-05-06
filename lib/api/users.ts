import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { User, PaginatedResponse } from '@/types';

export const usersApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    is_staff?: boolean;
    is_active?: boolean;
    date_joined_after?: string;
    date_joined_before?: string;
    last_login_after?: string;
    last_login_before?: string;
  }): Promise<PaginatedResponse<User>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.USERS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<User>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch users');
    }
    return response.data;
  },

  getById: async (id: number | string): Promise<User> => {
    const response = await apiClient.get<User>(API_ENDPOINTS.USER_DETAIL(String(id)));
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch user');
    }
    return response.data;
  },

  create: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.post<User>(API_ENDPOINTS.USERS, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create user');
    }
    return response.data;
  },

  update: async (id: number | string, data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<User>(API_ENDPOINTS.USER_DETAIL(String(id)), data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update user');
    }
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.USER_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete user');
    }
  },

  getPending: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/api/auth/users/pending/');
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch pending users');
    }
    return response.data;
  },

  approve: async (id: number | string, permissionSetId?: number): Promise<User> => {
    const response = await apiClient.post<User>(`${API_ENDPOINTS.USER_DETAIL(String(id))}approve/`, {
      permission_set_id: permissionSetId,
    });
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to approve user');
    }
    return response.data;
  },
};

