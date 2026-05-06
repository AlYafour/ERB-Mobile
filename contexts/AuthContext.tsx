import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // When tokens are cleared (expired refresh token), force logout
    apiClient.setOnAuthCleared(() => setUser(null));
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const hasTokens = await apiClient.isAuthenticated();
      if (!hasTokens) return; // No tokens → login screen

      // 1. Load user from AsyncStorage cache instantly (no network needed)
      const cachedUser = await apiClient.getCurrentUser();
      if (cachedUser) setUser(cachedUser);

      // 2. Proactively refresh the access token BEFORE the home screen fires
      //    API calls. Capped at 25 seconds so the splash never hangs forever.
      //    If Railway cold-start takes longer we still proceed — individual
      //    requests will auto-retry via the mutex refresh logic.
      await Promise.race([
        apiClient.proactiveRefresh(),
        new Promise<void>((resolve) => setTimeout(resolve, 25000)),
      ]);

    } catch {
      // Network failure — keep cached user and proceed to app
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.login(username, password);

      if (response.data && response.status >= 200 && response.status < 300) {
        try {
          const userData = await apiClient.getCurrentUser();
          if (userData) setUser(userData);
        } catch {
          // Profile fetch failed — tokens are stored, user will load on next request
        }
        return { success: true };
      }

      const errorMessage = response.error ||
        (response.status === 400 ? 'Invalid username or password' : 'Login failed');
      return { success: false, error: errorMessage };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await apiClient.register(userData);
      if (response.data) {
        // Auto login after registration using username
        if (userData.username && userData.password) {
          return await login(userData.username, userData.password);
        } else if (userData.email && userData.password) {
          // Fallback: try with email as username
          return await login(userData.email, userData.password);
        }
        return { success: true };
      }
      return { success: false, error: response.error || 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

