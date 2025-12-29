import { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { handleAuthError, handleOtherErrors } from "./error-handlers";
import { getAuthToken } from "./token-manager";

export function setupRequestInterceptor(api: AxiosInstance): void {
  api.interceptors.request.use(
    async (config) => {
      const token = await getAuthToken();

      if (token) {
        // 确保 headers 存在（有些 axios config 里可能是 undefined）
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error),
  );
}

export function setupResponseInterceptor(api: AxiosInstance): void {
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      const retryResult = await handleAuthError(error, api, originalRequest);
      if (retryResult) return retryResult;

      return handleOtherErrors(error);
    },
  );
}
