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

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoading(false);

        validateToken();
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    } else if (token) {

      fetchUser();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateToken = async () => {
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

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {

    }
  };

  const fetchUser = async () => {
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);

      if (response.status === 'success' && response.data) {
        const token = response.data.access_token;
        const userData = response.data.user;

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
          throw new Error('Invalid response from server');
        }
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const response = await authAPI.register(username, password);

      if (response.status === 'success' && response.data) {
        const token = response.data.access_token;
        const userData = response.data.user;

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
          throw new Error('Invalid response from server');
        }
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
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

