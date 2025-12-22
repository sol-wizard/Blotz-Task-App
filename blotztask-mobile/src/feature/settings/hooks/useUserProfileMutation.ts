import { useMutation } from "@tanstack/react-query";
import { UpdateUserProfileDTO } from "../modals/update-user-profile-dto";
import { updateUserProfile } from "@/shared/services/user-service";
import { queryClient } from "@/shared/util/queryClient";

export function useUserProfileMutation() {
  const updateUserProfileMutation = useMutation({
    mutationKey: ["updateUserProfile"],
    mutationFn: (userProfile: UpdateUserProfileDTO) => updateUserProfile(userProfile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
  return {
    updateUserProfile: updateUserProfileMutation.mutateAsync,
    isUserUpdating: updateUserProfileMutation.isPending,
  };
}
