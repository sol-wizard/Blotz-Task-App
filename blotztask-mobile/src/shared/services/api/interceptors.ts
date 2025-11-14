import { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { handleAuthError, handleOtherErrors } from "./error-handlers";
import { getValidToken } from "./token-manager";

export function setupRequestInterceptor(api: AxiosInstance): void {
  api.interceptors.request.use(
    async (config) => {
      const token = await getValidToken();
      if (token && config.headers) {
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

      // Try auth refresh logic first
      const retryResult = await handleAuthError(error, api, originalRequest);
      if (retryResult) {
        return retryResult;
      }

      // Handle other status / network errors
      return handleOtherErrors(error);
    },
  );
}
