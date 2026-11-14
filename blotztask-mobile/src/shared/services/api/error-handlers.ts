import { AxiosError, AxiosInstance, InternalAxiosRequestConfig, isAxiosError } from "axios";
import { clearTokens, describeRefreshFailure, forceRefreshAuthToken } from "./token-manager";
import { classifyRefreshFailure } from "./refresh-failure";
import { router } from "expo-router";
import { queryClient } from "@/shared/util/queryClient";
import { AUTH_QUERY_KEY } from "@/shared/hooks/useAuth";
import * as Sentry from "@sentry/react-native";
import Toast from "react-native-toast-message";
import i18n from "@/i18n";

// Record why before the evidence is gone: the API's 401 body says whether the token was
// rejected or the user is unknown, and the refresh error says whether Auth0 could be
// reached at all. The `.catch` below also receives a failed retry of the request itself,
// which is an API error, not a refresh failure.
/* eslint-disable camelcase */
async function reportSessionCleared(
  error: AxiosError,
  originalRequest: InternalAxiosRequestConfig,
  refreshError: unknown,
) {
  const { tags, extra } = isAxiosError(refreshError)
    ? {
        tags: {
          failure_reason: "retry_request_failed",
          entry_point: "retry_401",
          http_status: String(refreshError.response?.status ?? 0),
        },
        extra: { message: refreshError.message },
      }
    : await describeRefreshFailure(classifyRefreshFailure(refreshError), "retry_401");

  Sentry.captureMessage("session_cleared_after_401", {
    level: "warning",
    tags,
    extra: {
      ...extra,
      url: originalRequest.url,
      status: error.response?.status,
      body: error.response?.data,
    },
  });
}
/* eslint-enable camelcase */

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
        const authState = queryClient.getQueryData(AUTH_QUERY_KEY);
        // Parallel requests all land here after one failed refresh. The first one signs the
        // user out; the rest find the session already gone and only fail their request.
        if (authState === false) {
          return Promise.reject(error);
        }

        // A voluntary logout also produces a burst of 401s: `useLogout` clears the cache and
        // credentials before the screens unmount, and their queries refetch without a token.
        // Only an *unexpected* loss of session deserves a toast and a Sentry record.
        if (authState === true) {
          reportSessionCleared(error, originalRequest, refreshError).catch(() => {});
          Toast.show({ type: "error", text1: i18n.t("errors.sessionExpired") });
        }

        clearTokens().catch(() => {});
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
