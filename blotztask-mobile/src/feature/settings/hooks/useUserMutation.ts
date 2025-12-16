import { useMutation } from "@tanstack/react-query";
import { UpdateUserProfileDTO } from "../modals/update-user-profile-dto";
import { updateUserProfile } from "@/shared/services/user-service";

export function useUserMutation() {
  const updateUserMutation = useMutation({
    mutationKey: ["updateUserProfile"],
    mutationFn: (userProfile: UpdateUserProfileDTO) => updateUserProfile(userProfile),
  });
  return {
    updateUserMutation,
    isUserUpdating: updateUserMutation.isPending,
    userUpdateError: updateUserMutation.error,
  };
}
