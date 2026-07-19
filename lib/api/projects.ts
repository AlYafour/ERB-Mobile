import { apiClient, unwrap } from '../api';
import { API_ENDPOINTS } from '@/constants/api';
import { buildQueryString } from '@/lib/utils/format';
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
  }, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<Project>> => {
    const queryString = buildQueryString(params || {});
    const endpoint = `${API_ENDPOINTS.PROJECTS}${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<PaginatedResponse<Project>>(endpoint, options);
    return unwrap(response, 'Failed to fetch projects');
  },

  getById: async (id: number | string): Promise<Project> => {
    const response = await apiClient.get<Project>(API_ENDPOINTS.PROJECT_DETAIL(String(id)));
    return unwrap(response, 'Failed to fetch project');
  },

  create: async (data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.post<Project>(API_ENDPOINTS.PROJECTS, data);
    return unwrap(response, 'Failed to create project');
  },

  update: async (id: number | string, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.patch<Project>(API_ENDPOINTS.PROJECT_DETAIL(String(id)), data);
    return unwrap(response, 'Failed to update project');
  },

  delete: async (id: number | string): Promise<void> => {
    const response = await apiClient.delete(API_ENDPOINTS.PROJECT_DETAIL(String(id)));
    if (response.error) {
      throw new Error(response.error || 'Failed to delete project');
    }
  },
};
