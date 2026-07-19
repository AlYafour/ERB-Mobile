import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
import { PaginatedResponse } from '@/types';

export interface Permission {
  id: number;
  name: string;
  category: string;
  action: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionSet {
  id: number;
  name: string;
  description?: string;
  permissions: Permission[];
  permissions_count: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: number;
  user: number;
  user_username: string;
  permission: Permission;
  permission_id: number;
  granted: boolean;
  granted_by?: number;
  granted_by_username?: string;
  granted_at: string;
  notes?: string;
}

export interface UserPermissionSummary {
  id: number;
  username: string;
  email: string;
  role: string;
  permission_set?: PermissionSet;
  permission_set_id?: number;
  permissions: Array<{ category: string; action: string }>;
}

export const permissionsApi = {
  getAllPermissions: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    action?: string;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<Permission>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.PERMISSIONS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Permission>>(endpoint, options);
    return unwrap(response, 'Failed to fetch permissions');
  },

  getPermissionById: async (id: number): Promise<Permission> => {
    const response = await apiClient.get<Permission>(API_ENDPOINTS.PERMISSION_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch permission');
  },

  getPermissionsByCategory: async (): Promise<Record<string, Permission[]>> => {
    const response = await apiClient.get<Record<string, Permission[]>>(API_ENDPOINTS.PERMISSIONS_BY_CATEGORY);
    return unwrap(response, 'Failed to fetch permissions by category');
  },

  getAllPermissionSets: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<PermissionSet>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.PERMISSION_SETS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PermissionSet>>(endpoint, options);
    return unwrap(response, 'Failed to fetch permission sets');
  },

  getPermissionSetById: async (id: number): Promise<PermissionSet> => {
    const response = await apiClient.get<PermissionSet>(API_ENDPOINTS.PERMISSION_SET_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch permission set');
  },

  createPermissionSet: async (data: Partial<PermissionSet>): Promise<PermissionSet> => {
    const response = await apiClient.post<PermissionSet>(API_ENDPOINTS.PERMISSION_SETS, data);
    return unwrap(response, 'Failed to create permission set');
  },

  updatePermissionSet: async (id: number, data: Partial<PermissionSet>): Promise<PermissionSet> => {
    const response = await apiClient.patch<PermissionSet>(API_ENDPOINTS.PERMISSION_SET_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update permission set');
  },

  deletePermissionSet: async (id: number): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PERMISSION_SET_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete permission set');
    }
  },

  assignPermissionsToSet: async (id: number, permissionIds: number[]): Promise<PermissionSet> => {
    const response = await apiClient.post<PermissionSet>(API_ENDPOINTS.PERMISSION_SET_ASSIGN_PERMISSIONS(String(id)), {
      permission_ids: permissionIds,
    });
    return unwrap(response, 'Failed to assign permissions');
  },

  getAllUserPermissions: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    user?: number;
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<UserPermission>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.USER_PERMISSIONS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<UserPermission>>(endpoint, options);
    return unwrap(response, 'Failed to fetch user permissions');
  },

  createUserPermission: async (data: Partial<UserPermission>): Promise<UserPermission> => {
    const response = await apiClient.post<UserPermission>(API_ENDPOINTS.USER_PERMISSIONS, data);
    return unwrap(response, 'Failed to create user permission');
  },

  deleteUserPermission: async (id: number): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.USER_PERMISSION_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete user permission');
    }
  },

  getUserPermissionSummary: async (userId: number): Promise<UserPermissionSummary> => {
    const response = await apiClient.get<UserPermissionSummary>(API_ENDPOINTS.USER_PERMISSION_SUMMARY(String(userId)));
    return unwrap(response, 'Failed to fetch user permission summary');
  },

  getUserPermissions: async (userId: number): Promise<{ permissions: Array<{ category: string; action: string }> }> => {
    const response = await apiClient.get<{ permissions: Array<{ category: string; action: string }> }>(API_ENDPOINTS.USER_PERMISSION_SUMMARY_PERMISSIONS(String(userId)));
    return unwrap(response, 'Failed to fetch user permissions');
  },

  assignPermissionSetToUser: async (userId: number, permissionSetId: number | null): Promise<UserPermissionSummary> => {
    const response = await apiClient.post<UserPermissionSummary>(API_ENDPOINTS.USER_PERMISSION_SUMMARY_ASSIGN_SET(String(userId)), {
      permission_set_id: permissionSetId,
    });
    return unwrap(response, 'Failed to assign permission set');
  },

  getMyPermissions: async (): Promise<{
    user_id: number;
    username: string;
    permission_set?: PermissionSet;
    permissions: Array<{ category: string; action: string }>;
  }> => {
    const response = await apiClient.get<{
      user_id: number;
      username: string;
      permission_set?: PermissionSet;
      permissions: Array<{ category: string; action: string }>;
    }>(API_ENDPOINTS.USER_PERMISSION_SUMMARY_ME);
    return unwrap(response, 'Failed to fetch my permissions');
  },

  checkPermissions: async (checks: Array<{ category: string; action: string }>): Promise<{
    results: Array<{ category: string; action: string; has_permission: boolean }>;
  }> => {
    const response = await apiClient.post<{
      results: Array<{ category: string; action: string; has_permission: boolean }>;
    }>(API_ENDPOINTS.CHECK_PERMISSIONS, { checks });
    return unwrap(response, 'Failed to check permissions');
  },
};
