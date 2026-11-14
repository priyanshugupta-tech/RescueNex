import axios from 'axios';

export const API_BASE = ''; // Proxy handles routing to http://localhost:5000

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

// Automatically handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/api/auth/')) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.get('/api/auth/tokengen', { withCredentials: true });
        if (refreshRes.data.accessToken) {
          localStorage.setItem('rescuenex_token', refreshRes.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${refreshRes.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        localStorage.removeItem('rescuenex_token');
      }
    }
    return Promise.reject(error);
  }
);
