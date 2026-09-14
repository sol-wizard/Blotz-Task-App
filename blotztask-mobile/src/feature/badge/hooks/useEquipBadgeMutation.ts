import { useMutation, useQueryClient } from "@tanstack/react-query";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { equipBadge } from "../services/badge-service";

export function useEquipBadgeMutation() {
  const queryClient = useQueryClient();

  const equipBadgeMutation = useMutation({
    mutationKey: ["equipBadge"],
    mutationFn: (badgeId: number) => equipBadge(badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.all });
    },
  });

  return {
    equipBadge: equipBadgeMutation.mutateAsync,
    isEquipping: equipBadgeMutation.isPending,
  };
}
