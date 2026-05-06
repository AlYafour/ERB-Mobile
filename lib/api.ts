import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
};

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

type AuthClearedCallback = () => void;

class ApiClient {
  private baseURL: string;
  private onAuthCleared: AuthClearedCallback | null = null;
  // Mutex: only one refresh in-flight at a time; concurrent callers share the result
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setOnAuthCleared(cb: AuthClearedCallback) {
    this.onAuthCleared = cb;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private getFetchOptions(additionalOptions: RequestInit = {}): RequestInit {
    const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && window.document);
    if (isWeb) {
      return { mode: 'cors', credentials: 'omit', ...additionalOptions };
    }
    return { ...additionalOptions };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (response.status === 0 || response.type === 'opaque') {
      return { status: 0, error: 'Network error: Unable to connect to server.' };
    }

    const status = response.status;
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    let data: any;
    try {
      const text = await response.text();
      if (isJson && text) {
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
      } else {
        data = text || null;
      }
    } catch { data = null; }

    if (!response.ok) {
      const errorMessage =
        data?.detail || data?.message || data?.error ||
        (typeof data === 'string' ? data : null) ||
        `HTTP ${status}`;
      return { status, error: errorMessage, data };
    }

    return { status, data: data as T };
  }

  private async refreshToken(): Promise<boolean> {
    // If a refresh is already running, reuse its result instead of starting another
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<boolean> {
    try {
      const storedRefresh = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!storedRefresh) return false;

      const response = await fetch(`${this.baseURL}${API_ENDPOINTS.REFRESH_TOKEN}`, {
        ...this.getFetchOptions(),
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ refresh: storedRefresh }),
      });

      if (response.ok) {
        const data = await response.json();
        const accessToken = data.access || data.access_token;
        if (accessToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          // Store rotated refresh token if backend sends a new one
          const newRefresh = data.refresh || data.refresh_token;
          if (newRefresh) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefresh);
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
    this.onAuthCleared?.();
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // All requests go through here — handles 401 with token refresh + retry
  private async executeRequest<T>(url: string, options: RequestInit, isRetry = false): Promise<ApiResponse<T>> {
    let response: Response;
    try {
      response = await this.fetchWithTimeout(url, options);
    } catch (error: any) {
      const msg = error.name === 'AbortError' ? 'Connection timed out. Check server URL.' : error.message || 'Network error';
      return { status: 0, error: msg };
    }

    if (response.status === 401 && !isRetry) {
      // Read the 401 body to determine the reason
      const text = await response.text();
      let body: any = {};
      try { body = JSON.parse(text); } catch {}

      const errorCode = body?.code;
      const isTokenError = errorCode === 'token_not_valid' || errorCode === 'token_not_provided';

      if (isTokenError) {
        // Mutex: all concurrent 401s share one refresh call, none runs in parallel
        const refreshed = await this.refreshToken();
        if (refreshed) {
          const newHeaders = await this.getAuthHeaders();
          return this.executeRequest<T>(url, { ...options, headers: newHeaders }, true);
        }
        // Refresh token also expired — force logout
        await this.clearAuth();
        return { status: 401, error: 'Session expired. Please login again.' };
      }

      // Real auth error (wrong password, account disabled, no credentials, etc.)
      const errMsg = body?.detail || body?.error || body?.message || 'Unauthorized';
      return { status: 401, error: errMsg, data: body };
    }

    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return this.executeRequest<T>(`${this.baseURL}${endpoint}`, {
      ...this.getFetchOptions(),
      method: 'GET',
      headers,
    });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return this.executeRequest<T>(`${this.baseURL}${endpoint}`, {
      ...this.getFetchOptions(),
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async postForm<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const authHeaders = await this.getAuthHeaders();
    // Omit Content-Type so fetch sets it automatically with the multipart boundary
    const { 'Content-Type': _, ...headersWithoutContentType } = authHeaders as Record<string, string>;
    return this.executeRequest<T>(`${this.baseURL}${endpoint}`, {
      ...this.getFetchOptions(),
      method: 'POST',
      headers: headersWithoutContentType,
      body: formData,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return this.executeRequest<T>(`${this.baseURL}${endpoint}`, {
      ...this.getFetchOptions(),
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return this.executeRequest<T>(`${this.baseURL}${endpoint}`, {
      ...this.getFetchOptions(),
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = await this.getAuthHeaders();
    return this.executeRequest<T>(`${this.baseURL}${endpoint}`, {
      ...this.getFetchOptions(),
      method: 'DELETE',
      headers,
    });
  }

  // Auth methods
  async login(username: string, password: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.post(API_ENDPOINTS.LOGIN, { username, password });

      if (response.data && response.status >= 200 && response.status < 300) {
        const data = response.data as any;
        const accessToken =
          data.access || data.access_token || data.tokens?.access || data.tokens?.access_token;
        const refreshToken =
          data.refresh || data.refresh_token || data.tokens?.refresh || data.tokens?.refresh_token;

        if (!accessToken || !refreshToken) {
          return { status: response.status, error: 'Invalid response from server: missing authentication tokens', data: response.data };
        }

        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        if (data.user) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        }
      } else {
        await this.clearAuth();
      }

      return response;
    } catch (error: any) {
      await this.clearAuth();
      return { status: 0, error: error.message || 'Network error during login' };
    }
  }

  async register(userData: any): Promise<ApiResponse<any>> {
    return this.post(API_ENDPOINTS.REGISTER, userData);
  }

  async logout(): Promise<void> {
    await this.post(API_ENDPOINTS.LOGOUT);
    await this.clearAuth();
  }

  async getCurrentUser(): Promise<any | null> {
    try {
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (userStr) {
        try { return JSON.parse(userStr); } catch {}
      }
      const response = await this.get(API_ENDPOINTS.USER_PROFILE);
      if (response.data) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  }
}

export const apiClient = new ApiClient();
