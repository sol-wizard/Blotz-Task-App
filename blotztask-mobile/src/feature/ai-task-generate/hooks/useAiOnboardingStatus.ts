import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import AsyncStorage from "@react-native-async-storage/async-storage";
import { onboardingKeys } from "@/shared/constants/query-key-factory";
import { fetchUserProfile, updateUserProfile } from "@/shared/services/user-service";

export function useAiOnboardingStatus() {
  const queryClient = useQueryClient();
  const { data: isUserOnboardedAi = false, isLoading } = useQuery({
    queryKey: onboardingKeys.aiOnboardingStatus(),
    queryFn: async () => {
      const profile: any = await fetchUserProfile();
      return Boolean(profile?.isOnBoarded ?? false);
    },
  });

  const setUserOnboardedAi = useMutation({
    mutationFn: async (nextValue: boolean) => {
      await updateUserProfile({ isOnBoarded: nextValue } as any);
      return nextValue;
    },
    onSuccess: (nextValue) => {
      queryClient.setQueryData(onboardingKeys.aiOnboardingStatus(), nextValue);
    },
  });

  return {
    isUserOnboardedAi,
    isLoading,
    setUserOnboardedAi,
  };
}
