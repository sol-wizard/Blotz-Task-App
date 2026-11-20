import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import * as Sentry from "@sentry/react-native";
import i18n from "@/i18n";
import { isSessionKeptError } from "@/shared/services/api/refresh-failure";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        return;
      }
      if (query.meta?.silent) return;

      if (__DEV__) console.error("[Query Error]", error);
      reportToSentry(error, "query");

      const msg = getErrorMessage(error);

      Toast.show({
        type: "error",
        text1: msg,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        return;
      }
      if (mutation.meta?.silent) return;

      if (__DEV__) console.error("[Mutation Error]", error);
      reportToSentry(error, "mutation");

      const msg = getErrorMessage(error, mutation.meta);

      Toast.show({
        type: "error",
        text1: msg,
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        // Each retry would force another token refresh against a server that just failed.
        if (isSessionKeptError(error)) return false;
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status && status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      networkMode: "online",
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  },
});

// A kept-session failure is already reported once as `token_refresh_failed`; reporting it
// again here would add one event per failed request.
function reportToSentry(error: unknown, source: "query" | "mutation") {
  if (isSessionKeptError(error)) return;
  Sentry.captureException(error, { tags: { source } });
}

function getErrorMessage(error: unknown, meta?: Record<string, unknown>): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (!error.response) return i18n.t("errors.network");
    if (status && status >= 500) return i18n.t("errors.server");
    const errorMap = meta?.errorMap as Record<number, string> | undefined;
    if (status && errorMap?.[status]) {
      return i18n.t(errorMap[status]);
    }
    if (status === 400 || status === 422) return i18n.t("errors.validation");
    return i18n.t("errors.default");
  }
  return i18n.t("errors.default");
}
