import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import AsyncStorage from "@react-native-async-storage/async-storage";
import { onboardingKeys, userKeys } from "@/shared/constants/query-key-factory";
import { fetchUserProfile, updateUserProfile } from "@/shared/services/user-service";

export function useUserOnboardingStatus() {
  const queryClient = useQueryClient();
  const { data: isUserOnboarded = false, isLoading } = useQuery({
    queryKey: onboardingKeys.OnboardingStatus(),
    queryFn: async () => {
      const profile: any = await fetchUserProfile();
      return Boolean(profile?.isOnBoarded ?? false);
    },
  });

  const setUserOnboarded = useMutation({
    mutationFn: async (nextValue: boolean) => {
      await updateUserProfile({ isOnBoarded: nextValue } as any);
      return nextValue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.OnboardingStatus() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
  });

  return {
    isUserOnboarded,
    isLoading,
    setUserOnboarded,
  };
}
