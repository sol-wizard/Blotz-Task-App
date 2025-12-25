import { useMutation } from "@tanstack/react-query";
import { updateUserPreferences } from "@/shared/services/user-service";
import { UserPreferencesDTO } from "@/shared/models/user-preferences-dto";
import { queryClient } from "@/shared/util/queryClient";
import { taskKeys, userKeys } from "@/shared/util/query-key-factory";

export function useUserPreferencesMutation() {
  const mutation = useMutation({
    mutationKey: ["updateUserPreferences"],
    mutationFn: (preferences: UserPreferencesDTO) => updateUserPreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  return {
    updateUserPreferencesAsync: mutation.mutateAsync,
    isUpdatingUserPreferences: mutation.isPending,
    isUpdateUserPreferencesError: mutation.isError,
    updateUserPreferencesError: mutation.error,
  };
}
