import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onboardingKeys } from "@/shared/constants/query-key-factory";

const STORAGE_KEY = "is_starspark_onboarded";

export function useStarSparkOnboarding() {
  const queryClient = useQueryClient();

  const { data: isCompleted = false, isLoading } = useQuery({
    queryKey: ["starSparkOnboardingStatus"], // 建议在 query-key-factory 中统一定义
    queryFn: async () => {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      return value === "true";
    },
  });

  const setCompleted = useMutation({
    mutationFn: async (val: boolean) => {
      await AsyncStorage.setItem(STORAGE_KEY, val ? "true" : "false");
      return val;
    },
    onSuccess: (val) => {
      queryClient.setQueryData(["starSparkOnboardingStatus"], val);
    },
  });

  return { isCompleted, isLoading, setCompleted };
}
