import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import i18n from "@/i18n";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (
        isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        return;
      }
      if (query.meta?.silent) return;

      const msg = getErrorMessage(error);

      Toast.show({
        type: "error",
        text1: msg,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silent) return;

      const msg = getErrorMessage(error);

      Toast.show({
        type: "error",
        text1: msg,
      });
    },
    onSuccess: (data, variables) => {
      console.log("[Mutation Success]", data, variables);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1 * 60 * 1000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnMount: "always",
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      networkMode: "online",
      throwOnError: true,
    },
    mutations: {
      retry: 0,
      networkMode: "online",
      throwOnError: false,
    },
  },
});

function getErrorMessage(error: unknown): string {
  const fallback = i18n.t("errors.somethingWentWrong");

  if (isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
