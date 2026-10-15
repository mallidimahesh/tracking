import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vit_shuttle_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('vit_shuttle_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const res = await api.auth.getMe();
          setUser(res.user);
          localStorage.setItem('vit_shuttle_user', JSON.stringify(res.user));
        } catch (err) {
          console.warn('[Auth] Session invalid or expired:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('vit_shuttle_token', newToken);
    localStorage.setItem('vit_shuttle_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('vit_shuttle_token');
    localStorage.removeItem('vit_shuttle_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.auth.getMe();
      setUser(res.user);
      localStorage.setItem('vit_shuttle_user', JSON.stringify(res.user));
    } catch (err) {
      console.error('[Auth] Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
