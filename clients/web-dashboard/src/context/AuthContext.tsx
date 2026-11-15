import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { User } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  signup: (formData: any) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('rescuenex_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(!user);

  const saveUser = (u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('rescuenex_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('rescuenex_user');
    }
  };

  const refreshMe = async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.data.success && res.data.user) {
        saveUser(res.data.user);
        return;
      }
    } catch {
      // If /api/auth/me fails, try explicit session token refresh before logging out
      try {
        const refreshRes = await api.get('/api/auth/tokengen');
        if (refreshRes.data.accessToken) {
          localStorage.setItem('rescuenex_token', refreshRes.data.accessToken);
          const meRes = await api.get('/api/auth/me');
          if (meRes.data.success && meRes.data.user) {
            saveUser(meRes.data.user);
            return;
          }
        }
      } catch {
        // Not authenticated
      }
      saveUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.data.accessToken) {
      localStorage.setItem('rescuenex_token', res.data.accessToken);
      if (res.data.user) {
        saveUser(res.data.user);
      }
    }
  };

  const googleLogin = async (credential: string) => {
    const res = await api.post('/api/auth/oauth/google', { credential });
    if (res.data.accessToken) {
      localStorage.setItem('rescuenex_token', res.data.accessToken);
      if (res.data.user) {
        saveUser(res.data.user);
      }
    }
  };

  const signup = async (formData: any) => {
    await api.post('/api/auth/signup', formData);
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await api.post('/api/auth/verify-otp', { email, otp });
    if (res.data.accessToken) {
      localStorage.setItem('rescuenex_token', res.data.accessToken);
      if (res.data.user) {
        saveUser(res.data.user);
      }
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // silent
    }
    localStorage.removeItem('rescuenex_token');
    saveUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, signup, verifyOtp, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
