import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
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
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  },
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  const anyErr = error as any;
  return (
    anyErr?.response?.data?.message ||
    anyErr?.response?.data?.error ||
    anyErr?.message ||
    "Something went wrong"
  );
}
