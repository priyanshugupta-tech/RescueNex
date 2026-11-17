import axios from 'axios';

// Dynamically read from import.meta.env for deployment, fallback to empty string (reverse proxy) or current origin
export const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

// In-memory token store (React/Module memory store with sessionStorage fallback for active browser tab)
let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
  if (token) {
    sessionStorage.setItem('rescuenex_session_token', token);
  } else {
    sessionStorage.removeItem('rescuenex_session_token');
  }
};

export const getAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  return sessionStorage.getItem('rescuenex_session_token');
};

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Enables HTTP-only refreshToken cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach access token to every request from in-memory / sessionStorage store (never localStorage)
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically handle token refresh on 401 / 403 expired token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      const url = originalRequest.url || '';
      // Skip refreshing on login, signup, OTP, logout, or tokengen itself
      if (
        !url.includes('/api/auth/login') &&
        !url.includes('/api/auth/signup') &&
        !url.includes('/api/auth/verify-otp') &&
        !url.includes('/api/auth/otp') &&
        !url.includes('/api/auth/tokengen') &&
        !url.includes('/api/auth/logout')
      ) {
        originalRequest._retry = true;
        try {
          const refreshRes = await axios.get(`${API_BASE}/api/auth/tokengen`, { withCredentials: true });
          if (refreshRes.data.accessToken) {
            setAccessToken(refreshRes.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${refreshRes.data.accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          setAccessToken(null);
          sessionStorage.removeItem('rescuenex_session_user');
          localStorage.removeItem('rescuenex_user');
        }
      }
    }
    return Promise.reject(error);
  }
);
