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

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
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
    // Check if running on web
    const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && window.document);
    
    // For web platform, use CORS mode
    if (isWeb) {
      return {
        mode: 'cors',
        credentials: 'omit',
        ...additionalOptions,
      };
    }

    // For native platforms, no CORS needed
    return {
      ...additionalOptions,
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    // Handle network errors (status 0) - usually CORS or connection issues
    // Note: When CORS fails, response.status might be 0 or response.type might be 'opaque'
    if (response.status === 0 || response.type === 'opaque') {
      const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && window.document);
      const errorMessage = isWeb
        ? 'CORS Error: The server is not allowing requests from this origin. Please contact the administrator to configure CORS headers on the backend server.'
        : 'Network error: Unable to connect to server. Please check your internet connection.';
      
      return {
        status: 0,
        error: errorMessage,
      };
    }

    const status = response.status;

    // Read body first so we have the actual error message
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

    if (status === 401) {
      // If response contains an error message (e.g. "Invalid credentials"), show it directly
      const bodyError = data?.detail || data?.error || data?.message;
      if (bodyError) {
        return { status: 401, error: bodyError, data };
      }
      // Otherwise it's an expired token — try to refresh
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        await this.clearAuth();
        return { status: 401, error: 'Session expired. Please login again.' };
      }
      return { status: 401, error: 'Session expired. Please login again.' };
    }

    if (!response.ok) {
      const errorMessage =
        data?.detail || data?.message || data?.error ||
        (typeof data === 'string' ? data : null) ||
        `HTTP ${status}`;
      return { status, error: errorMessage, data };
    }

    return {
      status,
      data: data as T,
    };
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}${API_ENDPOINTS.REFRESH_TOKEN}`, {
        ...this.getFetchOptions(),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const accessToken = data.access || data.access_token;
        if (accessToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  private async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        ...this.getFetchOptions(),
        method: 'GET',
        headers,
      });
      return this.handleResponse<T>(response);
    } catch (error: any) {
      console.error('❌ GET request error:', error);
      const msg = error.name === 'AbortError' ? 'Connection timed out. Check server URL.' : error.message || 'Network error';
      return { status: 0, error: msg };
    }
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        ...this.getFetchOptions(),
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error: any) {
      console.error('❌ POST request error:', error);
      const msg = error.name === 'AbortError' ? 'Connection timed out. Check server URL.' : error.message || 'Network error';
      return { status: 0, error: msg };
    }
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        ...this.getFetchOptions(),
        method: 'PUT',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error: any) {
      console.error('❌ PUT request error:', error);
      const msg = error.name === 'AbortError' ? 'Connection timed out. Check server URL.' : error.message || 'Network error';
      return { status: 0, error: msg };
    }
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        ...this.getFetchOptions(),
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error: any) {
      console.error('❌ PATCH request error:', error);
      const msg = error.name === 'AbortError' ? 'Connection timed out. Check server URL.' : error.message || 'Network error';
      return { status: 0, error: msg };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        ...this.getFetchOptions(),
        method: 'DELETE',
        headers,
      });
      return this.handleResponse<T>(response);
    } catch (error: any) {
      console.error('❌ DELETE request error:', error);
      const msg = error.name === 'AbortError' ? 'Connection timed out. Check server URL.' : error.message || 'Network error';
      return { status: 0, error: msg };
    }
  }

  // Auth methods
  async login(username: string, password: string): Promise<ApiResponse<any>> {
    try {
      console.log('🔐 Attempting login with username:', username);
      
      // Backend expects username, not email
      const response = await this.post(API_ENDPOINTS.LOGIN, { username, password });

      console.log('📥 Login response:', {
        status: response.status,
        hasData: !!response.data,
        hasError: !!response.error,
      });

      // Only proceed if login was successful (status 200-299)
      if (response.data && response.status >= 200 && response.status < 300) {
        // Validate that we have access and refresh tokens
        // Backend returns tokens in different formats:
        // Format 1: { access: "...", refresh: "..." }
        // Format 2: { access_token: "...", refresh_token: "..." }
        // Format 3: { tokens: { access: "...", refresh: "..." } }
        const data = response.data as any;
        const accessToken = 
          data.access || 
          data.access_token || 
          data.tokens?.access ||
          data.tokens?.access_token;
        const refreshToken = 
          data.refresh || 
          data.refresh_token || 
          data.tokens?.refresh ||
          data.tokens?.refresh_token;

        console.log('🔑 Tokens check:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          responseStructure: {
            hasAccess: !!data.access,
            hasAccessToken: !!data.access_token,
            hasTokens: !!data.tokens,
            tokensHasAccess: !!data.tokens?.access,
          },
        });

        // CRITICAL: Don't store anything if tokens are missing
        if (!accessToken || !refreshToken) {
          console.error('❌ Login response missing tokens:', {
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
            responseData: response.data,
          });
          return {
            status: response.status,
            error: 'Invalid response from server: missing authentication tokens',
            data: response.data,
          };
        }

        // Store tokens safely - only if both are present
        try {
          console.log('💾 Storing tokens...');
          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          console.log('✅ Tokens stored successfully');
          
          // Store user data if available
          if (data.user) {
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
            console.log('✅ User data stored');
          }
          
          // Verify storage
          const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
          console.log('🔍 Verification - Token stored:', !!storedToken);
          
        } catch (storageError) {
          console.error('❌ Error storing tokens:', storageError);
          // Clear any partial storage
          await this.clearAuth();
          return {
            status: response.status,
            error: 'Failed to store authentication tokens',
            data: response.data,
          };
        }
      } else {
        // Login failed - don't store anything and return error
        console.error('❌ Login failed:', {
          status: response.status,
          error: response.error,
          data: response.data,
        });
        // Make sure we don't have any stale tokens
        await this.clearAuth();
      }

      return response;
    } catch (error: any) {
      console.error('❌ Login exception:', error);
      // Clear any partial storage on error
      await this.clearAuth();
      return {
        status: 0,
        error: error.message || 'Network error during login',
      };
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
      // First try to get from storage
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          // Continue to fetch from API
        }
      }
      
      // If not in storage, fetch from API
      console.log('📡 Fetching user from API...');
      const response = await this.get(API_ENDPOINTS.USER_PROFILE);
      
      if (response.data) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
        console.log('✅ User data fetched and stored');
        return response.data;
      }
      
      if (response.error) {
        console.error('❌ Error fetching user:', response.error);
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Exception in getCurrentUser:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  }
}

export const apiClient = new ApiClient();

