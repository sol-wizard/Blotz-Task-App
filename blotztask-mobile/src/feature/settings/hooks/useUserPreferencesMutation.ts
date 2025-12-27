import { useMutation } from "@tanstack/react-query";
import { updateUserPreferences } from "@/shared/services/user-service";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import { queryClient } from "@/shared/util/queryClient";
import { userKeys } from "@/shared/constants/query-key-factory";

export function useUserPreferencesMutation() {
  const mutation = useMutation({
    mutationKey: ["updateUserPreferences"],
    mutationFn: (preferences: UserPreferencesDTO) => updateUserPreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.preferences() });
    },
  });

  return {
    updateUserPreferencesAsync: mutation.mutateAsync,
    isUpdatingUserPreferences: mutation.isPending,
  };
}
