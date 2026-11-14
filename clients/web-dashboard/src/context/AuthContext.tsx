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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshMe = async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
      }
    } catch {
      setUser(null);
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
        setUser(res.data.user);
      }
    }
  };

  const googleLogin = async (credential: string) => {
    const res = await api.post('/api/auth/oauth/google', { credential });
    if (res.data.accessToken) {
      localStorage.setItem('rescuenex_token', res.data.accessToken);
      if (res.data.user) {
        setUser(res.data.user);
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
        setUser(res.data.user);
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
    setUser(null);
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
