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
      const isAuth = await apiClient.isAuthenticated();
      if (isAuth) {
        const userData = await apiClient.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('🚀 AuthContext: Starting login...');
      const response = await apiClient.login(username, password);
      
      console.log('📥 AuthContext: Login response received:', {
        status: response.status,
        hasData: !!response.data,
        hasError: !!response.error,
      });
      
      // If apiClient.login() succeeded, tokens are already stored
      // We only need to check if the response was successful
      if (response.data && response.status >= 200 && response.status < 300) {
        console.log('✅ AuthContext: Login successful, fetching user data...');
        
        // Try to get user data - if this fails, tokens might be invalid
        try {
          const userData = await apiClient.getCurrentUser();
          console.log('👤 AuthContext: User data:', userData ? 'Received' : 'Not available');
          
          if (userData) {
            setUser(userData);
            console.log('✅ AuthContext: Login complete, user set');
            return { success: true };
          } else {
            // User data not available, but tokens are stored
            // This might happen if user endpoint fails, but login was successful
            console.log('⚠️ AuthContext: User data not available, but login successful');
            return { success: true };
          }
        } catch (userError) {
          console.error('❌ AuthContext: Error fetching user after login:', userError);
          // Even if user fetch fails, login was successful and tokens are stored
          // User can be fetched later
          return { success: true };
        }
      }
      
      // Login failed - return error message
      console.error('❌ AuthContext: Login failed');
      const errorMessage = response.error || 
        (response.status === 400 ? 'Invalid username or password' : 'Login failed');
      return { success: false, error: errorMessage };
    } catch (error: any) {
      console.error('❌ AuthContext: Login exception:', error);
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

