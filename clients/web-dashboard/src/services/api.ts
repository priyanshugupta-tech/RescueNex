import axios from 'axios';

// Dynamically read from import.meta.env for deployment, fallback to empty string (reverse proxy) or current origin
export const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Enables HTTP-only refreshToken cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach access token to every request if present in localStorage / memory
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rescuenex_token');
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
            localStorage.setItem('rescuenex_token', refreshRes.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${refreshRes.data.accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('rescuenex_token');
          localStorage.removeItem('rescuenex_user');
        }
      }
    }
    return Promise.reject(error);
  }
);
