import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "is_user_onboarded_ai";
const QUERY_KEY = ["ai-onboarding-status", STORAGE_KEY] as const;

export function useAiOnboardingStatus() {
  const queryClient = useQueryClient();

  const { data: isUserOnboardedAi = false, isLoading } = useQuery({
    queryKey: QUERY_KEY,
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
      queryClient.setQueryData(QUERY_KEY, nextValue);
    },
  });

  return {
    isUserOnboardedAi,
    isLoading,
    setUserOnboardedAi,
  };
}
