import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { clearTokens, refreshToken } from "./token-manager";
import { router } from "expo-router";

export function handleAuthError(
  error: AxiosError,
  api: AxiosInstance,
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
) {
  // 401 which we attempt to refresh
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    return refreshToken()
      .then((newToken) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        console.log("get new tokens");
        return api(originalRequest);
      })
      .catch((refreshError) => {
        clearTokens();
        router.replace("../(auth)/onboarding");
        return Promise.reject(refreshError);
      });
  }
  return null;
}

export function handleOtherErrors(error: AxiosError) {
  const status = error.response?.status;

  if (!error.response) {
    // No response: network error / timeout
    console.warn("Network error or no response from server");
    // You could show a toast: "Check your internet connection"
  } else {
    switch (status) {
      case 403:
        console.warn("Access forbidden");
        // maybe router.replace or show "you don't have permissions" UI
        break;
      case 429:
        console.warn("Too many requests");
        break;
      case 500:
      case 502:
      case 503:
        console.error("Server error occurred");
        break;
      default:
        // fallback generic
        console.error(`Unhandled error status: ${status}`, error.response.data);
    }
  }
  return Promise.reject(error);
}
