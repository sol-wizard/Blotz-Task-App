import { useMutation } from "@tanstack/react-query";
import { clearUserMemories } from "@/shared/services/user-memory-service";

export function useClearUserMemoriesMutation() {
  const mutation = useMutation({
    mutationFn: () => clearUserMemories(),
  });

  return {
    clearUserMemories: mutation.mutate,
    isClearingUserMemories: mutation.isPending,
  };
}
