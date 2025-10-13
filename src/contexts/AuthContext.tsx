'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  username: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);

          setUser(userData);
          setIsLoading(false);

          try {
            await validateToken();
          } catch (error) {

            console.warn('Token validation failed, but keeping user data:', error);
          }
        } catch (error) {

          console.warn('Invalid stored user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsLoading(false);
        }
      } else if (token) {

        await fetchUser();
      } else {

        setIsLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateToken = async (retryCount = 0) => {
    try {
      const response = await authAPI.getProfile();
      if (response.status === 'success' && response.data && response.data.username) {
        const userData = {
          id: response.data.id,
          username: response.data.username,
          created_at: response.data.created_at || new Date().toISOString(),
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {

        console.warn('Invalid token response from server');

      }
    } catch (error: any) {

      if (error.response?.status === 401) {
        console.warn('Token expired or invalid - clearing auth data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } else if (error.code === 'NETWORK_ERROR' && retryCount < 2) {

        console.warn(`Network error validating token, retrying (${retryCount + 1}/2)...`);
        setTimeout(() => validateToken(retryCount + 1), 1000 * (retryCount + 1));
      } else {

        console.warn('Token validation failed due to network/server error:', error);

      }
    }
  };

  const fetchUser = async (retryCount = 0) => {
    try {
      const response = await authAPI.getProfile();
      if (response.status === 'success' && response.data && response.data.username) {
        const userData = {
          id: response.data.id,
          username: response.data.username,
          created_at: response.data.created_at || new Date().toISOString(),
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {

        console.warn('No valid user data in profile response');
        setUser(null);
      }
    } catch (error: any) {

      if (error.response?.status === 401) {
        console.warn('Token expired or invalid - clearing auth data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } else if (error.code === 'NETWORK_ERROR' && retryCount < 2) {

        console.warn(`Network error fetching user, retrying (${retryCount + 1}/2)...`);
        setTimeout(() => fetchUser(retryCount + 1), 1000 * (retryCount + 1));
        return;
      } else {

        console.warn('Failed to fetch user profile due to network/server error:', error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);

      if (response.status === 'success' && response.data) {

        const { access_token: token, user: userData } = response.data;

        if (token && userData && userData.username) {
          const userObject = {
            id: userData.id,
            username: userData.username,
            created_at: userData.created_at || new Date().toISOString(),
          };

          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userObject));
          setUser(userObject);
        } else {
          throw new Error('Invalid response from server - missing token or user data');
        }
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {

      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const response = await authAPI.register(username, password);

      if (response.status === 'success' && response.data) {

        const { access_token: token, user: userData } = response.data;

        if (token && userData && userData.username) {
          const userObject = {
            id: userData.id,
            username: userData.username,
            created_at: userData.created_at || new Date().toISOString(),
          };

          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userObject));
          setUser(userObject);
        } else {
          throw new Error('Invalid response from server - missing token or user data');
        }
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {

      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);

    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const value = React.useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

