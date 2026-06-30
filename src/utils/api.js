import axios from "axios";
import { store } from "../store/index.js";
import { clearCredentials } from "../store/slices/authSlice.js";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // Automatically send cookies
  headers: {
    "Content-Type": "application/json"
  }
});

// Inject Bearer Token from Redux store if available
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to handle Token Expirations
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error status is 401 and token is expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshRes = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
        if (refreshRes.data.success) {
          const newToken = refreshRes.data.token;
          
          // Re-inject token and repeat original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear credentials and log out
        store.dispatch(clearCredentials());
      }
    }

    return Promise.reject(error);
  }
);

export default api;
