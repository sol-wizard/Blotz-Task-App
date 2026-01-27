import { useQuery } from "@tanstack/react-query";
import { fetchUserPreferences } from "@/shared/services/user-service";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import { userKeys } from "@/shared/constants/query-key-factory";
import { useAuth } from "@/shared/hooks/useAuth";

export function useUserPreferencesQuery() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  const userPreferencesQuery = useQuery<UserPreferencesDTO>({
    queryKey: userKeys.preferences(),
    queryFn: () => fetchUserPreferences(),
    enabled: !isAuthLoading && isAuthenticated,
  });

  return {
    isUserPreferencesLoading: userPreferencesQuery.isLoading,
    userPreferences: userPreferencesQuery.data,
  };
}
