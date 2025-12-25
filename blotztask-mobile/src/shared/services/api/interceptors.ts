// import { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
// import { handleAuthError, handleOtherErrors } from "./error-handlers";
// import { getAuthToken } from "./token-manager";

// export function setupRequestInterceptor(api: AxiosInstance): void {
//   api.interceptors.request.use(
//     async (config) => {
//       const token = await getAuthToken();

//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//       return config;
//     },
//     (error) => Promise.reject(error),
//   );
// }

// export function setupResponseInterceptor(api: AxiosInstance): void {
//   api.interceptors.response.use(
//     (response) => response,
//     async (error: AxiosError) => {
//       const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

//       // Try auth refresh logic first
//       const retryResult = await handleAuthError(error, api, originalRequest);
//       if (retryResult) {
//         return retryResult;
//       }

//       // Handle other status / network errors
//       return handleOtherErrors(error);
//     },
//   );
// }
import { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from "axios";
import { handleAuthError, handleOtherErrors } from "./error-handlers";
import { getAuthToken } from "./token-manager";

export function setupRequestInterceptor(api: AxiosInstance): void {
  api.interceptors.request.use(
    async (config) => {
      const token = await getAuthToken();

      const method = (config.method ?? "GET").toUpperCase();
      const fullUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;

      console.log("===== API REQUEST =====");
      console.log("method:", method);
      console.log("url:", fullUrl);

      if (token) {
        // 确保 headers 存在（有些 axios config 里可能是 undefined）
        const payload = decodeJwtPayload(token);
        console.log("JWT payload:", payload);

        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;

        console.log("auth-full:", `Bearer ${token}`);
      } else {
        console.log("auth: NO TOKEN");
      }

      console.log("=======================");

      return config;
    },
    (error) => Promise.reject(error),
  );
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
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
