import { apiClient } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { Project, PaginatedResponse } from '@/types';

export const projectsApi = {
  getAll: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    code?: string;
    name?: string;
    location?: string;
    contact_person?: string;
    mobile_number?: string;
    sector?: string;
    plot?: string;
    consultant?: string;
    project_status?: string;
    is_active?: boolean;
    created_at_after?: string;
    created_at_before?: string;
  }): Promise<PaginatedResponse<Project>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `${API_ENDPOINTS.PROJECTS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Project>>(endpoint);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch projects');
    }
    return response.data;
  },

  getById: async (id: number | string): Promise<Project> => {
    const response = await apiClient.get<Project>(API_ENDPOINTS.PROJECT_DETAIL(String(id)));
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch project');
    }
    return response.data;
  },

  create: async (data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.post<Project>(API_ENDPOINTS.PROJECTS, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create project');
    }
    return response.data;
  },

  update: async (id: number | string, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.patch<Project>(API_ENDPOINTS.PROJECT_DETAIL(String(id)), data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update project');
    }
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PROJECT_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete project');
    }
  },
};

