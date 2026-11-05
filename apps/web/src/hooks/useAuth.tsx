'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '@eventora/shared';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    localStorage.removeItem('eventora_mock_user');
    api.auth.me()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setUser(res.data);
          return;
        }
        setUser(null);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      if (res.data.token) localStorage.setItem('eventora_token', res.data.token);
      return { success: true };
    }

    return { success: false, message: res.message || 'Invalid credentials' };
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    const res = await api.auth.register({ name, email, password, role });
    if (res.success && res.data) {
      setUser(res.data.user);
      if (res.data.token) localStorage.setItem('eventora_token', res.data.token);
      return { success: true };
    }

    return { success: false, message: res.message || 'Registration failed' };
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    localStorage.removeItem('eventora_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
