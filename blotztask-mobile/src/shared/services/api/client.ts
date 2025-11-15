import axios, { AxiosInstance } from "axios";
import { API_CONFIG } from "./config";
import { setupRequestInterceptor, setupResponseInterceptor } from "./interceptors";

function createApiClient() {
  const instance: AxiosInstance = axios.create(API_CONFIG);

  setupRequestInterceptor(instance);
  setupResponseInterceptor(instance);

  return {
    async get<T = any>(url: string, config = {}): Promise<T> {
      const response = await instance.get<T>(url, config);
      return response.data;
    },

    async post<T = any>(url: string, data?: any, config = {}): Promise<T> {
      const response = await instance.post<T>(url, data, config);
      return response.data;
    },

    async put<T = any>(url: string, data?: any, config = {}): Promise<T> {
      const response = await instance.put<T>(url, data, config);
      return response.data;
    },

    async patch<T = any>(url: string, data?: any, config = {}): Promise<T> {
      const response = await instance.patch<T>(url, data, config);
      return response.data;
    },

    async delete<T = any>(url: string, config = {}): Promise<T> {
      const response = await instance.delete<T>(url, config);
      return response.data;
    },

    getRawInstance(): AxiosInstance {
      return instance;
    },
  };
}

export const apiClient = createApiClient();
