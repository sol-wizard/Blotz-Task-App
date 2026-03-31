import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateUserProfileDTO } from "../modals/update-user-profile-dto";
import { updateUserProfile } from "@/shared/services/user-service";
import { userKeys } from "@/shared/constants/query-key-factory";
import { UserProfileDTO } from "@/shared/models/user-profile-dto";

export function useUserProfileMutation() {
  const queryClient = useQueryClient();

  const updateUserProfileMutation = useMutation({
    mutationKey: ["updateUserProfile"],
    mutationFn: (userProfile: UpdateUserProfileDTO) => updateUserProfile(userProfile),
    onSuccess: (_res, patch) => {
      queryClient.setQueryData(userKeys.profile(), (prev: UserProfileDTO | undefined) =>
        prev ? { ...prev, ...patch } : prev,
      );
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });

  const setUserOnboarded = (nextValue: boolean) =>
    updateUserProfileMutation.mutateAsync({ isOnBoarded: nextValue });

  return {
    updateUserProfile: updateUserProfileMutation.mutateAsync,
    setUserOnboarded,
    isUserUpdating: updateUserProfileMutation.isPending,
  };
}
