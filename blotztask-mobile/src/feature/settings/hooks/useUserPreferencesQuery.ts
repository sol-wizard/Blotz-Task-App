import { useQuery } from "@tanstack/react-query";
import { fetchUserPreferences } from "@/shared/services/user-service";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import { userKeys } from "@/shared/constants/query-key-factory";

export function useUserPreferencesQuery() {
  const userPreferencesQuery = useQuery<UserPreferencesDTO>({
    queryKey: userKeys.preferences(),
    queryFn: () => fetchUserPreferences(),
  });

  return {
    isUserPreferencesLoading: userPreferencesQuery.isLoading,
    userPreferences: userPreferencesQuery.data,
  };
}
