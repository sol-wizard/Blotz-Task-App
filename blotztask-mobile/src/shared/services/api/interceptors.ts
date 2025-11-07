import { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { router } from "expo-router";
import * as tokenManager from "./token-manager";

export function setupRequestInterceptor(api: AxiosInstance): void {
  api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        const token = await tokenManager.getValidToken();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    (error: any) => Promise.reject(error),
  );
}

export function setupResponseInterceptor(api: AxiosInstance): void {
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await tokenManager.refreshToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          await tokenManager.clearTokens();
          router.replace("../(auth)/onboarding");
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    },
  );
}
