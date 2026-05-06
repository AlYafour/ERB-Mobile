import { apiClient } from '../api';
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
    search?: string;
    category?: string;
    action?: string;
  }): Promise<PaginatedResponse<Permission>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/permissions/${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Permission>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch permissions');
    }
    return response.data;
  },

  getPermissionById: async (id: number): Promise<Permission> => {
    const response = await apiClient.get<Permission>(`/api/permissions/${id}/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch permission');
    }
    return response.data;
  },

  getPermissionsByCategory: async (): Promise<Record<string, Permission[]>> => {
    const response = await apiClient.get<Record<string, Permission[]>>('/api/permissions/by_category/');
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch permissions by category');
    }
    return response.data;
  },

  getAllPermissionSets: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<PaginatedResponse<PermissionSet>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/permission-sets/${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<PermissionSet>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch permission sets');
    }
    return response.data;
  },

  getPermissionSetById: async (id: number): Promise<PermissionSet> => {
    const response = await apiClient.get<PermissionSet>(`/api/permission-sets/${id}/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch permission set');
    }
    return response.data;
  },

  createPermissionSet: async (data: Partial<PermissionSet>): Promise<PermissionSet> => {
    const response = await apiClient.post<PermissionSet>('/api/permission-sets/', data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create permission set');
    }
    return response.data;
  },

  updatePermissionSet: async (id: number, data: Partial<PermissionSet>): Promise<PermissionSet> => {
    const response = await apiClient.patch<PermissionSet>(`/api/permission-sets/${id}/`, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update permission set');
    }
    return response.data;
  },

  deletePermissionSet: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`/api/permission-sets/${id}/`);
    if (response.error) {
      throw new Error(response.error || 'Failed to delete permission set');
    }
  },

  assignPermissionsToSet: async (id: number, permissionIds: number[]): Promise<PermissionSet> => {
    const response = await apiClient.post<PermissionSet>(`/api/permission-sets/${id}/assign_permissions/`, {
      permission_ids: permissionIds,
    });
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to assign permissions');
    }
    return response.data;
  },

  getAllUserPermissions: async (params?: {
    page?: number;
    search?: string;
    user?: number;
  }): Promise<PaginatedResponse<UserPermission>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/user-permissions/${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<UserPermission>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch user permissions');
    }
    return response.data;
  },

  createUserPermission: async (data: Partial<UserPermission>): Promise<UserPermission> => {
    const response = await apiClient.post<UserPermission>('/api/user-permissions/', data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create user permission');
    }
    return response.data;
  },

  deleteUserPermission: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`/api/user-permissions/${id}/`);
    if (response.error) {
      throw new Error(response.error || 'Failed to delete user permission');
    }
  },

  getUserPermissionSummary: async (userId: number): Promise<UserPermissionSummary> => {
    const response = await apiClient.get<UserPermissionSummary>(`/api/user-permission-summary/${userId}/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch user permission summary');
    }
    return response.data;
  },

  getUserPermissions: async (userId: number): Promise<{ permissions: Array<{ category: string; action: string }> }> => {
    const response = await apiClient.get<{ permissions: Array<{ category: string; action: string }> }>(`/api/user-permission-summary/${userId}/permissions/`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch user permissions');
    }
    return response.data;
  },

  assignPermissionSetToUser: async (userId: number, permissionSetId: number | null): Promise<UserPermissionSummary> => {
    const response = await apiClient.post<UserPermissionSummary>(`/api/user-permission-summary/${userId}/assign_permission_set/`, {
      permission_set_id: permissionSetId,
    });
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to assign permission set');
    }
    return response.data;
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
    }>('/api/user-permission-summary/me/');
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch my permissions');
    }
    return response.data;
  },

  checkPermissions: async (checks: Array<{ category: string; action: string }>): Promise<{
    results: Array<{ category: string; action: string; has_permission: boolean }>;
  }> => {
    const response = await apiClient.post<{
      results: Array<{ category: string; action: string; has_permission: boolean }>;
    }>('/api/user-permission-summary/check/', { checks });
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to check permissions');
    }
    return response.data;
  },
};

