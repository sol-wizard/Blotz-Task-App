import axios, { AxiosInstance } from "axios";
import * as Sentry from "@sentry/react-native";
import { API_CONFIG } from "./config";
import { setupRequestInterceptor, setupResponseInterceptor } from "./interceptors";

// trace axios request with Sentry span to record request time
function traced<T>(method: string, url: string, run: () => Promise<T>): Promise<T> {
  return Sentry.startSpan(
    {
      // create fix path name
      name: `${method} ${url.split("?")[0].replace(/\/\d+/g, "/:param")}`,
      op: "http.client",
      attributes: { "http.request.method": method, "url.full": url },
    },
    run,
  );
}

function createApiClient() {
  const instance: AxiosInstance = axios.create(API_CONFIG);

  setupRequestInterceptor(instance);
  setupResponseInterceptor(instance);

  return {
    async get<T>(url: string, config = {}): Promise<T> {
      return traced("GET", url, async () => (await instance.get<T>(url, config)).data);
    },

    async post<T>(url: string, data?: unknown, config = {}): Promise<T> {
      return traced("POST", url, async () => (await instance.post<T>(url, data, config)).data);
    },

    async put<T>(url: string, data?: unknown, config = {}): Promise<T> {
      return traced("PUT", url, async () => (await instance.put<T>(url, data, config)).data);
    },

    async patch<T>(url: string, data?: unknown, config = {}): Promise<T> {
      return traced("PATCH", url, async () => (await instance.patch<T>(url, data, config)).data);
    },

    async delete<T>(url: string, config = {}): Promise<T> {
      return traced("DELETE", url, async () => (await instance.delete<T>(url, config)).data);
    },
  };
}

export const apiClient = createApiClient();
