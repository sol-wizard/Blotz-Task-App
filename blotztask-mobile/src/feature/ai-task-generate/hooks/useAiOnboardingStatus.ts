import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onboardingKeys } from "@/shared/constants/query-key-factory";

const STORAGE_KEY = "is_user_onboarded_ai";

export function useAiOnboardingStatus() {
  const queryClient = useQueryClient();

  const { data: isUserOnboardedAi = false, isLoading } = useQuery({
    queryKey: onboardingKeys.aiOnboardingStatus(),
    queryFn: async () => {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      return value === "true";
    },
  });

  const setUserOnboardedAi = useMutation({
    mutationFn: async (nextValue: boolean) => {
      await AsyncStorage.setItem(STORAGE_KEY, nextValue ? "true" : "false");
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
