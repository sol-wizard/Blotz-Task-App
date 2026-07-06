import { useQuery } from "@tanstack/react-query";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { fetchBadgeDetailById } from "../services/badge-service";

export const useBadgeDetailQuery = (badgeId: number | null) => {
  const queryKey =
    badgeId == null ? [...badgeKeys.all, "detail", "missing"] : badgeKeys.detail(badgeId);

  const badgeDetailQuery = useQuery({
    queryKey,
    queryFn: () => fetchBadgeDetailById(badgeId!),
    enabled: badgeId != null,
  });

  return {
    badgeDetail: badgeDetailQuery.data,
    isBadgeDetailLoading: badgeDetailQuery.isLoading,
    isBadgeDetailError: badgeDetailQuery.isError,
  };
};
