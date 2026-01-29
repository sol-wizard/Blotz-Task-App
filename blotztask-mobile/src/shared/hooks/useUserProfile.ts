import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "../services/user-service";
import { userKeys } from "../constants/query-key-factory";
import { useAuth } from "./useAuth";

interface UseUserProfileOptions {
  /**
   * Override the default auth-based enabling.
   * If not provided, the query will automatically be enabled when user is authenticated.
   */
  enabled?: boolean;
}

export const useUserProfile = (options: UseUserProfileOptions = {}) => {
  const { isAuthenticated, isAuthLoading } = useAuth();

  // Default: only fetch when authenticated and auth check is complete
  // Can be overridden with explicit `enabled` option
  const shouldFetch = options.enabled ?? (!isAuthLoading && isAuthenticated);

  const {
    data: userProfile,
    isLoading: isUserProfileLoading,
    isFetching: isUserProfileFetching,
  } = useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => fetchUserProfile(),
    enabled: shouldFetch,
  });

  const isUserOnboarded = Boolean(userProfile?.isOnBoarded ?? false);

  return {
    userProfile,
    isUserOnboarded,
    isUserProfileLoading,
    isUserProfileFetching,
  };
};
