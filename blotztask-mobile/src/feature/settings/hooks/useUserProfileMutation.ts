import { useMutation } from "@tanstack/react-query";
import { UpdateUserProfileDTO } from "../modals/update-user-profile-dto";
import { updateUserProfile } from "@/shared/services/user-service";
import { queryClient } from "@/shared/util/queryClient";
import { userKeys } from "@/shared/util/query-key-factory";

export function useUserProfileMutation() {
  const updateUserProfileMutation = useMutation({
    mutationKey: ["updateUserProfile"],
    mutationFn: (userProfile: UpdateUserProfileDTO) => updateUserProfile(userProfile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });
  return {
    updateUserProfile: updateUserProfileMutation.mutateAsync,
    isUserUpdating: updateUserProfileMutation.isPending,
  };
}
