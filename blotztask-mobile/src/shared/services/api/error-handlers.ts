import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { clearTokens, forceRefreshAuthToken } from "./token-manager";
import { router } from "expo-router";
import { queryClient } from "@/shared/util/queryClient";
import { AUTH_QUERY_KEY } from "@/shared/hooks/useAuth";
import * as Sentry from "@sentry/react-native";
import Toast from "react-native-toast-message";
import i18n from "@/i18n";

export function handleAuthError(
  error: AxiosError,
  api: AxiosInstance,
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
) {
  // 401 which we attempt to refresh
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    return forceRefreshAuthToken()
      .then((newToken) => {
        if (!newToken) {
          throw new Error("Unable to refresh Auth0 credentials");
        }
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      })
      .catch((refreshError: unknown) => {
        // A voluntary logout also produces a burst of 401s: `useLogout` clears the cache and
        // credentials before the screens unmount, and their queries refetch without a token.
        // Only an *unexpected* loss of session deserves a toast and a Sentry record.
        if (queryClient.getQueryData(AUTH_QUERY_KEY) === true) {
          // Record why before the evidence is gone: the API's 401 body says whether the
          // token was rejected or the user is unknown, and the refresh error says whether
          // Auth0 could be reached at all.
          Sentry.captureMessage("session_cleared_after_401", {
            level: "warning",
            extra: {
              url: originalRequest.url,
              status: error.response?.status,
              body: error.response?.data,
              refreshError: String(refreshError),
            },
          });
          Toast.show({ type: "error", text1: i18n.t("errors.sessionExpired") });
        }

        clearTokens();
        // Ensure auth state flips immediately for guards + redirects.
        queryClient.setQueryData(AUTH_QUERY_KEY, false);
        router.replace("/(auth)/signin");

        return Promise.reject(error);
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
