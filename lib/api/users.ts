import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
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
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<User>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.USERS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<User>>(endpoint, options);
    return unwrap(response, 'Failed to fetch users');
  },

  getById: async (id: number | string): Promise<User> => {
    const response = await apiClient.get<User>(API_ENDPOINTS.USER_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch user');
  },

  create: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.post<User>(API_ENDPOINTS.USERS, data);
    return unwrap(response, 'Failed to create user');
  },

  update: async (id: number | string, data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<User>(API_ENDPOINTS.USER_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update user');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.USER_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete user');
    }
  },

  getPending: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>(API_ENDPOINTS.USERS_PENDING);
    return unwrap(response, 'Failed to fetch pending users');
  },

  approve: async (id: number | string, permissionSetId?: number): Promise<User> => {
    const response = await apiClient.post<User>(`${API_ENDPOINTS.USER_DETAIL(String(id))}approve/`, {
      permission_set_id: permissionSetId,
    });
    return unwrap(response, 'Failed to approve user');
  },
};
