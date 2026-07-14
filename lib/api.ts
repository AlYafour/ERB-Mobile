import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { secureTokenStorage } from '@/lib/secure-storage';

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
// 'ok' = new token stored, 'invalid' = refresh token expired (logout), 'network' = server unreachable (don't logout)
type RefreshResult = 'ok' | 'invalid' | 'network';

class ApiClient {
  private baseURL: string;
  private onAuthCleared: AuthClearedCallback | null = null;
  // Mutex: only one refresh in-flight at a time; concurrent callers share the result
  private refreshPromise: Promise<RefreshResult> | null = null;
  // Guard: clearAuth fires onAuthCleared only once per session
  private authCleared = false;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setOnAuthCleared(cb: AuthClearedCallback) {
    this.onAuthCleared = cb;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await secureTokenStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
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

  private async refreshToken(): Promise<RefreshResult> {
    // All concurrent callers share one refresh call
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this._doRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async _doRefresh(): Promise<RefreshResult> {
    try {
      const storedRefresh = await secureTokenStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!storedRefresh) return 'invalid';

      // 40-second timeout — Railway cold starts can take 30-60 seconds
      const response = await this.fetchWithTimeout(
        `${this.baseURL}${API_ENDPOINTS.REFRESH_TOKEN}`,
        {
          ...this.getFetchOptions(),
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ refresh: storedRefresh }),
        },
        40000,
      );

      if (response.ok) {
        const data = await response.json();
        const accessToken = data.access || data.access_token;
        if (accessToken) {
          await secureTokenStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          const newRefresh = data.refresh || data.refresh_token;
          if (newRefresh) {
            await secureTokenStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefresh);
          }
          return 'ok';
        }
        return 'invalid'; // server returned 200 but no token — treat as invalid
      }

      // 401 or 400 from the refresh endpoint = refresh token is genuinely expired
      if (response.status === 401 || response.status === 400) return 'invalid';

      // 5xx or unexpected = server-side problem, don't logout the user
      return 'network';
    } catch {
      // Network error / AbortError (timeout) — server unreachable, don't logout
      return 'network';
    }
  }

  private async clearAuth(): Promise<void> {
    // Only fire once per session — prevents multiple onAuthCleared calls from concurrent 401s
    if (this.authCleared) return;
    this.authCleared = true;
    await Promise.all([
      secureTokenStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      secureTokenStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
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
        const result = await this.refreshToken();
        if (result === 'ok') {
          const newHeaders = await this.getAuthHeaders();
          return this.executeRequest<T>(url, { ...options, headers: newHeaders }, true);
        }
        if (result === 'invalid') {
          // Refresh token genuinely expired — force logout once
          await this.clearAuth();
          return { status: 401, error: 'Session expired. Please login again.' };
        }
        // result === 'network': server unreachable during refresh — don't logout, just fail
        return { status: 0, error: 'Connection timed out. Please try again.' };
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

        // New session — reset the auth-cleared guard so clearAuth() can fire again if needed
        this.authCleared = false;
        await secureTokenStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        await secureTokenStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
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
    try {
      // Backend blacklists the refresh token from the body (accounts/views.py).
      // Without it the endpoint 400s and the session stays valid server-side.
      const refresh = await secureTokenStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refresh) {
        await this.post(API_ENDPOINTS.LOGOUT, { refresh });
      }
    } catch {
      // Local sign-out must always succeed even if the server is unreachable
    } finally {
      await this.clearAuth();
    }
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
    const token = await secureTokenStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  }

  /** Returns true if the stored access token has > 1 hour of validity left. */
  async isAccessTokenFresh(): Promise<boolean> {
    try {
      const token = await secureTokenStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) return false;
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        Array.from(atob(padded))
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const { exp } = JSON.parse(json);
      return !!exp && exp * 1000 > Date.now() + 3_600_000;
    } catch {
      return false;
    }
  }

  /**
   * Call this on app startup BEFORE the home screen loads.
   * If the access token is still valid (>1h left), skip the Railway round-trip entirely.
   * If expiring, refresh silently. Never throws.
   */
  async proactiveRefresh(): Promise<void> {
    try {
      const hasToken = await secureTokenStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!hasToken) return;

      // Skip the network call when the access token is still fresh.
      // This avoids hitting a cold Railway server on every app open.
      const fresh = await this.isAccessTokenFresh();
      if (fresh) return;

      const result = await this.refreshToken();
      if (result === 'invalid') {
        await this.clearAuth();
      }
    } catch {
      // Never block startup
    }
  }
}

export const apiClient = new ApiClient();
