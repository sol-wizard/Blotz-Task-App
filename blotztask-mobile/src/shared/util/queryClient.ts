import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { showErrorToast } from "@/shared/util/show-error-toast";
import * as Sentry from "@sentry/react-native";
import i18n from "@/i18n";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        return;
      }
      if (query.meta?.silent) return;

      if (__DEV__) console.error("[Query Error]", error);
      const sentryEventId = Sentry.captureException(error, { tags: { source: "query" } });

      showErrorToast(getErrorMessage(error), {
        sentryEventId,
        showFeedback: !isNoConnection(error),
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
      const sentryEventId = Sentry.captureException(error, { tags: { source: "mutation" } });

      showErrorToast(getErrorMessage(error, mutation.meta), {
        sentryEventId,
        showFeedback: !isNoConnection(error),
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
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

// No response at all: the phone is offline, so 「反馈」 is left out (it could not be sent either).
function isNoConnection(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
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
