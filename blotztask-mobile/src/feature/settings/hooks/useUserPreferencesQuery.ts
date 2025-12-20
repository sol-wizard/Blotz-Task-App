import { useQuery } from "@tanstack/react-query";
import { fetchUserPreferences } from "@/shared/services/user-service";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";

export function useUserPreferencesQuery() {
  const userPreferencesQuery = useQuery<UserPreferencesDTO>({
    queryKey: ["userPreferences"],
    queryFn: () => fetchUserPreferences(),
  });

  return {
    isUserPreferencesLoading: userPreferencesQuery.isLoading,
    userPreferencesError: userPreferencesQuery.error,
    userPreferences: userPreferencesQuery.data,
  };
}
