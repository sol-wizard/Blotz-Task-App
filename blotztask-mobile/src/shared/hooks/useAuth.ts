import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";

/**
 * Authentication state hook that provides a single source of truth for auth status.
 * 
 * Uses React Query to cache the auth state and provide consistent loading states.
 * Other hooks can depend on this to conditionally enable their queries.
 * 
 * @example
 * // Basic usage
 * const { isAuthenticated, isLoading } = useAuth();
 * 
 * // In dependent hooks
 * const { isAuthenticated } = useAuth();
 * useQuery({
 *   queryKey: ['someData'],
 *   queryFn: fetchSomeData,
 *   enabled: isAuthenticated,
 * });
 */

const AUTH_QUERY_KEY = ["auth", "status"] as const;

async function checkAuthStatus(): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    return !!token;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
}

export const useAuth = () => {
  const queryClient = useQueryClient();

  const {
    data: isAuthenticated = false,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: checkAuthStatus,
    staleTime: Infinity, // Auth status doesn't go stale on its own
    gcTime: Infinity, // Keep in cache permanently
  });

  /**
   * Call this after login/logout to refresh auth state
   */
  const refreshAuthState = () => {
    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
  };

  /**
   * Call this after logout to clear auth state immediately
   */
  const clearAuthState = () => {
    queryClient.setQueryData(AUTH_QUERY_KEY, false);
  };

  return {
    isAuthenticated,
    isAuthLoading: isLoading,
    isAuthChecking: isFetching,
    refreshAuthState,
    clearAuthState,
  };
};

export { AUTH_QUERY_KEY };
