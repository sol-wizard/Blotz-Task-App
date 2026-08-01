import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/util/queryClient";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { equipBadge, unequipBadge } from "../services/badge-service";

// Selecting a 4th badge evicts the oldest one and shifts the rest, so the server owns the slot
// rules and we refetch rather than reproduce them here — two copies would drift apart.
export function useBadgeEquipMutation() {
  const mutation = useMutation({
    mutationKey: ["toggleBadgeEquip"],
    mutationFn: ({ badgeId, isEquipped }: { badgeId: number; isEquipped: boolean }) =>
      isEquipped ? unequipBadge(badgeId) : equipBadge(badgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: badgeKeys.all });
    },
  });

  return {
    toggleBadgeEquip: mutation.mutate,
    isTogglingBadgeEquip: mutation.isPending,
    togglingBadgeId: mutation.variables?.badgeId,
  };
}
