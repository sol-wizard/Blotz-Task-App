import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Auth0 from "react-native-auth0";
import { router } from "expo-router";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/constants/token-key";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.EXPO_PUBLIC_URL_WITH_API;
const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;

const auth0 = new Auth0({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
});

// ============================================================================
// Axios Instance
// ============================================================================

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Token Management
// ============================================================================

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
};

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    const buffer = 5 * 60 * 1000; // 5 minutes
    return Date.now() >= exp - buffer;
  } catch {
    return true;
  }
};

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const credentials = await auth0.auth.refreshToken({ refreshToken });

  if (!credentials.accessToken) {
    throw new Error('Failed to refresh token');
  }

  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, credentials.accessToken);

  if (credentials.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, credentials.refreshToken);
  }

  return credentials.accessToken;
};

// ============================================================================
// Request Interceptor
// ============================================================================

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

    if (token && isTokenExpired(token)) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          token = await refreshAccessToken();
          processQueue(null, token);
        } catch (error) {
          processQueue(error, null);
          throw error;
        } finally {
          isRefreshing = false;
        }
      } else {
        // Wait for ongoing refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              config.headers.Authorization = `Bearer ${newToken}`;
              resolve(config);
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: any) => Promise.reject(error)
);

// ============================================================================
// Response Interceptor
// ============================================================================

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newToken = await refreshAccessToken();
          processQueue(null, newToken);

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);

          // Clear tokens and redirect to log in
          await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

          // Navigate to log in screen
          router.replace("../(auth)/onboarding");

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Queue request while refresh is in progress
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject: (err) => {
            reject(err);
          },
        });
      });
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// Export
// ============================================================================

// Convenience methods
export const apiClient = {
  get: <T = any>(url: string, config = {}) =>
    api.get<T>(url, config).then(res => res.data),

  post: <T = any>(url: string, data?: any, config = {}) =>
    api.post<T>(url, data, config).then(res => res.data),

  put: <T = any>(url: string, data?: any, config = {}) =>
    api.put<T>(url, data, config).then(res => res.data),

  patch: <T = any>(url: string, data?: any, config = {}) =>
    api.patch<T>(url, data, config).then(res => res.data),

  delete: <T = any>(url: string, config = {}) =>
    api.delete<T>(url, config).then(res => res.data),
};