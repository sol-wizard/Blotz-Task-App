import { AxiosError, AxiosInstance, InternalAxiosRequestConfig, isAxiosError } from "axios";
import {
  clearTokens,
  describeRefreshFailure,
  forceRefreshAuthToken,
  reportRefreshFailure,
} from "./token-manager";
import { SESSION_KEPT_ERROR_CODE, type RefreshFailure } from "./refresh-failure";
import { resolveRefreshFailure } from "./refresh-failure-overrides";
import { router } from "expo-router";
import { queryClient } from "@/shared/util/queryClient";
import { AUTH_QUERY_KEY } from "@/shared/hooks/useAuth";
import * as Sentry from "@sentry/react-native";
import Toast from "react-native-toast-message";
import { Platform } from "react-native";
import i18n from "@/i18n";

// Record why before the evidence is gone: the API's 401 body says whether the token was
// rejected or the user is unknown, and the refresh error says whether Auth0 could be
// reached at all. When the refresh worked and the API answered the retried request with
// another 401, there is no refresh failure: `failure` is that second 401, whose body says
// why the fresh token was rejected too.
/* eslint-disable camelcase */
async function reportSessionCleared(
  error: AxiosError,
  originalRequest: InternalAxiosRequestConfig,
  failure: RefreshFailure | AxiosError,
) {
  const { tags, extra } = isAxiosError(failure)
    ? {
        tags: {
          failure_reason: "retry_still_401",
          failure_action: "sign_out",
          entry_point: "retry_401",
          platform: Platform.OS,
        },
        extra: { retry_body: failure.response?.data },
      }
    : await describeRefreshFailure(failure, "retry_401");

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
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      })
      .catch((failure: unknown) => {
        // The refresh worked and the retried request failed on its own (500, timeout…). That
        // says nothing about the session: fail this request only. It already went through
        // the response interceptor, so pass its error on as it is.
        if (isAxiosError(failure) && failure.response?.status !== 401) {
          return Promise.reject(failure);
        }

        const authState = queryClient.getQueryData(AUTH_QUERY_KEY);
        // Parallel requests all land here after one failed refresh. The first one signs the
        // user out; the rest find the session already gone and only fail their request.
        if (authState === false) {
          return Promise.reject(error);
        }

        // An axios error here is the retried request answered with another 401: the fresh
        // token was rejected too, so the session is unusable. Anything else is the refresh
        // itself failing.
        const sessionFailure = isAxiosError(failure) ? failure : resolveRefreshFailure(failure);

        // Auth0 could not be reached (offline, DNS, 5xx…): the refresh token may still be
        // valid, so keep the session. Reject without a `response`, like a network error:
        // `queryClient` ignores every 401, which would fail the user's action with no message.
        if (!isAxiosError(sessionFailure) && sessionFailure.action === "keep") {
          if (authState === true) {
            reportRefreshFailure(sessionFailure, "retry_401").catch(() => {});
          }
          return Promise.reject(
            new AxiosError(
              `Token refresh failed (${sessionFailure.reason}), session kept`,
              SESSION_KEPT_ERROR_CODE,
              originalRequest,
              error.request,
            ),
          );
        }

        // A voluntary logout also produces a burst of 401s: `useLogout` clears the cache and
        // credentials before the screens unmount, and their queries refetch without a token.
        // Only an *unexpected* loss of session deserves a toast and a Sentry record.
        if (authState === true) {
          reportSessionCleared(error, originalRequest, sessionFailure).catch(() => {});
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
      case 400:
      case 404:
      case 409:
      case 422:
        // Expected outcomes the caller handles (validation, missing item, conflicts such as the AI Coach's
        // ScheduleConflict). console.error here opened the red dev error overlay for a normal result.
        break;
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
